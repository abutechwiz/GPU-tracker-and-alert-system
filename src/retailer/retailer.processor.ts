import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import axios from 'axios';
import { AppConfig } from '../config/app-config';
import {
  HTML_PARSER_QUEUE,
  JOB_PARSE_HTML,
  JOB_POLL_ALL,
  JOB_POLL_RETAILER,
  RETAILER_QUEUE,
} from '../common/constants';
import { ParseHtmlJobData, PollRetailerJobData } from '../common/types';
import { TrackersService } from '../trackers/trackers.service';
import { RetailerService } from './retailer.service';

const MAX_HTML_BYTES = 5 * 1024 * 1024;

@Processor(RETAILER_QUEUE)
export class RetailerProcessor extends WorkerHost {
  private readonly logger = new Logger(RetailerProcessor.name);

  constructor(
    private readonly config: AppConfig,
    private readonly trackers: TrackersService,
    private readonly retailerService: RetailerService,
    @InjectQueue(HTML_PARSER_QUEUE) private readonly htmlParserQueue: Queue,
  ) {
    super();
  }

  async process(job: Job): Promise<unknown> {
    switch (job.name) {
      case JOB_POLL_ALL:
        return this.handlePollAll();
      case JOB_POLL_RETAILER:
        return this.handlePollRetailer(job as Job<PollRetailerJobData>);
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        return undefined;
    }
  }

  /** Fans out one poll job per (tracker, retailer) pair. */
  private async handlePollAll() {
    const trackers = this.trackers.getEnabledTrackers();
    const jobs = await this.retailerService.enqueueTrackers(trackers);
    this.logger.log(
      `Scheduled ${jobs.length} poll jobs for ${trackers.length} trackers`,
    );
    return { jobs: jobs.length };
  }

  /**
   * Fetches a single retailer page. Each retailer is its own job, so a failure
   * only retries that retailer (with exponential backoff) instead of re-polling
   * every retailer in the batch.
   */
  private async handlePollRetailer(job: Job<PollRetailerJobData>) {
    const { gpuModel, retailer } = job.data;
    this.logger.log(
      `Job ${job.id}: fetching ${gpuModel} from ${retailer.name} (${retailer.url})`,
    );

    const response = await axios.get<string>(retailer.url, {
      timeout: this.config.http.timeoutMs,
      responseType: 'text',
      maxContentLength: MAX_HTML_BYTES,
      headers: {
        'User-Agent': this.config.http.userAgent,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    const html = String(response.data ?? '');

    await this.htmlParserQueue.add(JOB_PARSE_HTML, {
      ...job.data,
      html,
      fetchedAt: new Date().toISOString(),
    } satisfies ParseHtmlJobData);

    return {
      retailer: retailer.name,
      status: response.status,
      length: html.length,
    };
  }
}

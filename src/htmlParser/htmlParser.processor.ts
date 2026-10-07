import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import {
  ALERT_QUEUE,
  HTML_PARSER_QUEUE,
  JOB_EVALUATE_SNAPSHOT,
  JOB_PARSE_HTML,
  RETRY_JOB_OPTIONS,
} from '../common/constants';
import { ParseHtmlJobData, ProductSnapshot } from '../common/types';
import { parseProductPage } from './product-parser';

@Processor(HTML_PARSER_QUEUE)
export class HtmlParserProcessor extends WorkerHost {
  private readonly logger = new Logger(HtmlParserProcessor.name);

  constructor(@InjectQueue(ALERT_QUEUE) private readonly alertQueue: Queue) {
    super();
  }

  async process(
    job: Job<ParseHtmlJobData>,
  ): Promise<ProductSnapshot | undefined> {
    if (job.name !== JOB_PARSE_HTML) {
      this.logger.warn(`Unknown job name: ${job.name}`);
      return undefined;
    }
    return this.handleParseHtml(job);
  }

  private async handleParseHtml(job: Job<ParseHtmlJobData>) {
    const { html, retailer, gpuModel, targetPrice, fetchedAt } = job.data;
    const parsed = parseProductPage(html ?? '', retailer.selectors);

    const snapshot: ProductSnapshot = {
      ...parsed,
      gpuModel,
      retailer: retailer.name,
      url: retailer.url,
      targetPrice,
      checkedAt: fetchedAt,
    };

    if (parsed.price === null && parsed.inStock === null) {
      this.logger.warn(
        `Could not extract price or availability for ${gpuModel} from ${retailer.name} (${retailer.url}); consider adding "selectors" for this retailer`,
      );
    } else {
      this.logger.log(
        `Parsed ${gpuModel} @ ${retailer.name}: inStock=${parsed.inStock} price=${parsed.price} ${parsed.currency ?? ''}`,
      );
    }

    await this.alertQueue.add(
      JOB_EVALUATE_SNAPSHOT,
      snapshot,
      RETRY_JOB_OPTIONS,
    );
    return snapshot;
  }
}

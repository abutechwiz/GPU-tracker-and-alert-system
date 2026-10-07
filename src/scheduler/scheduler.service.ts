import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Queue } from 'bullmq';
import { AppConfig } from '../config/app-config';
import {
  JOB_POLL_ALL,
  POLL_SCHEDULER_ID,
  RETAILER_QUEUE,
} from '../common/constants';

/**
 * Registers a BullMQ job scheduler that enqueues a poll_all job on POLL_CRON
 * (every 5 minutes by default). Because the schedule lives in Redis, running
 * several app instances does not cause duplicate polls.
 */
@Injectable()
export class SchedulerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly config: AppConfig,
    @InjectQueue(RETAILER_QUEUE) private readonly retailerQueue: Queue,
  ) {}

  async onApplicationBootstrap() {
    await this.retailerQueue.upsertJobScheduler(
      POLL_SCHEDULER_ID,
      { pattern: this.config.pollCron },
      { name: JOB_POLL_ALL, data: {} },
    );
    this.logger.log(`Polling trackers on schedule "${this.config.pollCron}"`);
  }
}

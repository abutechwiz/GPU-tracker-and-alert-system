import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  JOB_POLL_ALL,
  JOB_POLL_RETAILER,
  RETAILER_QUEUE,
  RETRY_JOB_OPTIONS,
} from '../common/constants';
import { PollRetailerJobData, Tracker } from '../common/types';

@Injectable()
export class RetailerService {
  constructor(
    @InjectQueue(RETAILER_QUEUE) private readonly retailerQueue: Queue,
  ) {}

  /** Enqueues one poll_retailer job per retailer of each tracker. */
  async enqueueTrackers(trackers: Tracker[]) {
    const jobs = trackers.flatMap((tracker) =>
      tracker.retailers.map((retailer) => ({
        name: JOB_POLL_RETAILER,
        data: {
          gpuModel: tracker.gpuModel,
          targetPrice: tracker.targetPrice,
          retailer,
        } satisfies PollRetailerJobData,
        opts: { ...RETRY_JOB_OPTIONS },
      })),
    );
    if (jobs.length === 0) return [];
    return this.retailerQueue.addBulk(jobs);
  }

  /** Triggers an immediate poll of every configured tracker. */
  enqueuePollAll() {
    return this.retailerQueue.add(JOB_POLL_ALL, {});
  }
}

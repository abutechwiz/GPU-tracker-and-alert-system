import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  JOB_SEND_NOTIFICATION,
  NOTIFICATION_QUEUE,
  NOTIFIERS,
} from '../common/constants';
import { SendNotificationJobData } from '../common/types';
import type { Notifier } from './notifiers/notifier';

/** Delivers one alert to one channel, so each channel retries independently. */
@Processor(NOTIFICATION_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(@Inject(NOTIFIERS) private readonly notifiers: Notifier[]) {
    super();
  }

  async process(job: Job<SendNotificationJobData>): Promise<void> {
    if (job.name !== JOB_SEND_NOTIFICATION) {
      this.logger.warn(`Unknown job name: ${job.name}`);
      return;
    }
    const { channel, alert } = job.data;
    const notifier = this.notifiers.find((n) => n.channel === channel);
    if (!notifier || !notifier.isEnabled()) {
      this.logger.warn(
        `Notification channel "${channel}" is not configured; dropping alert`,
      );
      return;
    }
    await notifier.send(alert);
  }
}

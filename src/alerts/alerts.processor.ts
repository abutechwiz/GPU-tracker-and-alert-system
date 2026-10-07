import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { AppConfig } from '../config/app-config';
import {
  ALERT_QUEUE,
  JOB_EVALUATE_SNAPSHOT,
  JOB_SEND_NOTIFICATION,
  NOTIFICATION_QUEUE,
  NOTIFIERS,
  STATE_STORE,
} from '../common/constants';
import {
  Alert,
  ProductSnapshot,
  SendNotificationJobData,
} from '../common/types';
import type { StateStore } from '../state/state.store';
import type { Notifier } from './notifiers/notifier';
import { evaluateSnapshot, mergeSnapshot } from './alert-evaluator';

@Processor(ALERT_QUEUE)
export class AlertsProcessor extends WorkerHost {
  private readonly logger = new Logger(AlertsProcessor.name);

  constructor(
    private readonly config: AppConfig,
    @Inject(STATE_STORE) private readonly store: StateStore,
    @Inject(NOTIFIERS) private readonly notifiers: Notifier[],
    @InjectQueue(NOTIFICATION_QUEUE) private readonly notificationQueue: Queue,
  ) {
    super();
  }

  async process(
    job: Job<ProductSnapshot>,
  ): Promise<{ alerts: Alert[] } | undefined> {
    if (job.name !== JOB_EVALUATE_SNAPSHOT) {
      this.logger.warn(`Unknown job name: ${job.name}`);
      return undefined;
    }
    return { alerts: await this.evaluate(job.data) };
  }

  async evaluate(snapshot: ProductSnapshot): Promise<Alert[]> {
    const previous = await this.store.getSnapshot(
      snapshot.retailer,
      snapshot.gpuModel,
    );
    const alerts = evaluateSnapshot(snapshot, previous, {
      priceDropThresholdPercent: this.config.priceDropThresholdPercent,
    });

    const channels = this.notifiers
      .filter((n) => n.isEnabled())
      .map((n) => n.channel);
    // Queue notifications before saving state: if this fails the job is
    // retried against the old state and the alerts are not lost.
    for (const alert of alerts) {
      await this.notificationQueue.addBulk(
        channels.map((channel) => ({
          name: JOB_SEND_NOTIFICATION,
          data: { channel, alert } satisfies SendNotificationJobData,
          opts: {
            attempts: 5,
            backoff: { type: 'exponential', delay: 5000 },
            jobId: [
              channel,
              alert.type,
              alert.retailer,
              alert.gpuModel,
              alert.createdAt,
            ]
              .join('|')
              .replace(/[:\s]+/g, '_'),
          },
        })),
      );
      await this.store.recordAlert(alert);
    }

    await this.store.saveSnapshot(mergeSnapshot(snapshot, previous));
    this.logger.log(
      `Evaluated ${snapshot.gpuModel} @ ${snapshot.retailer}: inStock=${snapshot.inStock} price=${snapshot.price} alerts=${alerts.length}`,
    );
    return alerts;
  }
}

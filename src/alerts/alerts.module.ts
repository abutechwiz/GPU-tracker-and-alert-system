import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AppConfig } from '../config/app-config';
import {
  ALERT_QUEUE,
  CLEANUP_JOB_OPTIONS,
  NOTIFICATION_QUEUE,
  NOTIFIERS,
} from '../common/constants';
import { AlertsProcessor } from './alerts.processor';
import { NotificationsProcessor } from './notifications.processor';
import { LogNotifier } from './notifiers/log.notifier';
import {
  DiscordNotifier,
  SlackNotifier,
  TelegramNotifier,
  WebhookNotifier,
} from './notifiers/http.notifiers';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: ALERT_QUEUE, defaultJobOptions: { ...CLEANUP_JOB_OPTIONS } },
      {
        name: NOTIFICATION_QUEUE,
        defaultJobOptions: { ...CLEANUP_JOB_OPTIONS },
      },
    ),
  ],
  providers: [
    {
      provide: NOTIFIERS,
      inject: [AppConfig],
      useFactory: (config: AppConfig) => [
        new LogNotifier(),
        new WebhookNotifier(config),
        new DiscordNotifier(config),
        new SlackNotifier(config),
        new TelegramNotifier(config),
      ],
    },
    AlertsProcessor,
    NotificationsProcessor,
  ],
  exports: [BullModule],
})
export class AlertsModule {}

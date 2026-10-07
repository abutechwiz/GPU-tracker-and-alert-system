import { Injectable } from '@nestjs/common';

function int(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function num(value: string | undefined, fallback: number): number {
  const parsed = Number.parseFloat(value ?? '');
  return Number.isFinite(parsed) ? parsed : fallback;
}

function str(value: string | undefined): string | undefined {
  return value && value.trim() !== '' ? value.trim() : undefined;
}

/** Application configuration, read once from environment variables. */
@Injectable()
export class AppConfig {
  readonly port: number;
  readonly redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  readonly pollCron: string;
  readonly trackersFile: string;
  readonly priceDropThresholdPercent: number;
  readonly http: { timeoutMs: number; userAgent: string };
  readonly notifications: {
    webhookUrl?: string;
    discordWebhookUrl?: string;
    slackWebhookUrl?: string;
    telegramBotToken?: string;
    telegramChatId?: string;
  };

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.port = int(env.PORT, 3000);
    this.redis = {
      host: env.REDIS_HOST ?? 'localhost',
      port: int(env.REDIS_PORT, 6379),
      password: str(env.REDIS_PASSWORD),
      db: int(env.REDIS_DB, 0),
    };
    this.pollCron = str(env.POLL_CRON) ?? '*/5 * * * *';
    this.trackersFile = str(env.TRACKERS_FILE) ?? 'config/trackers.json';
    this.priceDropThresholdPercent = num(env.PRICE_DROP_THRESHOLD_PERCENT, 1);
    this.http = {
      timeoutMs: int(env.HTTP_TIMEOUT_MS, 15000),
      userAgent:
        str(env.HTTP_USER_AGENT) ??
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    };
    this.notifications = {
      webhookUrl: str(env.ALERT_WEBHOOK_URL),
      discordWebhookUrl: str(env.DISCORD_WEBHOOK_URL),
      slackWebhookUrl: str(env.SLACK_WEBHOOK_URL),
      telegramBotToken: str(env.TELEGRAM_BOT_TOKEN),
      telegramChatId: str(env.TELEGRAM_CHAT_ID),
    };
  }
}

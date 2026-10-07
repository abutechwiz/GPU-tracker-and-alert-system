import axios from 'axios';
import { AppConfig } from '../../config/app-config';
import { Alert } from '../../common/types';
import { Notifier, alertText } from './notifier';

const TIMEOUT_MS = 10000;

/** POSTs the raw alert JSON to any HTTP endpoint (ALERT_WEBHOOK_URL). */
export class WebhookNotifier implements Notifier {
  readonly channel = 'webhook';
  constructor(private readonly config: AppConfig) {}

  isEnabled() {
    return !!this.config.notifications.webhookUrl;
  }

  async send(alert: Alert) {
    await axios.post(this.config.notifications.webhookUrl!, alert, {
      timeout: TIMEOUT_MS,
    });
  }
}

export class DiscordNotifier implements Notifier {
  readonly channel = 'discord';
  constructor(private readonly config: AppConfig) {}

  isEnabled() {
    return !!this.config.notifications.discordWebhookUrl;
  }

  async send(alert: Alert) {
    await axios.post(
      this.config.notifications.discordWebhookUrl!,
      { content: alertText(alert) },
      { timeout: TIMEOUT_MS },
    );
  }
}

export class SlackNotifier implements Notifier {
  readonly channel = 'slack';
  constructor(private readonly config: AppConfig) {}

  isEnabled() {
    return !!this.config.notifications.slackWebhookUrl;
  }

  async send(alert: Alert) {
    await axios.post(
      this.config.notifications.slackWebhookUrl!,
      { text: alertText(alert) },
      { timeout: TIMEOUT_MS },
    );
  }
}

export class TelegramNotifier implements Notifier {
  readonly channel = 'telegram';
  constructor(private readonly config: AppConfig) {}

  isEnabled() {
    const { telegramBotToken, telegramChatId } = this.config.notifications;
    return !!telegramBotToken && !!telegramChatId;
  }

  async send(alert: Alert) {
    const { telegramBotToken, telegramChatId } = this.config.notifications;
    await axios.post(
      `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
      {
        chat_id: telegramChatId,
        text: alertText(alert),
        disable_web_page_preview: false,
      },
      { timeout: TIMEOUT_MS },
    );
  }
}

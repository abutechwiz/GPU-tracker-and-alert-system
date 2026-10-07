import axios from 'axios';
import { AppConfig } from '../../config/app-config';
import { Alert } from '../../common/types';
import {
  DiscordNotifier,
  SlackNotifier,
  TelegramNotifier,
  WebhookNotifier,
} from './http.notifiers';

jest.mock('axios');
const post = axios.post as jest.Mock;

const alert: Alert = {
  type: 'BACK_IN_STOCK',
  message: 'RTX 4090 @ Shop is in stock for USD 1,500',
  gpuModel: 'RTX 4090',
  retailer: 'Shop',
  url: 'https://shop.example/4090',
  price: 1500,
  previousPrice: null,
  currency: 'USD',
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('HTTP notifiers', () => {
  beforeEach(() => post.mockReset().mockResolvedValue({ status: 200 }));

  it('are disabled without configuration', () => {
    const config = new AppConfig({});
    expect(new WebhookNotifier(config).isEnabled()).toBe(false);
    expect(new DiscordNotifier(config).isEnabled()).toBe(false);
    expect(new SlackNotifier(config).isEnabled()).toBe(false);
    expect(
      new TelegramNotifier(
        new AppConfig({ TELEGRAM_BOT_TOKEN: 't' }),
      ).isEnabled(),
    ).toBe(false);
  });

  it('webhook posts the alert JSON', async () => {
    const n = new WebhookNotifier(
      new AppConfig({ ALERT_WEBHOOK_URL: 'https://hook' }),
    );
    expect(n.isEnabled()).toBe(true);
    await n.send(alert);
    expect(post).toHaveBeenCalledWith(
      'https://hook',
      alert,
      expect.any(Object),
    );
  });

  it('discord and slack post formatted text', async () => {
    const config = new AppConfig({
      DISCORD_WEBHOOK_URL: 'https://d',
      SLACK_WEBHOOK_URL: 'https://s',
    });
    await new DiscordNotifier(config).send(alert);
    await new SlackNotifier(config).send(alert);
    const text =
      '[BACK IN STOCK] RTX 4090 @ Shop is in stock for USD 1,500\nhttps://shop.example/4090';
    expect(post).toHaveBeenCalledWith(
      'https://d',
      { content: text },
      expect.any(Object),
    );
    expect(post).toHaveBeenCalledWith(
      'https://s',
      { text },
      expect.any(Object),
    );
  });

  it('telegram calls sendMessage', async () => {
    const n = new TelegramNotifier(
      new AppConfig({ TELEGRAM_BOT_TOKEN: 'abc', TELEGRAM_CHAT_ID: '42' }),
    );
    expect(n.isEnabled()).toBe(true);
    await n.send(alert);
    expect(post).toHaveBeenCalledWith(
      'https://api.telegram.org/botabc/sendMessage',
      expect.objectContaining({ chat_id: '42' }),
      expect.any(Object),
    );
  });
});

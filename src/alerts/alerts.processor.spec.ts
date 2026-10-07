import { Job, Queue } from 'bullmq';
import { AppConfig } from '../config/app-config';
import { Alert, ProductSnapshot } from '../common/types';
import { InMemoryStateStore } from '../state/state.store';
import { AlertsProcessor } from './alerts.processor';
import { NotificationsProcessor } from './notifications.processor';
import { Notifier } from './notifiers/notifier';

function notifier(channel: string, enabled = true): jest.Mocked<Notifier> {
  return {
    channel,
    isEnabled: jest.fn(() => enabled),
    send: jest.fn<Promise<void>, [Alert]>(() => Promise.resolve()),
  };
}

const snapshot: ProductSnapshot = {
  gpuModel: 'RTX 4090',
  retailer: 'Shop',
  url: 'https://shop.example/4090',
  title: 'RTX 4090',
  price: 1500,
  currency: 'USD',
  inStock: true,
  checkedAt: '2026-01-01T00:00:00.000Z',
};

describe('AlertsProcessor', () => {
  let store: InMemoryStateStore;
  let queue: { addBulk: jest.Mock };
  let processor: AlertsProcessor;
  const notifiers = [
    notifier('log'),
    notifier('discord'),
    notifier('slack', false),
  ];

  beforeEach(() => {
    store = new InMemoryStateStore();
    queue = { addBulk: jest.fn(() => Promise.resolve([])) };
    processor = new AlertsProcessor(
      new AppConfig({}),
      store,
      notifiers,
      queue as unknown as Queue,
    );
  });

  it('queues a notification per enabled channel and stores state', async () => {
    const result = await processor.process({
      name: 'evaluate_snapshot',
      data: snapshot,
    } as Job);

    expect(result?.alerts).toHaveLength(1);
    expect(queue.addBulk).toHaveBeenCalledTimes(1);
    const jobs = queue.addBulk.mock.calls[0][0] as {
      data: { channel: string };
      opts: { jobId: string };
    }[];
    expect(jobs.map((j) => j.data.channel)).toEqual(['log', 'discord']);
    expect(jobs[0].opts.jobId).not.toContain(':');
    expect(await store.getSnapshot('Shop', 'RTX 4090')).toEqual(snapshot);
    expect(await store.listAlerts(10)).toHaveLength(1);
  });

  it('does not re-alert on the next identical snapshot', async () => {
    await processor.evaluate(snapshot);
    queue.addBulk.mockClear();
    expect(
      await processor.evaluate({ ...snapshot, checkedAt: 'later' }),
    ).toEqual([]);
    expect(queue.addBulk).not.toHaveBeenCalled();
  });

  it('does not save state when queueing notifications fails', async () => {
    queue.addBulk.mockRejectedValueOnce(new Error('redis down'));
    await expect(processor.evaluate(snapshot)).rejects.toThrow('redis down');
    expect(await store.getSnapshot('Shop', 'RTX 4090')).toBeUndefined();
  });
});

describe('NotificationsProcessor', () => {
  it('sends the alert through the matching channel', async () => {
    const discord = notifier('discord');
    const processor = new NotificationsProcessor([notifier('log'), discord]);
    const alert = { type: 'BACK_IN_STOCK', message: 'hi' };
    await processor.process({
      name: 'send_notification',
      data: { channel: 'discord', alert },
    } as Job);
    expect(discord.send).toHaveBeenCalledWith(alert);
  });

  it('propagates send errors so BullMQ retries', async () => {
    const failing = notifier('webhook');
    failing.send.mockRejectedValueOnce(new Error('500'));
    const processor = new NotificationsProcessor([failing]);
    await expect(
      processor.process({
        name: 'send_notification',
        data: { channel: 'webhook', alert: {} },
      } as Job),
    ).rejects.toThrow('500');
  });
});

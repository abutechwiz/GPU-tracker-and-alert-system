import axios from 'axios';
import { Job, Queue } from 'bullmq';
import { AppConfig } from '../config/app-config';
import { TrackersService } from '../trackers/trackers.service';
import { RetailerProcessor } from './retailer.processor';
import { RetailerService } from './retailer.service';

jest.mock('axios');
const get = axios.get as jest.Mock;

describe('RetailerService', () => {
  it('fans out one job per retailer', async () => {
    const queue = {
      addBulk: jest.fn((jobs: unknown[]) => Promise.resolve(jobs)),
      add: jest.fn(),
    };
    const service = new RetailerService(queue as unknown as Queue);
    const jobs = await service.enqueueTrackers([
      {
        gpuModel: 'RTX 4090',
        targetPrice: 1500,
        retailers: [
          { name: 'A', url: 'https://a' },
          { name: 'B', url: 'https://b' },
        ],
      },
    ]);
    expect(jobs).toHaveLength(2);
    expect(queue.addBulk.mock.calls[0][0][1]).toMatchObject({
      name: 'poll_retailer',
      data: {
        gpuModel: 'RTX 4090',
        targetPrice: 1500,
        retailer: { name: 'B' },
      },
      opts: { attempts: 3 },
    });
    await expect(service.enqueueTrackers([])).resolves.toEqual([]);
  });
});

describe('RetailerProcessor', () => {
  const parserQueue = { add: jest.fn() };
  const trackers = { getEnabledTrackers: jest.fn() };
  const retailerService = { enqueueTrackers: jest.fn() };
  const processor = new RetailerProcessor(
    new AppConfig({}),
    trackers as unknown as TrackersService,
    retailerService as unknown as RetailerService,
    parserQueue as unknown as Queue,
  );

  beforeEach(() => jest.clearAllMocks());

  it('fetches a page and queues it for parsing', async () => {
    get.mockResolvedValue({ status: 200, data: '<html>ok</html>' });
    const data = {
      gpuModel: 'RTX 4090',
      retailer: { name: 'A', url: 'https://a' },
    };
    const result = await processor.process({
      id: '1',
      name: 'poll_retailer',
      data,
    } as Job);

    expect(result).toEqual({ retailer: 'A', status: 200, length: 15 });
    expect(get).toHaveBeenCalledWith(
      'https://a',
      expect.objectContaining({ timeout: 15000 }),
    );
    expect(parserQueue.add).toHaveBeenCalledWith(
      'parse_html',
      expect.objectContaining({
        ...data,
        html: '<html>ok</html>',
        fetchedAt: expect.any(String),
      }),
    );
  });

  it('throws on fetch errors so BullMQ retries the retailer', async () => {
    get.mockRejectedValue(new Error('ECONNRESET'));
    await expect(
      processor.process({
        name: 'poll_retailer',
        data: { gpuModel: 'x', retailer: { name: 'A', url: 'https://a' } },
      } as Job),
    ).rejects.toThrow('ECONNRESET');
    expect(parserQueue.add).not.toHaveBeenCalled();
  });

  it('poll_all enqueues every enabled tracker', async () => {
    const list = [{ gpuModel: 'x', retailers: [] }];
    trackers.getEnabledTrackers.mockReturnValue(list);
    retailerService.enqueueTrackers.mockResolvedValue([{}, {}]);
    await expect(
      processor.process({ name: 'poll_all', data: {} } as Job),
    ).resolves.toEqual({ jobs: 2 });
    expect(retailerService.enqueueTrackers).toHaveBeenCalledWith(list);
  });
});

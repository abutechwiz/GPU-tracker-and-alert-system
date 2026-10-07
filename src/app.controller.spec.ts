import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppConfig } from './config/app-config';
import { STATE_STORE } from './common/constants';
import { InMemoryStateStore } from './state/state.store';
import { RetailerService } from './retailer/retailer.service';
import { TrackersService } from './trackers/trackers.service';

describe('AppController', () => {
  let controller: AppController;
  const retailerService = {
    enqueueTrackers: jest.fn(() => Promise.resolve([{ id: '1' }, { id: '2' }])),
    enqueuePollAll: jest.fn(() => Promise.resolve({ id: '9' })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppConfig,
          useValue: new AppConfig({
            TRACKERS_FILE: 'config/trackers.example.json',
          }),
        },
        TrackersService,
        { provide: RetailerService, useValue: retailerService },
        { provide: STATE_STORE, useValue: new InMemoryStateStore() },
      ],
    }).compile();
    controller = module.get(AppController);
  });

  it('reports health', () => {
    expect(controller.health()).toEqual({ status: 'ok' });
  });

  it('lists trackers from the configured file', () => {
    expect(controller.getTrackers().length).toBeGreaterThan(0);
  });

  it('queues an ad-hoc poll', async () => {
    const result = await controller.pollRetailer({
      gpuModel: 'RTX 4090',
      retailers: [
        { name: 'A', url: 'https://a.example' },
        { name: 'B', url: 'https://b.example' },
      ],
    });
    expect(result).toEqual({
      message: 'Jobs added',
      jobIds: ['1', '2'],
      gpuModel: 'RTX 4090',
      retailerCount: 2,
    });
  });

  it('rejects an invalid poll request', async () => {
    await expect(
      controller.pollRetailer({ gpuModel: 'RTX 4090' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('triggers a poll of all trackers', async () => {
    await expect(controller.pollAll()).resolves.toEqual({
      message: 'Job added',
      jobId: '9',
    });
  });

  it('returns snapshots and alerts', async () => {
    await expect(controller.getSnapshots()).resolves.toEqual([]);
    await expect(controller.getAlerts(10)).resolves.toEqual([]);
  });
});

import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  Inject,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { STATE_STORE } from './common/constants';
import { Tracker } from './common/types';
import type { StateStore } from './state/state.store';
import { RetailerService } from './retailer/retailer.service';
import {
  InvalidTrackerError,
  TrackersService,
  validateTracker,
} from './trackers/trackers.service';

@Controller()
export class AppController {
  constructor(
    private readonly retailerService: RetailerService,
    private readonly trackers: TrackersService,
    @Inject(STATE_STORE) private readonly store: StateStore,
  ) {}

  @Get()
  getInfo() {
    return {
      name: 'GPU Tracker and Alert System',
      endpoints: [
        'GET /health',
        'GET /trackers',
        'GET /snapshots',
        'GET /alerts',
        'POST /poll',
        'POST /poll/all',
      ],
    };
  }

  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @Get('trackers')
  getTrackers() {
    try {
      return this.trackers.getTrackers();
    } catch (error) {
      throw new BadRequestException(
        `Invalid trackers file: ${(error as Error).message}`,
      );
    }
  }

  /** Latest known price/availability for every tracked product. */
  @Get('snapshots')
  getSnapshots() {
    return this.store.listSnapshots();
  }

  @Get('alerts')
  getAlerts(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.store.listAlerts(Math.min(Math.max(limit, 1), 500));
  }

  /** Ad-hoc poll: { gpuModel, targetPrice?, retailers: [{ name, url, selectors? }] } */
  @Post('poll')
  @HttpCode(202)
  async pollRetailer(@Body() body: unknown) {
    let tracker: Tracker;
    try {
      tracker = validateTracker(body, 'body');
    } catch (error) {
      if (error instanceof InvalidTrackerError)
        throw new BadRequestException(error.message);
      throw error;
    }
    const jobs = await this.retailerService.enqueueTrackers([tracker]);
    return {
      message: 'Jobs added',
      jobIds: jobs.map((j) => j.id),
      gpuModel: tracker.gpuModel,
      retailerCount: tracker.retailers.length,
    };
  }

  /** Poll every configured tracker right now instead of waiting for the schedule. */
  @Post('poll/all')
  @HttpCode(202)
  async pollAll() {
    const job = await this.retailerService.enqueuePollAll();
    return { message: 'Job added', jobId: job.id };
  }
}

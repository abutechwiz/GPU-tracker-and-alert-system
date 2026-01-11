import { Controller, Get, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectQueue('retailer-queue') private retailerQueue: Queue,
  ) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('poll')
  async pollRetailer(
    @Body('gpuModel') gpuModel: string,
    @Body('retailers') retailers: { name: string; url: string }[],
  ) {
    if (!gpuModel || !retailers || retailers.length === 0) {
      return { message: 'gpuModel and retailers list are required' };
    }

    const job = await this.retailerQueue.add(
      'poll_retailer',
      { gpuModel, retailers },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );
    return {
      message: 'Job added',
      jobId: job.id,
      gpuModel,
      retailerCount: retailers.length,
    };
  }
}

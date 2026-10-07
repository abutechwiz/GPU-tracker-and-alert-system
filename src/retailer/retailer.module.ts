import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import {
  CLEANUP_JOB_OPTIONS,
  RETAILER_QUEUE,
  RETRY_JOB_OPTIONS,
} from '../common/constants';
import { HtmlParserModule } from '../htmlParser/htmlParser.module';
import { TrackersModule } from '../trackers/trackers.module';
import { RetailerProcessor } from './retailer.processor';
import { RetailerService } from './retailer.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: RETAILER_QUEUE,
      defaultJobOptions: { ...RETRY_JOB_OPTIONS, ...CLEANUP_JOB_OPTIONS },
    }),
    HtmlParserModule,
    TrackersModule,
  ],
  providers: [RetailerProcessor, RetailerService],
  exports: [BullModule, RetailerService],
})
export class RetailerModule {}

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { HTML_PARSER_QUEUE } from '../common/constants';
import { AlertsModule } from '../alerts/alerts.module';
import { HtmlParserProcessor } from './htmlParser.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: HTML_PARSER_QUEUE,
      // Raw HTML is large, so keep very few finished parse jobs around.
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: { count: 50 },
      },
    }),
    AlertsModule,
  ],
  providers: [HtmlParserProcessor],
  exports: [BullModule],
})
export class HtmlParserModule {}

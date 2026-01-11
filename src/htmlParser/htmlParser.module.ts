import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { HtmlParserProcessor } from './htmlParser.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'html-parser-queue',
    }),
  ],
  providers: [HtmlParserProcessor],
  exports: [BullModule],
})
export class HtmlParserModule {}

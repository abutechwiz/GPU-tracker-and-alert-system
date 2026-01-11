import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RetailerModule } from './retailer/retailer.module';
import { HtmlParserModule } from './htmlParser/htmlParser.module';

import { SchedulerService } from './scheduler/scheduler.service';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6379,
      },
    }),
    ScheduleModule.forRoot(),
    RetailerModule,
    HtmlParserModule,
  ],
  controllers: [AppController],
  providers: [AppService, SchedulerService],
})
export class AppModule { }

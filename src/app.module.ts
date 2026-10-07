import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppConfig } from './config/app-config';
import { ConfigModule } from './config/config.module';
import { StateModule } from './state/state.module';
import { TrackersModule } from './trackers/trackers.module';
import { RetailerModule } from './retailer/retailer.module';
import { SchedulerService } from './scheduler/scheduler.service';

@Module({
  imports: [
    ConfigModule,
    BullModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({ connection: config.redis }),
    }),
    StateModule,
    TrackersModule,
    RetailerModule,
  ],
  controllers: [AppController],
  providers: [SchedulerService],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { TrackersService } from './trackers.service';

@Module({
  providers: [TrackersService],
  exports: [TrackersService],
})
export class TrackersModule {}

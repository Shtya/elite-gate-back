import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimelineService } from './timeline.service';
import { TimelineController } from './timeline.controller';
import { CustomerTimelineEvent, User, Appointment } from 'entities/global.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerTimelineEvent, User, Appointment])],
  controllers: [TimelineController],
  providers: [TimelineService],
  exports: [TimelineService],
})
export class TimelineModule {}
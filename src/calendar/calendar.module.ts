import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';
import { CalendarAccount, AppointmentCalendarSync, User, Appointment } from 'entities/global.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CalendarAccount, AppointmentCalendarSync, User, Appointment])],
  controllers: [CalendarController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
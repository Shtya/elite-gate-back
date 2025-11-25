import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { ReportSnapshot, Appointment, AgentPayment, User, Conversion, VisitorTracking, Property } from 'entities/global.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ReportSnapshot, Appointment, AgentPayment, User, Conversion, VisitorTracking,Property])],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
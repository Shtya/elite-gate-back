import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';

import { Agent, AgentAppointmentRequest, AgentBalance, AgentPayment, Appointment, Area, City, CustomerReview, User, WalletTransaction, WorkingDay, WorkingTime } from '../../entities/global.entity';
import { NotificationsModule } from '../notifications/notifications.module';

import { ReviewsModule } from '../reviews/reviews.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Agent, User, Appointment, AgentPayment, CustomerReview, AgentBalance,Area,City,AgentAppointmentRequest,WalletTransaction,WorkingDay,WorkingTime]),
    NotificationsModule,
    ReviewsModule,
  ],  controllers: [AgentsController],
  providers: [AgentsService],
  exports: [AgentsService],
})
export class AgentsModule {}
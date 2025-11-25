import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentAvailabilityService } from './agent-availability.service';
import { AgentAvailabilityController } from './agent-availability.controller';
import { AgentAvailability, AgentPreferredProperty, User, Property } from 'entities/global.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AgentAvailability, AgentPreferredProperty, User, Property])],
  controllers: [AgentAvailabilityController],
  providers: [AgentAvailabilityService],
  exports: [AgentAvailabilityService],
})
export class AgentAvailabilityModule {}
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrafficService } from './traffic.service';
import { TrafficController } from './traffic.controller';
import { User,  Campaign , ReferralPartner , VisitorTracking , Conversion , } from 'entities/global.entity'; 

@Module({
  imports: [TypeOrmModule.forFeature([Campaign, ReferralPartner, VisitorTracking, Conversion, User])],
  controllers: [TrafficController],
  providers: [TrafficService],
  exports: [TrafficService],
})
export class TrafficModule {}

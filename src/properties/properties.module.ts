import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PropertiesService } from './properties.service';
import { PropertiesController } from './properties.controller';

import { Property, PropertyMedia, PropertyType, City, Area } from '../../entities/global.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([Property, PropertyMedia, PropertyType, City, Area]) , NotificationsModule],
  controllers: [PropertiesController],
  providers: [PropertiesService],
  exports: [PropertiesService],
})
export class PropertiesModule {}
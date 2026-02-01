import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { Notification, User } from 'entities/global.entity';
import { MailService } from '../../common/nodemailer'; // Adjust path if needed

@Module({
  imports: [TypeOrmModule.forFeature([Notification, User]) ],
  controllers: [NotificationsController],
  providers: [NotificationsService, MailService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Notification, NotificationChannel, NotificationStatus, NotificationType, User } from '../../entities/global.entity';
import { CreateNotificationDto, UpdateNotificationDto, NotificationQueryDto, SendNotificationDto } from '../../dto/notifications.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    public readonly notificationsRepository: Repository<Notification>, // 👈 expose
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createNotificationDto: CreateNotificationDto): Promise<Notification> {
    const user = await this.usersRepository.findOne({
      where: { id: createNotificationDto.userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const notification = this.notificationsRepository.create({
      ...createNotificationDto,
      user,
    });

    return this.notificationsRepository.save(notification);
  }

  async findAll(query: NotificationQueryDto): Promise<{ data: Notification[]; total: number }> {
    const { userId, type, status, channel, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (userId) where.user = { id: userId };
    if (type) where.type = type;
    if (status) where.status = status;
    if (channel) where.channel = channel;

    const [data, total] = await this.notificationsRepository.findAndCount({
      where,
      relations: ['user'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total };
  }

  async findByUser(userId: number, query: NotificationQueryDto): Promise<{ data: Notification[]; total: number }> {
    const { type, status, channel, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = { user: { id: userId } };
    if (type) where.type = type;
    if (status) where.status = status;
    if (channel) where.channel = channel;

    const [data, total] = await this.notificationsRepository.findAndCount({
      where,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total };
  }

  async findOne(id: number): Promise<Notification> {
    const notification = await this.notificationsRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async update(id: number, updateNotificationDto: UpdateNotificationDto): Promise<Notification> {
    const notification = await this.findOne(id);
    Object.assign(notification, updateNotificationDto);
    return this.notificationsRepository.save(notification);
  }

  async remove(id: number): Promise<void> {
    const notification = await this.findOne(id);
    await this.notificationsRepository.remove(notification);
  }

  async sendImmediate(sendNotificationDto: SendNotificationDto): Promise<Notification> {
    const user = await this.usersRepository.findOne({
      where: { id: sendNotificationDto.userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const notification = this.notificationsRepository.create({
      ...sendNotificationDto,
      user,
      status: NotificationStatus.PENDING,
      sentAt: new Date(),
    });

    // Here you would integrate with actual notification services (WhatsApp, Email, SMS)
    await this.sendToExternalService(notification);

    notification.status = NotificationStatus.DELIVERED;
    return this.notificationsRepository.save(notification);
  }

  async markAsRead(id: number): Promise<Notification> {
    const notification = await this.findOne(id);
    // In a real app, you might have a 'read' field
    return notification;
  }

  async markAllAsRead(userId: number): Promise<{ message: string }> {
    // Implementation for marking all notifications as read
    return { message: 'All notifications marked as read' };
  }

  private async sendToExternalService(notification: Notification): Promise<void> {
    // Integration with WhatsApp, Email, SMS services would go here
    console.log(`Sending notification via ${notification.channel}:`, {
      to: notification.user.phoneNumber,
      title: notification.title,
      message: notification.message,
    });
  }

  async sendAppointmentReminder(appointmentId: number): Promise<void> {
    // Specific method for appointment reminders
    // This would fetch appointment details and send appropriate notifications
  }

  async sendRatingRequest(appointmentId: number): Promise<void> {
    // Specific method for rating requests after appointments
  }

  async createNotification(data: { userId: number; type: NotificationType; title: string; message: string; relatedId?: number; channel?: NotificationChannel; scheduledFor?: Date }): Promise<Notification> {
    const user = await this.usersRepository.findOne({ where: { id: data.userId } });

    const notification = this.notificationsRepository.create({
      user,
      type: data.type,
      title: data.title,
      message: data.message,
      relatedId: data.relatedId,
      channel: data.channel || NotificationChannel.IN_APP,
      status: NotificationStatus.PENDING,
      scheduledFor: data.scheduledFor,
    });

    return this.notificationsRepository.save(notification);
  }

  // إشعارات للمستخدمين المتعددين
  async createBulkNotifications(
    userIds: number[],
    data: {
      type: NotificationType;
      title: string;
      message: string;
      relatedId?: number;
      channel?: NotificationChannel;
    },
  ): Promise<void> {
    const notifications = await Promise.all(
      userIds.map(async userId => {
        const user = await this.usersRepository.findOne({ where: { id: userId } });
        return this.notificationsRepository.create({
          user,
          ...data,
          status: NotificationStatus.PENDING,
        });
      }),
    );

    await this.notificationsRepository.save(notifications);
  }

  // إشعارات حسب نوع المستخدم
  async notifyUserType(
    userType: any,
    data: {
      type: NotificationType;
      title: string;
      message: string;
      relatedId?: number;
      channel?: NotificationChannel;
    },
  ): Promise<void> {
    const users = await this.usersRepository.find({ where: { userType } });
    const userIds = users.map(user => user.id);

    await this.createBulkNotifications(userIds, data);
  }
}

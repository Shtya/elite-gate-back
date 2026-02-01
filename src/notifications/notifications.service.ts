import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Notification, NotificationChannel, NotificationStatus, NotificationType, User } from '../../entities/global.entity';
import { CreateNotificationDto, UpdateNotificationDto, NotificationQueryDto, SendNotificationDto } from '../../dto/notifications.dto';

import { MailService } from '../../common/nodemailer'; // Adjust path if needed

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    public readonly notificationsRepository: Repository<Notification>, // 👈 expose
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private mailService: MailService,
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
    const notifications = userIds.map(userId => {
      // Create user dummy object with ID to avoid fetching
      const user = { id: userId } as User;
      return this.notificationsRepository.create({
        user,
        ...data,
        status: NotificationStatus.PENDING,
      });
    });

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

  // --- Email Logic ---

  private generateAppointmentTemplate(title: string, content: string): string {
    return `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f6f8;
            margin: 0;
            padding: 0;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #1e328b, #0d1b54);
            color: #ffffff;
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 700;
          }
          .content {
            padding: 40px 30px;
            text-align: right;
          }
          .info-card {
            background: #f8f9fa;
            border-right: 4px solid #1e328b;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
          }
          .info-row {
            margin-bottom: 10px;
            display: flex;
            justify-content: flex-start;
          }
          .label {
            font-weight: bold;
            color: #1e328b;
            margin-left: 10px;
            min-width: 120px;
          }
          .footer {
            background: #f1f3f5;
            padding: 20px;
            text-align: center;
            font-size: 14px;
            color: #6c757d;
            border-top: 1px solid #e9ecef;
          }
          .footer p {
            margin: 5px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Elite Gate</h1>
            <p>${title}</p>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p>جميع الحقوق محفوظة © ${new Date().getFullYear()} Elite Gate</p>
            <p>هذه رسالة آلية، يرجى عدم الرد عليها.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendAppointmentConfirmationEmailToCustomer(customer: User, appointment: any, agent: User) {
    if (!customer.email) return;

    const title = 'تأكيد حجز الموعد';
    const content = `
      <p style="font-size: 18px; margin-bottom: 20px;">عزيزي العميل <strong>${customer.fullName}</strong>،</p>
      <p style="font-size: 16px; margin-bottom: 10px;">ياهلا ومسهلا 👋</p>
      <p>تم تأكيد حجز موعدك لزيارة ومعاينة العقار.</p>
      <p>ننتظر لقاك بالوقت المحدد، وسنرافقك في التعرف على المرافق والضمانات وكل التفاصيل اللي تهمك في بيتك المستقبلي، ونستعرض كل البيانات اللي ترغب بمعرفتها.</p>
      <p>وكلنا آذان صاغية لسماع احتياجك، ونتمنى أن يلبي العقار توقعاتك.</p>
      
      <div class="info-card">
        <div class="info-row"><span class="label">إسم الوسيط:</span> <span>${agent.fullName}</span></div>
        <div class="info-row"><span class="label">رقم التواصل:</span> <span dir="ltr">${agent.phoneNumber}</span></div>
        <div class="info-row"><span class="label">المشروع:</span> <span>${appointment.property?.title}</span></div>
        <div class="info-row"><span class="label">الموعد:</span> <span dir="ltr">${appointment.appointmentDate} ${appointment.startTime}</span></div>
      </div>

      <p style="margin-top: 30px;">شكراً لاختيارك <strong>Elite Gate</strong></p>
      <p>مع أطيب التحيات</p>
    `;

    const html = this.generateAppointmentTemplate(title, content);

    await this.mailService.sendMail({
      to: customer.email,
      subject: title,
      html,
    });
  }

  async sendAppointmentConfirmationEmailToAgent(agent: User, appointment: any, customer: User) {
    if (!agent.email) return;

    const title = 'موعد جديد مع عميل';
    const content = `
      <p style="font-size: 18px; margin-bottom: 20px;">يسعد أوقاتك وسيطنا الغالي،</p>
      <p>تم حجز موعد لمرافقة العميل.</p>
      <p>تأكد من الموقع .. وخلّك جاهز لصنع تجربة مثمرة للعميل.</p>
      <p>نتمنى لك التوفيق والنجاح 🌟</p>
      
      <div class="info-card">
        <div class="info-row"><span class="label">إسم العميل:</span> <span>${customer.fullName}</span></div>
        <div class="info-row"><span class="label">رقم التواصل:</span> <span dir="ltr">${customer.phoneNumber}</span></div>
        <div class="info-row"><span class="label">المشروع:</span> <span>${appointment.property?.title}</span></div>
        <div class="info-row"><span class="label">الموعد:</span> <span dir="ltr">${appointment.appointmentDate} ${appointment.startTime}</span></div>
      </div>
    `;

    const html = this.generateAppointmentTemplate(title, content);

    await this.mailService.sendMail({
      to: agent.email,
      subject: title,
      html,
    });
  }

  async sendAppointmentReminderToCustomer(customer: User, appointment: any) {
    if (!customer.email) return;

    const title = 'تذكير بموعدك غداً';
    const content = `
      <p style="font-size: 18px; margin-bottom: 20px;">عزيزي العميل <strong>${customer.fullName}</strong>،</p>
      <p>نود تذكيرك بأن موعد زيارتك للعقار هو غداً.</p>
      <p>نتمنى لك جولة ممتعة.</p>
      
      <div class="info-card">
        <div class="info-row"><span class="label">المشروع:</span> <span>${appointment.property?.title}</span></div>
        <div class="info-row"><span class="label">الموعد:</span> <span dir="ltr">${appointment.appointmentDate} ${appointment.startTime}</span></div>
      </div>
    `;

    const html = this.generateAppointmentTemplate(title, content);

    await this.mailService.sendMail({
      to: customer.email,
      subject: title,
      html,
    });
  }

  async sendAppointmentReminderToAgent(agent: User, appointment: any) {
    if (!agent.email) return;

    const title = 'تذكير بموعد غداً';
    const content = `
      <p style="font-size: 18px; margin-bottom: 20px;">عزيزي الوسيط <strong>${agent.fullName}</strong>،</p>
      <p>لديك موعد مؤكد مع عميل غداً. يرجى الاستعداد.</p>
      
      <div class="info-card">
        <div class="info-row"><span class="label">المشروع:</span> <span>${appointment.property?.title}</span></div>
        <div class="info-row"><span class="label">الموعد:</span> <span dir="ltr">${appointment.appointmentDate} ${appointment.startTime}</span></div>
      </div>
    `;

    const html = this.generateAppointmentTemplate(title, content);

    await this.mailService.sendMail({
      to: agent.email,
      subject: title,
      html,
    });
  }

  async sendUnassignedAppointmentWarningToAdmin(adminEmail: string, appointment: any) {
    const title = 'تنويع: موعد غير معين بعد 3 أيام';
    const content = `
      <p style="font-size: 18px; margin-bottom: 20px;">تنبيه هام للإدارة،</p>
      <p>يوجد موعد قادم بعد 3 أيام ولم يتم قبول أي وكيل له حتى الآن.</p>
      <p>يرجى مراجعة الطلب وتعيين وكيل يدوياً إذا لزم الأمر.</p>
      
      <div class="info-card">
        <div class="info-row"><span class="label">العميل:</span> <span>${appointment.customer?.fullName}</span></div>
        <div class="info-row"><span class="label">رقم العميل:</span> <span dir="ltr">${appointment.customer?.phoneNumber}</span></div>
        <div class="info-row"><span class="label">المشروع:</span> <span>${appointment.property?.title}</span></div>
        <div class="info-row"><span class="label">الموعد:</span> <span dir="ltr">${appointment.appointmentDate} ${appointment.startTime}</span></div>
      </div>
    `;

    const html = this.generateAppointmentTemplate(title, content);

    await this.mailService.sendMail({
      to: adminEmail,
      subject: title,
      html,
    });
  }
}

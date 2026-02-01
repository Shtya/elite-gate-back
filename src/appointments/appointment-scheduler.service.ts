
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Appointment, AppointmentStatus, User, UserType } from '../../entities/global.entity';
import { Repository, Between, In, IsNull } from 'typeorm';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AppointmentSchedulerService {
  private readonly logger = new Logger(AppointmentSchedulerService.name);

  constructor(
    @InjectRepository(Appointment)
    private appointmentRepository: Repository<Appointment>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private notificationsService: NotificationsService,
  ) {}

  // Run every day at 08:00 AM
  @Cron('0 8 * * *')
  async handleDailyReminders() {
    this.logger.log('Starting daily appointment reminders job...');
    
    // 1. Get tomorrow's date range
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Create start and end of "tomorrow"
    // Note: stored dates might be strings or Date objects depending on column type. 
    // Appointment.appointmentDate is likely a string "YYYY-MM-DD".
    const dateString = tomorrow.toISOString().split('T')[0];
    this.logger.log(`Checking for appointments on: ${dateString}`);

    // Find confirmed/accepted appointments for tomorrow
    const appointments = await this.appointmentRepository.find({
      where: {
        appointmentDate: dateString,
        status: In([AppointmentStatus.ACCEPTED, AppointmentStatus.CONFIRMED]),
      },
      relations: ['customer', 'agent', 'property'],
    });

    this.logger.log(`Found ${appointments.length} appointments for tomorrow.`);

    for (const apt of appointments) {
      // Notify Customer
      if (apt.customer) {
        await this.notificationsService.sendAppointmentReminderToCustomer(apt.customer, apt);
      }
      // Notify Agent
      if (apt.agent) {
        await this.notificationsService.sendAppointmentReminderToAgent(apt.agent, apt);
      }
    }
  }

  // Run every day at 09:00 AM
  @Cron('0 9 * * *')
  async handleUnassignedWarnings() {
    this.logger.log('Starting unassigned appointment warning job...');

    // 1. Get date 3 days from now
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 3);
    const dateString = targetDate.toISOString().split('T')[0]; // "YYYY-MM-DD"

    // Find PENDING appointments on that date with NO agent assigned
    const unassignedAppointments = await this.appointmentRepository.find({
      where: {
        appointmentDate: dateString,
        status: AppointmentStatus.PENDING,
        agent: IsNull(),
      },
      relations: ['customer', 'property'],
    });

    if (unassignedAppointments.length === 0) {
      this.logger.log('No unassigned appointments found for the target date.');
      return;
    }

    this.logger.log(`Found ${unassignedAppointments.length} unassigned appointments due in 3 days.`);

    // Get Admin emails
    const admins = await this.userRepository.find({
      where: { userType: UserType.ADMIN },
    });

    for (const apt of unassignedAppointments) {
      for (const admin of admins) {
        if (admin.email) {
          await this.notificationsService.sendUnassignedAppointmentWarningToAdmin(admin.email, apt);
        }
      }
    }
  }
}

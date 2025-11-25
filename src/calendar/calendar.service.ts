import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalendarAccount, AppointmentCalendarSync, User, Appointment, CalendarProvider } from 'entities/global.entity';
import { ConnectCalendarAccountDto, SyncAppointmentDto, CalendarQueryDto } from '../../dto/calendar.dto';

@Injectable()
export class CalendarService {
   constructor(
    @InjectRepository(CalendarAccount)
    public readonly calendarAccountRepository: Repository<CalendarAccount>,            // 👈 expose
    @InjectRepository(AppointmentCalendarSync)
    public readonly appointmentSyncRepository: Repository<AppointmentCalendarSync>,    // 👈 (optional) expose
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Appointment)
    private appointmentsRepository: Repository<Appointment>,
  ) {}

  async connectAccount(connectCalendarAccountDto: ConnectCalendarAccountDto): Promise<CalendarAccount> {
    const user = await this.usersRepository.findOne({ 
      where: { id: 1 } // From authenticated user
    });

    // Check if account already connected
    const existingAccount = await this.calendarAccountRepository.findOne({
      where: {
        user: { id: user.id },
        provider: connectCalendarAccountDto.provider,
      }
    });

    if (existingAccount) {
      // Update existing account
      Object.assign(existingAccount, connectCalendarAccountDto);
      return this.calendarAccountRepository.save(existingAccount);
    }

    const calendarAccount = this.calendarAccountRepository.create({
      ...connectCalendarAccountDto,
      user,
      tokenExpiresAt: new Date(connectCalendarAccountDto.tokenExpiresAt),
    });

    return this.calendarAccountRepository.save(calendarAccount);
  }

 
  async getAccount(id: number): Promise<CalendarAccount> {
    const account = await this.calendarAccountRepository.findOne({
      where: { id },
      relations: ['user']
    });

    if (!account) {
      throw new NotFoundException('Calendar account not found');
    }

    return account;
  }

  async disconnectAccount(id: number): Promise<void> {
    const account = await this.getAccount(id);
    await this.calendarAccountRepository.remove(account);
  }

  async syncAppointment(syncAppointmentDto: SyncAppointmentDto): Promise<AppointmentCalendarSync> {
    const appointment = await this.appointmentsRepository.findOne({
      where: { id: syncAppointmentDto.appointmentId },
      relations: ['customer', 'agent', 'property']
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const provider = syncAppointmentDto.provider || CalendarProvider.GOOGLE;
    
    // Check if already synced
    const existingSync = await this.appointmentSyncRepository.findOne({
      where: {
        appointment: { id: syncAppointmentDto.appointmentId },
        provider,
      }
    });

    if (existingSync) {
      return existingSync;
    }

    // Create calendar event via provider API
    const providerEventId = await this.createCalendarEvent(appointment, provider);

    const appointmentSync = this.appointmentSyncRepository.create({
      appointment,
      provider,
      providerEventId,
      syncedAt: new Date(),
    });

    return this.appointmentSyncRepository.save(appointmentSync);
  }

  async getAppointmentSync(appointmentId: number): Promise<AppointmentCalendarSync[]> {
    return this.appointmentSyncRepository.find({
      where: { appointment: { id: appointmentId } },
      relations: ['appointment'],
    });
  }

  async refreshExpiredTokens(): Promise<{ updated: number }> {
    const expiredAccounts = await this.calendarAccountRepository.find({
      where: {
        tokenExpiresAt: new Date(), // Less than current time
      }
    });

    let updatedCount = 0;
    
    for (const account of expiredAccounts) {
      try {
        // Refresh token logic for each provider
        const newTokens = await this.refreshTokenForProvider(account);
        
        if (newTokens) {
          account.accessToken = newTokens.accessToken;
          account.refreshToken = newTokens.refreshToken;
          account.tokenExpiresAt = newTokens.expiresAt;
          await this.calendarAccountRepository.save(account);
          updatedCount++;
        }
      } catch (error) {
        console.error(`Failed to refresh token for account ${account.id}:`, error);
      }
    }

    return { updated: updatedCount };
  }

  private async createCalendarEvent(appointment: Appointment, provider: CalendarProvider): Promise<string> {
    // Integration with actual calendar providers would go here
    // This is a mock implementation
    const eventData = {
      summary: `Property Viewing - ${appointment.property.title}`,
      description: `Property viewing appointment with ${appointment.customer.fullName}`,
      start: {
        dateTime: `${appointment.appointmentDate}T${appointment.startTime}:00`,
        timeZone: 'Asia/Riyadh',
      },
      end: {
        dateTime: `${appointment.appointmentDate}T${appointment.endTime}:00`,
        timeZone: 'Asia/Riyadh',
      },
      attendees: [
        { email: appointment.customer.email, displayName: appointment.customer.fullName },
        { email: appointment.agent?.email, displayName: appointment.agent?.fullName },
      ],
    };

    // Mock event ID - in real implementation, this would come from the calendar API
    return `cal_event_${appointment.id}_${Date.now()}`;
  }

  private async refreshTokenForProvider(account: CalendarAccount): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date } | null> {
    // Implementation would vary by provider
    // This is a mock implementation
    try {
      // Call provider's token refresh endpoint
      // For now, return mock data
      return {
        accessToken: 'new_access_token_' + Date.now(),
        refreshToken: account.refreshToken, // Sometimes refresh token remains the same
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      };
    } catch (error) {
      return null;
    }
  }
}
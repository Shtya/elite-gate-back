import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerTimelineEvent, User, TimelineEventType, Appointment } from 'entities/global.entity';
import { CreateTimelineEventDto, TimelineQueryDto } from '../../dto/timeline.dto';

@Injectable()
export class TimelineService {
  constructor(
    @InjectRepository(CustomerTimelineEvent)
    public readonly timelineEventsRepository: Repository<CustomerTimelineEvent>, // 👈 expose
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Appointment)
    private appointmentsRepository: Repository<Appointment>,
  ) {}
  async create(createTimelineEventDto: CreateTimelineEventDto): Promise<CustomerTimelineEvent> {
    const customer = await this.usersRepository.findOne({
      where: { id: createTimelineEventDto.customerId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    let actorUser: User | null = null;
    if (createTimelineEventDto.actorUserId) {
      actorUser = await this.usersRepository.findOne({
        where: { id: createTimelineEventDto.actorUserId },
      });
    }

    const timelineEvent = this.timelineEventsRepository.create({
      ...createTimelineEventDto,
      customer,
      actorUser,
    });

    return this.timelineEventsRepository.save(timelineEvent);
  }

 

  async logAppointmentStatusChange(appointmentId: number, oldStatus: string, newStatus: string, notes?: string): Promise<CustomerTimelineEvent> {
    const appointment = await this.appointmentsRepository.findOne({
      where: { id: appointmentId },
      relations: ['customer'],
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    let eventType: TimelineEventType;

    switch (newStatus) {
      case 'assigned':
        eventType = TimelineEventType.APPOINTMENT_ASSIGNED;
        break;
      case 'confirmed':
        eventType = TimelineEventType.APPOINTMENT_CONFIRMED;
        break;
      case 'in_progress':
        eventType = TimelineEventType.APPOINTMENT_IN_PROGRESS;
        break;
      case 'completed':
        eventType = TimelineEventType.APPOINTMENT_COMPLETED;
        break;
      case 'cancelled':
        eventType = TimelineEventType.APPOINTMENT_CANCELLED;
        break;
      default:
        eventType = TimelineEventType.APPOINTMENT_CREATED;
    }

    const timelineEvent = this.timelineEventsRepository.create({
      customer: appointment.customer,
      eventType,
      relatedId: appointmentId,
      relatedTable: 'appointments',
      notes: notes || `Appointment status changed from ${oldStatus} to ${newStatus}`,
    });

    return this.timelineEventsRepository.save(timelineEvent);
  }

  async logCustomerRegistration(customerId: number): Promise<CustomerTimelineEvent> {
    const customer = await this.usersRepository.findOne({
      where: { id: customerId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const timelineEvent = this.timelineEventsRepository.create({
      customer,
      eventType: TimelineEventType.REGISTRATION,
      notes: 'Customer registered in the system',
    });

    return this.timelineEventsRepository.save(timelineEvent);
  }

  async logDocumentVerification(customerId: number, status: 'verified' | 'rejected', notes?: string): Promise<CustomerTimelineEvent> {
    const customer = await this.usersRepository.findOne({
      where: { id: customerId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const eventType = status === 'verified' ? TimelineEventType.DOCUMENT_VERIFIED : TimelineEventType.DOCUMENT_REJECTED;

    const timelineEvent = this.timelineEventsRepository.create({
      customer,
      eventType,
      notes: notes || `Document ${status}`,
    });

    return this.timelineEventsRepository.save(timelineEvent);
  }
}

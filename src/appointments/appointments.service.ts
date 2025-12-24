import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';

import { Appointment, AppointmentStatusHistory, AppointmentStatus, User, Property, NotificationType, NotificationChannel, UserType, AgentAppointmentRequest, Agent, AgentAppointmentRequestStatus, AgentApprovalStatus, AgentEarning, PaymentStatus, WalletTransaction } from '../../entities/global.entity';
import { CreateAppointmentDto, UpdateAppointmentDto, UpdateStatusDto, AppointmentQueryDto } from '../../dto/appointments.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    public appointmentsRepository: Repository<Appointment>,
    @InjectRepository(AppointmentStatusHistory)
    public statusHistoryRepository: Repository<AppointmentStatusHistory>,
    @InjectRepository(User)
    public usersRepository: Repository<User>,
    @InjectRepository(Property)
    public propertiesRepository: Repository<Property>,
    @InjectRepository(AgentAppointmentRequest)
    public agentAppointmentRequestRepository: Repository<AgentAppointmentRequest>,
    @InjectRepository(Agent)
    public agentRepository: Repository<Agent>,
    private notificationsService: NotificationsService,


  ) {}
  private combineDateTime(date: string, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const d = new Date(date);
    d.setUTCHours(hours, minutes, 0, 0);
    return d;
  }
  async create(createAppointmentDto: CreateAppointmentDto): Promise<Appointment> {
    // 1. Property
    const startDateTime = this.combineDateTime(createAppointmentDto.appointmentDate, createAppointmentDto.startTime);
    const endDateTime = this.combineDateTime(createAppointmentDto.appointmentDate, createAppointmentDto.endTime);

    if (endDateTime <= startDateTime) {
      throw new BadRequestException("End time must be after start time.");
    }

    const property = await this.propertiesRepository.findOne({
      where: { id: createAppointmentDto.propertyId },
      relations: ["area", "city"]
    });
    if (!property) throw new NotFoundException("Property not found");

    // 2. Customer
    const customer = await this.usersRepository.findOne({
      where: { id: createAppointmentDto.customerId },
    });
    if (!customer) throw new NotFoundException("Customer not found");

    // 3. Check for overlapping ACCEPTED or PENDING appointments
    const overlapping = await this.appointmentsRepository
      .createQueryBuilder("appointment")
      .where("appointment.customer_id = :customerId", { customerId: createAppointmentDto.customerId })
      .andWhere("appointment.property_id = :propertyId", { propertyId: createAppointmentDto.propertyId })
      .andWhere("appointment.status IN (:...statuses)", { statuses: [AppointmentStatus.PENDING, AppointmentStatus.ACCEPTED] })
      .andWhere(
        "(:startTime < appointment.endTime AND :endTime > appointment.startTime)",
        {
          startTime: createAppointmentDto.startTime,
          endTime: createAppointmentDto.endTime,
        }
      )
      .getOne();

    if (overlapping) {
      throw new ConflictException(
        "You already have an appointment (pending or accepted) at this time for this property."
      );
    }

    // 4. Get all APPROVED agents
    const agents = await this.agentRepository.find({
      relations: ["cities", "areas", "user"],
      where: { status: AgentApprovalStatus.APPROVED }
    });

    if (agents.length === 0) {
      throw new NotFoundException("No approved agents found.");
    }

    // 5. Create the appointment (status: PENDING)
    const appointment = this.appointmentsRepository.create({
      ...createAppointmentDto,
      property,
      customer,
      agent: null, // No agent assigned initially
      status: AppointmentStatus.PENDING,
    });

    const savedAppointment = await this.appointmentsRepository.save(appointment);

    // 6. Create agent requests & send notifications
    const agentRequests = [];

    for (const agent of agents) {
      let shouldSendRequest = false;

      // Check if agent serves this property's area
      if (agent.cities && agent.cities.length > 0) {
        if (agent.cities.length > 1) {
          // Multiple cities → match property city
          shouldSendRequest = agent.cities.some(city => city.id === property.city.id);
        } else if (agent.cities.length === 1) {
          // Single city → match property area
          shouldSendRequest = agent.areas.some(area => area.id === property.area?.id);
        }
      }

      if (!shouldSendRequest) continue;

      // Create agent appointment request
      const request = this.agentAppointmentRequestRepository.create({
        appointment: savedAppointment,
        agent: agent.user,
        // Use agent.user (User entity) not agent (Agent entity)
        status: AppointmentStatus.PENDING,
      });

      const savedRequest = await this.agentAppointmentRequestRepository.save(request);
      agentRequests.push(savedRequest);

      // Send notification to agent
      await this.notificationsService.createNotification({
        userId: agent.user.id,
        type: NotificationType.SYSTEM,
        title: "New Appointment Request",
        message: "A customer wants to visit a property in your area. Please accept or reject the request.",
        relatedId: savedAppointment.id,
        channel: NotificationChannel.IN_APP,
      });
    }

    // 7. If no agents were matched, update appointment status
    if (agentRequests.length === 0) {
      appointment.status = AppointmentStatus.REJECTED;
      await this.appointmentsRepository.save(appointment);

      throw new NotFoundException("No agents available for this property location.");
    }

    // 8. Notify customer
    await this.notificationsService.createNotification({
      userId: customer.id,
      type: NotificationType.APPOINTMENT_REMINDER,
      title: "Appointment Created",
      message: "Your appointment request was sent to agents in the area.",
      relatedId: savedAppointment.id,
      channel: NotificationChannel.IN_APP,
    });

    // 9. Notify admin
    await this.notificationsService.notifyUserType(UserType.ADMIN, {
      type: NotificationType.SYSTEM,
      title: "New Appointment Created",
      message: `A customer created an appointment for property: ${property.title}`,
      relatedId: savedAppointment.id,
      channel: NotificationChannel.IN_APP,
    });

    return savedAppointment;
  }



  async respondToAppointmentRequest(
    requestId: number,
    agentId: number,
    status: AppointmentStatus,
    notes?: string
  ) {
    const request = await this.agentAppointmentRequestRepository.findOne({
      where: { id: requestId },
      relations: ["appointment", "agent", "appointment.customer"],
    });


    const agent = await this.agentRepository.findOne({
      where: { user: { id: agentId } },
    });

    if (!request) throw new NotFoundException("Request not found");
    if (!agent) throw new NotFoundException("Agent not found");

    if (request.agent.id !== agent.id) {
      throw new ForbiddenException("You don't have access to this request");
    }

    if (request.status === AppointmentStatus.ACCEPTED) {
      throw new BadRequestException("Request has already been processed");
    }

    const appointment = request.appointment;

    // Combine date & time
    const startDateTime = this.combineDateTime(appointment.appointmentDate, appointment.startTime);
    const endDateTime = this.combineDateTime(appointment.appointmentDate, appointment.endTime);

    // -----------------------------
    // ✔ If ACCEPTING → check overlap
    // -----------------------------
    if (status === AppointmentStatus.ACCEPTED) {
      const agentAppointments = await this.appointmentsRepository.find({
        where: {
          agent: { id: agentId },
          status: In([AppointmentStatus.CONFIRMED, AppointmentStatus.ACCEPTED]),
        },
      });

      for (const appt of agentAppointments) {
        const existingStart = this.combineDateTime(appt.appointmentDate, appt.startTime);
        const existingEnd = this.combineDateTime(appt.appointmentDate, appt.endTime);

        if (startDateTime < existingEnd && endDateTime > existingStart) {
          throw new ConflictException(
            `You already have another appointment at this time: ${appt.appointmentDate} ${appt.startTime}-${appt.endTime}`
          );
        }
      }

      // Assign the agent
      appointment.agent = request.agent;
      appointment.status = AppointmentStatus.CONFIRMED;

      await this.appointmentsRepository.save(appointment);

      // Reject other pending requests
      await this.agentAppointmentRequestRepository.update(
        {
          appointment: { id: appointment.id },
          status: AppointmentStatus.PENDING,
        },
        {
          status: AppointmentStatus.REJECTED,
          respondedAt: new Date(),
        }
      );

      // Customer notification
      await this.notificationsService.createNotification({
        userId: appointment.customer.id,
        type: NotificationType.APPOINTMENT_REMINDER,
        title: "Agent Accepted Appointment",
        message: `Agent ${request.agent.fullName} accepted your appointment request.`,
        relatedId: appointment.id,
        channel: NotificationChannel.IN_APP,
      });

      // Notify admin
      await this.notificationsService.notifyUserType(UserType.ADMIN, {
        type: NotificationType.SYSTEM,
        title: "Appointment Assigned",
        message: `Appointment has been assigned to agent ${request.agent.fullName}.`,
        relatedId: appointment.id,
        channel: NotificationChannel.IN_APP,
      });
    }

    const oldStatus = appointment.status;

    const statusHistory = this.statusHistoryRepository.create({
      appointment,
      oldStatus,
      newStatus: appointment.status,
      changedBy: { id: agentId } as User, // Should be logged-in user
      notes,
    });
    await this.statusHistoryRepository.save(statusHistory);

    // -----------------------------
    // ✔ Notifications for status change (Merged)
    // -----------------------------
    const statusMessages = {
      assigned: 'An agent has been assigned to your appointment.',
      confirmed: 'Your appointment has been confirmed.',
      in_progress: 'Your appointment is currently in progress.',
      completed: 'Your appointment has been completed.',
      cancelled: 'Your appointment has been cancelled.',
    };

    if (statusMessages[appointment.status]) {
      // Notify customer
      await this.notificationsService.createNotification({
        userId: appointment.customer.id,
        type: NotificationType.APPOINTMENT_REMINDER,
        title: 'Appointment Status Updated',
        message: statusMessages[appointment.status],
        relatedId: appointment.id,
        channel: NotificationChannel.IN_APP,
      });

      // Notify agent
      if (appointment.agent) {
        await this.notificationsService.createNotification({
          userId: appointment.agent.id,
          type: NotificationType.APPOINTMENT_REMINDER,
          title: 'Appointment Status Updated',
          message: statusMessages[appointment.status],
          relatedId: appointment.id,
          channel: NotificationChannel.IN_APP,
        });
      }
    }

    // Update request final status
    request.status = status;
    request.respondedAt = new Date();
    await this.agentAppointmentRequestRepository.save(request);

    return { request, appointment };
  }

  async getAgentAppointments(
    agentId: number,
    page: number = 1,
    limit: number = 10,
    pendingPage: number = 1,
    pendingLimit: number = 10
  ) {
    const agent = await this.agentRepository.findOne({
      where: { user: { id: agentId } },
    });

    if (!agent) {
      throw new NotFoundException("Agent not found");
    }

    const skip = (page - 1) * limit;
    const pendingSkip = (pendingPage - 1) * pendingLimit;

    // ---- Confirmed Appointments (Paginated) ----
    const [appointments, totalAppointments] =
      await this.agentAppointmentRequestRepository.findAndCount({
        where: [
          { agent: { id: agent.id },
          status: In([AppointmentStatus.ACCEPTED,AppointmentStatus.CONFIRMED,AppointmentStatus.COMPLETED,AppointmentStatus.EXPIRED]),
        },
        ],
        relations: ["appointment"],
        skip,
        take: limit,
      });

    // ---- Pending Requests (Paginated) ----
    const [pendingRequests, totalPending] =
      await this.agentAppointmentRequestRepository.findAndCount({
        where: {
          agent: { id: agent.id },
          status: In([AppointmentStatus.PENDING,AppointmentStatus.REJECTED]),
        },
        relations: [
          "appointment",
          "appointment.property",
          "appointment.customer",
        ],
        skip: pendingSkip,
        take: pendingLimit,
      });

    return {
      confirmed: {
        data: appointments,
        page,
        limit,
        total: totalAppointments,
        totalPages: Math.ceil(totalAppointments / limit),
      },
      pending: {
        data: pendingRequests,
        page: pendingPage,
        limit: pendingLimit,
        total: totalPending,
        totalPages: Math.ceil(totalPending / pendingLimit),
      },
    };
  }


  async findOne(id: number): Promise<Appointment> {
    const appointment = await this.appointmentsRepository.findOne({
      where: { id },
      relations: ['property', 'customer', 'agent', 'property.city', 'property.area'],
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    return appointment;
  }

  async update(id: number, updateAppointmentDto: UpdateAppointmentDto): Promise<Appointment> {
    const appointment = await this.findOne(id);

    if (updateAppointmentDto.agentId) {
      const agent = await this.usersRepository.findOne({
        where: { id: updateAppointmentDto.agentId },
      });
      if (!agent) {
        throw new NotFoundException('Agent not found');
      }
      appointment.agent = agent;
    }

    Object.assign(appointment, updateAppointmentDto);
    return this.appointmentsRepository.save(appointment);
  }

  async assignAgent(appointmentId: number, agentId: number): Promise<Appointment> {
    const appointment = await this.findOne(appointmentId);
    const agent = await this.usersRepository.findOne({ where: { id: agentId } });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    appointment.agent = agent;

    // Notify the customer about the assigned agent
    await this.notificationsService.createNotification({
      userId: appointment.customer.id,
      type: NotificationType.APPOINTMENT_REMINDER,
      title: 'Agent Assigned to Your Appointment',
      message: `Agent ${agent.fullName} has been assigned to your property viewing appointment.`,
      relatedId: appointment.id,
      channel: NotificationChannel.IN_APP,
    });

    // Notify the agent about the new assignment
    await this.notificationsService.createNotification({
      userId: agent.id,
      type: NotificationType.APPOINTMENT_REMINDER,
      title: 'You Have Been Assigned to a New Appointment',
      message: `You have been assigned to an appointment with the client ${appointment.customer.fullName}.`,
      relatedId: appointment.id,
      channel: NotificationChannel.IN_APP,
    });

    return this.appointmentsRepository.save(appointment);
  }

  async updateStatus(appointmentId: number, updateStatusDto: UpdateStatusDto): Promise<Appointment> {
    const appointment = await this.findOne(appointmentId);

    const oldStatus = appointment.status;
    appointment.status = updateStatusDto.status;

    // Save status history
    const statusHistory = this.statusHistoryRepository.create({
      appointment,
      oldStatus,
      newStatus: updateStatusDto.status,
      changedBy: { id: 1 } as User, // This should come from authenticated user
      notes: updateStatusDto.notes,
    });
    await this.statusHistoryRepository.save(statusHistory);

    // Notification for appointment status change
    const statusMessages = {
      assigned: 'An agent has been assigned to your appointment.',
      confirmed: 'Your appointment has been confirmed.',
      in_progress: 'Your appointment is currently in progress.',
      completed: 'Your appointment has been completed.',
      cancelled: 'Your appointment has been cancelled.',
    };

    if (statusMessages[updateStatusDto.status]) {
      await this.notificationsService.createNotification({
        userId: appointment.customer.id,
        type: NotificationType.APPOINTMENT_REMINDER,
        title: 'Appointment Status Updated',
        message: statusMessages[updateStatusDto.status],
        relatedId: appointment.id,
        channel: NotificationChannel.IN_APP,
      });

      if (appointment.agent) {
        await this.notificationsService.createNotification({
          userId: appointment.agent.id,
          type: NotificationType.APPOINTMENT_REMINDER,
          title: 'Appointment Status Updated',
          message: statusMessages[updateStatusDto.status],
          relatedId: appointment.id,
          channel: NotificationChannel.IN_APP,
        });
      }
    }

    return this.appointmentsRepository.save(appointment);
  }
  async updateAppointmentFinalStatus(
    requestId: number,
    status: AppointmentStatus,   // "completed" | "expired"
    changedBy: User,             // pass the logged-in user here
    notes?: string
  ): Promise<{ appointment: Appointment; request: AgentAppointmentRequest }> {

    // Use transaction to ensure all operations succeed or fail together
    const result = await this.appointmentsRepository.manager.transaction(async (transactionalEntityManager) => {

      // 1️⃣ Find the agent appointment request by requestId
      const request = await transactionalEntityManager.findOne(AgentAppointmentRequest, {
        where: {
          id: requestId,
          status: AppointmentStatus.ACCEPTED,
        },
        relations: ['appointment', 'appointment.property', 'appointment.customer', 'appointment.agent', 'agent'],
      });

      if (!request) {
        throw new NotFoundException('Agent appointment request not found or not accepted.');
      }

      const appointment = request.appointment;
      const oldStatus = appointment.status;

      // 2️⃣ Validate status transition
      if (oldStatus === status) {
        throw new BadRequestException(`Appointment is already ${status}.`);
      }

      let walletTransaction: WalletTransaction | null = null;

      // 3️⃣ If status is COMPLETED, add visit amount to agent's wallet and update statistics
      if (status === AppointmentStatus.COMPLETED && request.agent) {
        const agent = await transactionalEntityManager.findOne(Agent, {
          where: { id: request.agent.id },
        });

        if (!agent) {
          throw new NotFoundException('Agent not found.');
        }

        // Check if commission was already added
        if (request.isCommissionAdded) {
          throw new BadRequestException('Commission has already been added for this appointment.');
        }

        // Add visit amount to agent's wallet balance
        const visitAmount = agent.visitAmount || 0;

        if (visitAmount <= 0) {
          throw new BadRequestException('Visit amount is not set for this agent.');
        }

        const oldWalletBalance = Number(agent.walletBalance);
        const newWalletBalance = oldWalletBalance + Number(visitAmount);

        // Update agent wallet and statistics
        agent.walletBalance = newWalletBalance;
        agent.totalEarned = Number(agent.totalEarned) + Number(visitAmount);
        agent.completedAppointments += 1; // Increment completed appointments
        agent.totalTransactions += 1; // Increment total transactions

        // Update commission amount in the request
        request.commissionAmount = visitAmount;
        request.isCommissionAdded = true;
        request.commissionAddedAt = new Date();

        // Create AgentEarning record
        const earning = transactionalEntityManager.create(AgentEarning, {
          agent: agent.user,
          amount: visitAmount,
          type: 'appointment_commission',
          agentAppointmentRequestId: request.id,
          description: `Visit commission for appointment #${appointment.id}`,
          addedBy: changedBy,
        });

        // Save agent, request, and earning within transaction
        await transactionalEntityManager.save(Agent, agent);
        await transactionalEntityManager.save(AgentAppointmentRequest, request);
        await transactionalEntityManager.save(AgentEarning, earning);

        // Create Wallet Transaction record for audit
        walletTransaction = transactionalEntityManager.create(WalletTransaction, {
          agent: agent.user,
          status: PaymentStatus.COMPLETED,
          transactionType: 'earning',
          amount: visitAmount,
          balanceBefore: oldWalletBalance,
          balanceAfter: newWalletBalance,
          description: `Commission from completed appointment #${appointment.id}`,
          agentAppointmentRequest: request,
          appointment: appointment,
          processedBy: changedBy,
          notes: `Automatic commission for completed appointment`,
        });

        walletTransaction = await transactionalEntityManager.save(WalletTransaction, walletTransaction);
      }

      // 4️⃣ If status is EXPIRED, still update the request status but don't add commission
      if (status === AppointmentStatus.EXPIRED && request.agent) {
        const agent = await transactionalEntityManager.findOne(Agent, {
          where: { id: request.agent.id },
        });

        if (agent) {
          // Increment total transactions even for expired appointments
          agent.totalTransactions += 1;
          await transactionalEntityManager.save(Agent, agent);
        }
      }

      // 5️⃣ Update statuses
      appointment.status = status;
      request.status = status;

      // Save both appointment and request within transaction
      await transactionalEntityManager.save(AgentAppointmentRequest, request);
      const updatedAppointment = await transactionalEntityManager.save(Appointment, appointment);

      // 6️⃣ Save status history within transaction
      const statusHistory = transactionalEntityManager.create(AppointmentStatusHistory, {
        appointment,
        oldStatus,
        newStatus: status,
        changedBy,
        notes,
      });
      await transactionalEntityManager.save(AppointmentStatusHistory, statusHistory);

      return {
        appointment: updatedAppointment,
        request: request,
        walletTransaction: walletTransaction
      };
    });

    // 7️⃣ Send notifications after successful transaction
    try {
      const statusMessages = {
        [AppointmentStatus.COMPLETED]: 'Your appointment has been marked as completed.',
        [AppointmentStatus.EXPIRED]: 'Your appointment has expired.',
      };

      // Notify customer
      await this.notificationsService.createNotification({
        userId: result.appointment.customer.id,
        type: NotificationType.APPOINTMENT_REMINDER,
        title: 'Appointment Status Updated',
        message: statusMessages[status],
        relatedId: result.appointment.id,
        channel: NotificationChannel.IN_APP,
      });

      // Notify agent
      if (result.appointment.agent) {
        await this.notificationsService.createNotification({
          userId: result.appointment.agent.id,
          type: NotificationType.APPOINTMENT_REMINDER,
          title: 'Appointment Status Updated',
          message: statusMessages[status],
          relatedId: result.appointment.id,
          channel: NotificationChannel.IN_APP,
        });

        // Send commission notification only for completed status
        if (status === AppointmentStatus.COMPLETED && result.request.agent) {
          const agent = await this.agentRepository.findOne({
            where: { id: result.request.agent.id },
          });

          if (agent) {
            const visitAmount = agent.visitAmount || 0;
            await this.notificationsService.createNotification({
              userId: result.appointment.agent.id,
              type: NotificationType.SYSTEM,
              title: 'Commission Added',
              message: `SAR ${visitAmount} has been added to your wallet for completing appointment #${result.appointment.id}. You now have SAR ${agent.walletBalance} available in your wallet.`,
              relatedId: result.appointment.id,
              channel: NotificationChannel.IN_APP,
            });

            // Also notify admin about the commission payout
            await this.notificationsService.notifyUserType(UserType.ADMIN, {
              type: NotificationType.SYSTEM,
              title: 'Agent Commission Paid',
              message: `Agent ${agent.user.fullName} received SAR ${visitAmount} commission for completed appointment #${result.appointment.id}`,
              relatedId: result.appointment.id,
              channel: NotificationChannel.IN_APP,
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to send notifications:', error);
      // Don't throw error here as notifications are not critical
    }

    return {
      appointment: result.appointment,
      request: result.request
    };
  }

}

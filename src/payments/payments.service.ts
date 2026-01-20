import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentPayment, AgentBalance, Appointment, User, PaymentStatus, PaymentGateway, NotificationType, NotificationChannel, UserType } from 'entities/global.entity';
import { CreatePaymentDto, UpdatePaymentDto, ProcessPaymentDto, PaymentQueryDto } from '../../dto/payments.dto';
import { NotificationsService } from 'src/notifications/notifications.service';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(AgentPayment)
    public readonly paymentsRepository: Repository<AgentPayment>, // 👈 expose
    @InjectRepository(AgentBalance)
    private balanceRepository: Repository<AgentBalance>,
    @InjectRepository(Appointment)
    private appointmentRepository: Repository<Appointment>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private notificationsService: NotificationsService,
  ) {}

  async create(createPaymentDto: CreatePaymentDto) {
    const appointment = await this.appointmentRepository.findOne({
      where: { id: createPaymentDto.appointmentId },
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const agent = await this.usersRepository.findOne({
      where: { id: createPaymentDto.agentId },
    });
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    // Check if payment already exists for this appointment
    // const existingPayment = await this.paymentsRepository.findOne({
    //   where: { appointment: { id: createPaymentDto.appointmentId } },
    // });
    // if (existingPayment) {
    //   throw new BadRequestException('Payment already exists for this appointment');
    // }

    const payment: any = await this.paymentsRepository.create({
      ...createPaymentDto,
      appointment,
      agent,
      updatedBy: { id: 1 } as User, // From authenticated user
    } as any);

    // Notify the agent about a new payment
    await this.notificationsService.createNotification({
      userId: payment.agent.id,
      type: NotificationType.PAYMENT_SUCCESS,
      title: 'دفعة جديدة',
      message: `تم إنشاء دفعة جديدة لك بقيمة ${payment.amount} ${payment.currency}.`,
      relatedId: payment.id,
      channel: NotificationChannel.IN_APP,
    });

    // Notify the admin about the new payment
    await this.notificationsService.notifyUserType(UserType.ADMIN, {
      type: NotificationType.PAYMENT_SUCCESS,
      title: 'تم إضافة دفعة جديدة',
      message: `تم إضافة دفعة جديدة للوكيل ${payment.agent.fullName} بقيمة ${payment.amount} ${payment.currency}.`,
      relatedId: payment.id,
      channel: NotificationChannel.IN_APP,
    });

    return this.paymentsRepository.save(payment);
  }

  async findAll(query: PaymentQueryDto): Promise<{ data: AgentPayment[]; total: number }> {
    const { agentId, status, gateway, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (agentId) where.agent = { id: agentId };
    if (status) where.status = status;
    if (gateway) where.gateway = gateway;

    const [data, total] = await this.paymentsRepository.findAndCount({
      where,
      relations: ['appointment', 'agent', 'updatedBy'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total };
  }

  async findOne(id: number): Promise<AgentPayment> {
    const payment = await this.paymentsRepository.findOne({
      where: { id },
      relations: ['appointment', 'agent', 'updatedBy'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async update(id: number, updatePaymentDto: UpdatePaymentDto): Promise<AgentPayment> {
    const payment = await this.findOne(id);
    Object.assign(payment, updatePaymentDto);
    return this.paymentsRepository.save(payment);
  }

  // async processPayment(id: number, processPaymentDto: ProcessPaymentDto): Promise<AgentPayment> {
  //   const payment = await this.findOne(id);

  //   if (payment.status !== PaymentStatus.PENDING) {
  //     throw new BadRequestException('Payment can only be processed when in pending status');
  //   }

  //   payment.status = PaymentStatus.PROCESSING;
  //   payment.gateway = processPaymentDto.gateway;
  //   if (processPaymentDto.transactionId) {
  //     payment.transactionId = processPaymentDto.transactionId;
  //   }

  //   return this.paymentsRepository.save(payment);
  // }

  async completePayment(id: number): Promise<AgentPayment> {
    const payment = await this.findOne(id);

    if (payment.status !== PaymentStatus.PROCESSING) {
      throw new BadRequestException('Payment must be in processing status to complete');
    }

    payment.status = PaymentStatus.COMPLETED;
    payment.paidAt = new Date();

    const savedPayment = await this.paymentsRepository.save(payment);

    // // Update agent balance
    // await this.updateAgentBalance(payment.agent.id, parseFloat(payment.amount.toString()));
    // await this.notificationsService.createNotification({
    //   userId: payment.agent.id,
    //   type: NotificationType.SYSTEM,
    //   title: 'Payment Received',
    //   message: `Congratulations! Your payment of ${payment.amount} ${payment.currency} has been received successfully.`,
    //   relatedId: payment.id,
    //   channel: NotificationChannel.IN_APP,
    // });

    return savedPayment;
  }

  private async updateAgentBalance(agentId: number, amount: number): Promise<void> {
    let balance = await this.balanceRepository.findOne({
      where: { agent: { id: agentId } },
    });

    if (!balance) {
      balance = this.balanceRepository.create({
        agent: { id: agentId } as User,
        totalEarnings: amount.toString(),
        pendingBalance: '0',
      });
    } else {
      const totalEarnings = parseFloat(balance.totalEarnings) + amount;
      const pendingBalance = parseFloat(balance.pendingBalance) - amount;

      balance.totalEarnings = totalEarnings.toString();
      balance.pendingBalance = Math.max(0, pendingBalance).toString();
    }

    await this.balanceRepository.save(balance);
  }

  async getAgentBalance(agentId: number): Promise<AgentBalance> {
    let balance = await this.balanceRepository.findOne({
      where: { agent: { id: agentId } },
      relations: ['agent'],
    });

    if (!balance) {
      balance = this.balanceRepository.create({
        agent: { id: agentId } as User,
        totalEarnings: '0',
        pendingBalance: '0',
      });
      await this.balanceRepository.save(balance);
    }

    return balance;
  }

  async getAgentPayments(agentId: number, query: PaymentQueryDto): Promise<{ data: AgentPayment[]; total: number }> {
    const { status, gateway, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = { agent: { id: agentId } };
    if (status) where.status = status;
    if (gateway) where.gateway = gateway;

    const [data, total] = await this.paymentsRepository.findAndCount({
      where,
      relations: ['appointment', 'updatedBy'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total };
  }
}

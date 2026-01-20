import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { toWebPathFiles } from 'common/upload.config';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';

import { Agent, AgentAppointmentRequest, AgentApprovalStatus, AgentBalance, AgentPayment, Appointment, AppointmentStatus, Area, City, CustomerReview, NotificationChannel, NotificationType, PaymentStatus, User, UserType, VerificationStatus, WalletTransaction } from '../../entities/global.entity';
import { CreateAgentDto, UpdateAgentDto, ApproveAgentDto, AgentQueryDto } from '../../dto/agents.dto';

import { NotificationsService } from '../notifications/notifications.service';
import * as bcrypt from 'bcryptjs';
import { RegisterDto } from '../../dto/auth.dto';

@Injectable()
export class AgentsService {
  constructor(
    @InjectRepository(Agent)
    public agentsRepository: Repository<Agent>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Appointment)
    private appointmentRepo: Repository<Appointment>,
    @InjectRepository(AgentPayment)
    private paymentRepo: Repository<AgentPayment>,
    @InjectRepository(CustomerReview)
    private reviewRepo: Repository<CustomerReview>,
    @InjectRepository(AgentBalance)
    private balanceRepo: Repository<AgentBalance>,

    @InjectRepository(City)
    private cityRepository: Repository<City>,
@InjectRepository(Area)
    private areaRepository: Repository<Area>,
    @InjectRepository(AgentAppointmentRequest)
    private agentAppointmentRepository: Repository<AgentAppointmentRequest>,

    @InjectRepository(WalletTransaction)
    private walletTransactionRepository: Repository<WalletTransaction>,
    private notificationsService: NotificationsService,
  ) {}
  private async resolveCityAndAreaSelection(cityIds: any[], areaIds: any[]) {
    let cities: City[];
    let areas: Area[] = [];

    const allCities = await this.cityRepository.find({
      relations: ['areas'],
    });

    if (cityIds.includes("all")) {
      cities = allCities;
      areas = allCities.flatMap(c => c.areas);
      return { cities, areas };
    }

    cityIds = cityIds.map(Number);

    cities = await this.cityRepository.find({
      where: cityIds.map(id => ({ id })),
      relations: ['areas']
    });

    if (!cities.length) {
      throw new BadRequestException("Invalid cityIds");
    }

    if (cities.length > 1) {
      areas = cities.flatMap(c => c.areas);
      return { cities, areas };
    }

    const city = cities[0];

    if (areaIds?.includes("all")) {
      areas = city.areas;
      return { cities, areas };
    }

    areaIds = areaIds?.map(Number) ?? [];
    areas = await this.areaRepository.findByIds(areaIds);

    return { cities, areas };
  }

  async create(createAgentDto: CreateAgentDto, byAdmin: boolean): Promise<Agent> {
    const existingAgent = await this.agentsRepository.findOne({
      where: { user: { id: createAgentDto.userId } },
    });

    if (existingAgent) {
      throw new ConflictException("Agent application already exists for this user");
    }

    const user = await this.usersRepository.findOne({
      where: { id: createAgentDto.userId },
    });
    if (!user) throw new NotFoundException("User not found");

    // use resolver here
    const { cities, areas } = await this.resolveCityAndAreaSelection(
      createAgentDto.cityIds,
      createAgentDto.areaIds ?? []
    );

    const agent = this.agentsRepository.create({
      user,
      cities,
      areas,
      identityProofUrl: createAgentDto.identityProof,
      residencyDocumentUrl: createAgentDto.residencyDocument,
      status: byAdmin ? AgentApprovalStatus.APPROVED : AgentApprovalStatus.PENDING,
    });

    user.userType = byAdmin ? UserType.AGENT : UserType.CUSTOMER;
    await user.save();

    if (!byAdmin) {
      await this.notificationsService.notifyUserType(UserType.ADMIN, {
        type: NotificationType.AGENT_NEW_REGISTRATION,
        title: "طلب تسجيل وكيل جديد",
        message: `قدم الوكيل ${user.fullName} طلب تسجيل.`,
        channel: NotificationChannel.IN_APP,
      });
    }

    return this.agentsRepository.save(agent);
  }




  async findAll(query: AgentQueryDto): Promise<{ data: Agent[]; total: number }> {
    const { status, cityId, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (cityId) where.city = { id: cityId };

    const [data, total] = await this.agentsRepository.findAndCount({
      where,
      relations: ['user', 'city'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total };
  }

  async findOne(id: number): Promise<any> {
    const agent = await this.agentsRepository.findOne({
      where: { id },
      relations: ['user', 'cities', 'areas', 'updatedBy'],
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    // Run all counts in parallel
    const [
      appointmentAccepted,
      appointmentExpired,
      appointmentCancelled,
      appointmentConfirmed,
      appointmentCompleted,
      appointmentRejected,
    ] = await Promise.all([
      this.agentAppointmentRepository.countBy({
        status: AppointmentStatus.ACCEPTED,
        agent: { id },
      }),
      this.agentAppointmentRepository.countBy({
        status: AppointmentStatus.EXPIRED,
        agent: { id },
      }),
      this.agentAppointmentRepository.countBy({
        status: AppointmentStatus.CANCELLED,
        agent: { id },
      }),
      this.agentAppointmentRepository.countBy({
        status: AppointmentStatus.CONFIRMED,
        agent: { id },
      }),
      this.agentAppointmentRepository.countBy({
        status: AppointmentStatus.COMPLETED,
        agent: { id },
      }),
      this.agentAppointmentRepository.countBy({
        status: AppointmentStatus.REJECTED,
        agent: { id },
      }),
    ]);

    return {
      agent,
      stats: {
        accepted: appointmentAccepted,
        expired: appointmentExpired,
        cancelled: appointmentCancelled,
        confirmed: appointmentConfirmed,
        completed: appointmentCompleted,
        rejected: appointmentRejected,
      },
    };
  }

  async update(id: number, dto: UpdateAgentDto): Promise<Agent> {
    const agent = await this.agentsRepository.findOne({
      where: { id },
      relations: ['cities', 'areas']
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }
    if (!dto.cityIds && !dto.areaIds) {
      Object.assign(agent, dto);
      return this.agentsRepository.save(agent);
    }
    console.log(dto.areaIds)
    // use resolver here
    const { cities, areas } = await this.resolveCityAndAreaSelection(
      dto.cityIds ?? agent.cities.map(c => c.id),
      dto.areaIds ?? agent.areas.map(a => a.id)
    );

    agent.cities = cities;
    agent.areas = areas;

    Object.assign(agent, dto);

    return this.agentsRepository.save(agent);
  }


  async remove(id: number): Promise<void> {
    const agent = await this.findOne(id);
    await this.agentsRepository.remove(agent);
  }

  async approve(id: number, approveAgentDto: ApproveAgentDto): Promise<Agent> {
    const agent = await this.agentsRepository.findOne({where:{id},relations:['user']});
    agent.status = approveAgentDto.status;
    if (approveAgentDto.kycNotes) {
      agent.kycNotes = approveAgentDto.kycNotes;
    }
    if (approveAgentDto.status === AgentApprovalStatus.APPROVED) {
      agent.user.userType = UserType.AGENT;
      await this.usersRepository.save(agent.user);
    }
    await this.notificationsService.createNotification({
      userId: agent.user.id,
      type: approveAgentDto.status === 'approved' ? NotificationType.AGENT_APPROVED : NotificationType.AGENT_REJECTED,
      title: 'قرار تسجيل الوكيل',
      message: `تم ${approveAgentDto.status === 'approved' ? 'قبول' : 'رفض'} طلب تسجيل وكالتك`,
      channel: NotificationChannel.IN_APP,
    });

    return this.agentsRepository.save(agent);
  }

  async findByUserId(userId: number): Promise<Agent> {
    const agent = await this.agentsRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user', 'city'],
    });

    if (!agent) {
      throw new NotFoundException('Agent not found for this user');
    }

    return agent;
  }
  async getDashboard(agentId: number, page: number = 1, limit: number = 10, filters?: any) {
    const agent = await this.agentsRepository.findOne({
      where: { user: { id: agentId } },
      relations: ['user', 'earnings', 'payments', 'walletTransactions']
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    // Run all queries in parallel for better performance
    const [
      totalAppointments,
      reviews,
      recentAppointments,
      recentPayments,
      appointmentStats,
      walletStats,
      payoutHistory
    ] = await Promise.all([
      // Total appointments count
      this.appointmentRepo.count({
        where: { agent: { id: agent.id } },
      }),

      // Recent reviews
      this.reviewRepo.find({
        where: { agentId: agent.id },
        order: { createdAt: 'DESC' },
        take: 5,
      }),

      // Recent appointments
      this.appointmentRepo.find({
        where: { agent: { id: agent.id } },
        order: { appointmentDate: 'DESC' },
        take: 5,
        relations: ['customer', 'property'],
      }),

      // Recent payments
      this.paymentRepo.find({
        where: { agent: { id: agent.id } },
        order: { createdAt: 'DESC' },
        take: 5,
      }),

      // Appointment statistics
      this.getAppointmentStats(agent.id),

      // Wallet statistics
      this.getWalletStats(agent),

      // Payout history with pagination
      this.getPayoutHistory(agent.id, page, limit, filters)
    ]);

    // Calculate average rating
    const averageRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    return {
      agent: {
        id: agent.id,
        name: agent.user.fullName,
        email: agent.user.email,
        phoneNumber: agent.user.phoneNumber,
        profilePhotoUrl: agent.user.profilePhotoUrl,
        visitAmount: agent.visitAmount,
        walletBalance: agent.walletBalance,
        totalEarned: agent.totalEarned,
        totalPaid: agent.totalPaid,
        completedAppointments: agent.completedAppointments,
        totalTransactions: agent.totalTransactions,
        lastPayoutDate: agent.lastPayoutDate,
      },

      overview: {
        totalAppointments,
        averageRating,
        walletBalance: agent.walletBalance,
        availableForPayout: agent.walletBalance,
        totalEarned: agent.totalEarned,
        totalPaid: agent.totalPaid,
      },

      statistics: {
        // Appointment statistics
        appointmentStats,

        // Wallet statistics
        walletStats,

        // Performance metrics
        performance: {
          averageEarningPerAppointment: agent.completedAppointments > 0
            ? agent.totalEarned / agent.completedAppointments
            : 0,
          completionRate: totalAppointments > 0
            ? (agent.completedAppointments / totalAppointments) * 100
            : 0,
          monthlyEarningTrend: await this.getMonthlyEarningTrend(agent.id)
        }
      },

      recentActivity: {
        payments: recentPayments,
        reviews: reviews,
        appointments: recentAppointments,
      },

      payoutHistory: payoutHistory
    };
  }

  // Helper method for appointment statistics
  private async getAppointmentStats(agentId: number) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalAccepted,
      totalCompleted,
      totalExpired,
      totalCancelled,
      totalRejected,
      recentCompleted
    ] = await Promise.all([
      this.agentAppointmentRepository.countBy({
        status: AppointmentStatus.ACCEPTED,
        agent: { id: agentId },
      }),
      this.agentAppointmentRepository.countBy({
        status: AppointmentStatus.COMPLETED,
        agent: { id: agentId },
      }),
      this.agentAppointmentRepository.countBy({
        status: AppointmentStatus.EXPIRED,
        agent: { id: agentId },
      }),
      this.agentAppointmentRepository.countBy({
        status: AppointmentStatus.CANCELLED,
        agent: { id: agentId },
      }),
      this.agentAppointmentRepository.countBy({
        status: AppointmentStatus.REJECTED,
        agent: { id: agentId },
      }),
      this.agentAppointmentRepository.countBy({
        status: AppointmentStatus.COMPLETED,
        agent: { id: agentId },
        createdAt: MoreThanOrEqual(thirtyDaysAgo)
      })
    ]);

    return {
      accepted: totalAccepted,
      completed: totalCompleted,
      expired: totalExpired,
      cancelled: totalCancelled,
      rejected: totalRejected,
      recentCompleted: recentCompleted,
      successRate: totalAccepted > 0 ? (totalCompleted / totalAccepted) * 100 : 0
    };
  }

  // Helper method for wallet statistics
  private async getWalletStats(agent: Agent) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [recentEarnings, recentPayouts, totalTransactions] = await Promise.all([
      this.walletTransactionRepository
        .createQueryBuilder('wt')
        .where('wt.agent_id = :agentId', { agentId: agent.user.id })
        .andWhere('wt.transaction_type = :type', { type: 'earning' })
        .andWhere('wt.created_at >= :date', { date: thirtyDaysAgo })
        .select('SUM(wt.amount)', 'total')
        .getRawOne(),

      this.walletTransactionRepository
        .createQueryBuilder('wt')
        .where('wt.agent_id = :agentId', { agentId: agent.user.id })
        .andWhere('wt.transaction_type = :type', { type: 'payout' })
        .andWhere('wt.created_at >= :date', { date: thirtyDaysAgo })
        .select('SUM(wt.amount)', 'total')
        .getRawOne(),

      this.walletTransactionRepository.count({
        where: { agent: { id: agent.user.id } }
      })
    ]);

    return {
      earningsLast30Days: parseFloat(recentEarnings.total) || 0,
      payoutsLast30Days: parseFloat(recentPayouts.total) || 0,
      totalTransactions: totalTransactions,
      averageTransactionAmount: totalTransactions > 0
        ? agent.totalEarned / totalTransactions
        : 0
    };
  }

  // Helper method for payout history
  private async getPayoutHistory(agentId: number, page: number = 1, limit: number = 10, filters?: any) {
    const skip = (page - 1) * limit;

    const query = this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.agent', 'agent')
      .leftJoinAndSelect('payment.processedBy', 'admin')
      .where('payment.agent_id = :agentId', { agentId })
      .orderBy('payment.createdAt', 'DESC');

    if (filters?.status) {
      query.andWhere('payment.status = :status', { status: filters.status });
    }

    if (filters?.dateFrom && filters?.dateTo) {
      query.andWhere('payment.paid_at BETWEEN :dateFrom AND :dateTo', {
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      });
    }

    const [payments, total] = await query
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Helper method for monthly earning trend
  private async getMonthlyEarningTrend(agentId: number) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyEarnings = await this.walletTransactionRepository
      .createQueryBuilder('wt')
      .select("TO_CHAR(wt.created_at, 'YYYY-MM') as month")
      .addSelect('SUM(wt.amount)', 'total')
      .where('wt.agent_id = :agentId', { agentId })
      .andWhere('wt.transaction_type = :type', { type: 'earning' })
      .andWhere('wt.created_at >= :date', { date: sixMonthsAgo })
      .groupBy("TO_CHAR(wt.created_at, 'YYYY-MM')")
      .orderBy('month', 'ASC')
      .getRawMany();

    return monthlyEarnings.map(item => ({
      month: item.month,
      earnings: parseFloat(item.total) || 0
    }));
  }

async registerAgent(
  registerDto: RegisterDto & { cityIds: any[]; areaIds?: any[]},
  files?: {
    identityProof?: Express.Multer.File[];
    residencyDocument?: Express.Multer.File[];
  },
): Promise<{ message: string }> {

  const existingUser = await this.usersRepository.findOne({
    where: [
      { email: registerDto.email },
      ...(registerDto.phoneNumber ? [{ phoneNumber: registerDto.phoneNumber }] : []),
    ],
  });

  if (existingUser) {
    throw new ConflictException("User with this email (or phone) already exists");
  }
  // 2️⃣ Hash password and create user
  const passwordHash = await bcrypt.hash(registerDto.password, 12);
  const user = this.usersRepository.create({
    email: registerDto.email,
    phoneNumber: registerDto.phoneNumber,
    fullName: registerDto.fullName,
    userType: UserType.AGENT,
    profilePhotoUrl: registerDto.profilePhotoUrl,
    passwordHash,
    verificationStatus: VerificationStatus.VERIFIED,
  });

  await this.usersRepository.save(user);

  await this.notificationsService.createNotification({
    userId: user.id,
    type: NotificationType.SYSTEM,
    title: "Welcome to the Real Estate Platform",
    message: `Hello ${user.fullName}! Your account has been successfully created as an agent.`,
    channel: NotificationChannel.IN_APP,
  });

  // 4️⃣ Notify Admin
  const adminUsers = await this.usersRepository.find({ where: { userType: UserType.ADMIN } });
  if (adminUsers.length > 0) {
    await this.notificationsService.createNotification({
      userId: adminUsers[0].id,
      type: NotificationType.AGENT_NEW_REGISTRATION,
      title: "تم تسجيل وكيل جديد",
      message: `قام وكيل جديد باسم ${user.fullName} بالتسجيل في المنصة.`,
      channel: NotificationChannel.IN_APP,
    });
  }
    // 5️⃣ Create agent entity
    const agent = this.agentsRepository.create({
      user,
      visitAmount:registerDto.visitAmount,
    identityProofUrl: files?.identityProof?.[0]
        ? toWebPathFiles(files.identityProof[0].filename)
        : registerDto.identityProof,
      residencyDocumentUrl: files?.residencyDocument?.[0]
        ? toWebPathFiles(files.residencyDocument[0].filename)
        : registerDto.residencyDocument,
    });
  console.log(agent)
  // 6️⃣ Resolve city & area assignment
  const { cities, areas } = await this.resolveCityAndAreaSelection(
    registerDto.cityIds,
    registerDto.areaIds ?? []
  );
  agent.visitAmount = registerDto.visitAmount
  agent.cities = cities;
  agent.areas = areas;

  await this.agentsRepository.save(agent);

  return { message: "Agent registered successfully." };
}

async getAgentWalletStats(agentId: number) {
  const agent = await this.agentsRepository.findOne({
    where: { user: { id: agentId } },
    relations: ['earnings', 'payments', 'walletTransactions']
  });

  if (!agent) {
    throw new NotFoundException('Agent not found');
  }

  // Calculate recent statistics
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentEarnings = await this.walletTransactionRepository
    .createQueryBuilder('wt')
    .where('wt.agent_id = :agentId', { agentId: agent.user.id })
    .andWhere('wt.transaction_type = :type', { type: 'earning' })
    .andWhere('wt.created_at >= :date', { date: thirtyDaysAgo })
    .select('SUM(wt.amount)', 'total')
    .getRawOne();

  const recentPayouts = await this.walletTransactionRepository
    .createQueryBuilder('wt')
    .where('wt.agent_id = :agentId', { agentId: agent.user.id })
    .andWhere('wt.transaction_type = :type', { type: 'payout' })
    .andWhere('wt.created_at >= :date', { date: thirtyDaysAgo })
    .select('SUM(wt.amount)', 'total')
    .getRawOne();

  return {
    agent: {
      id: agent.id,
      name: agent.user.fullName,
      walletBalance: agent.walletBalance,
      totalEarned: agent.totalEarned,
      totalPaid: agent.totalPaid,
      pendingPayouts: agent.pendingPayouts,
      completedAppointments: agent.completedAppointments,
      totalTransactions: agent.totalTransactions,
      lastPayoutDate: agent.lastPayoutDate,
    },
    statistics: {
      earningsLast30Days: parseFloat(recentEarnings.total) || 0,
      payoutsLast30Days: parseFloat(recentPayouts.total) || 0,
      availableForPayout: agent.walletBalance,
      averageEarningPerAppointment: agent.completedAppointments > 0
        ? agent.totalEarned / agent.completedAppointments
        : 0
    }
  };
}

// Admin creates manual payout for agent
async createManualPayout(
  agentId: number,
  amount: number,
  adminUser: User,
  notes?: string
) {
  return await this.agentsRepository.manager.transaction(async (transactionalEntityManager) => {
    // Find agent
    const agent = await transactionalEntityManager.findOne(Agent, {
      where: { id: agentId  },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    // Validate payout amount
    if (amount <= 0) {
      throw new BadRequestException('Payout amount must be greater than 0');
    }

    if (amount > agent.walletBalance) {
      throw new BadRequestException(
        `Insufficient wallet balance. Available: SAR ${agent.walletBalance}, Requested: SAR ${amount}`
      );
    }

    const oldWalletBalance = Number(agent.walletBalance);
    const newWalletBalance = oldWalletBalance - amount;

    // Update agent wallet
    agent.walletBalance = newWalletBalance;
    agent.totalPaid = Number(agent.totalPaid) + amount;
    agent.lastPayoutDate = new Date();
    agent.totalTransactions += 1;

    // Create AgentPayment record
    const payment = transactionalEntityManager.create(AgentPayment, {
      agent: agent.user,
      amount: amount,
      status: PaymentStatus.COMPLETED,
      paymentMethod: 'manual',
      notes: notes,
      paidAt: new Date(),
      processedBy: adminUser,
      balanceBefore: oldWalletBalance,
      balanceAfter: newWalletBalance,
    });

    // Create Wallet Transaction record
    const walletTransaction = transactionalEntityManager.create(WalletTransaction, {
      agent: agent.user,
      status: PaymentStatus.COMPLETED,
      transactionType: 'payout',
      amount: amount,
      balanceBefore: oldWalletBalance,
      balanceAfter: newWalletBalance,
      description: `Manual payout by admin`,
      agentPayment: payment,
      processedBy: adminUser,
      notes: notes || 'Manual payout processed by admin',
    });

    // Save all records
    await transactionalEntityManager.save(Agent, agent);
    const savedPayment = await transactionalEntityManager.save(AgentPayment, payment);
    await transactionalEntityManager.save(WalletTransaction, walletTransaction);

    return {
      payment: savedPayment,
      walletTransaction: walletTransaction,
      newBalance: newWalletBalance
    };
  });
}

// Get all payouts for admin dashboard
async getPayouts(page: number = 1, limit: number = 10, filters?: any) {
  const skip = (page - 1) * limit;

  const query = this.paymentRepo
    .createQueryBuilder('payment')
    .leftJoinAndSelect('payment.agent', 'agent')
    .leftJoinAndSelect('payment.processedBy', 'admin')
    .orderBy('payment.createdAt', 'DESC');

  if (filters?.status) {
    query.andWhere('payment.status = :status', { status: filters.status });
  }

  if (filters?.agentId) {
    query.andWhere('payment.agent_id = :agentId', { agentId: filters.agentId });
  }

  if (filters?.dateFrom && filters?.dateTo) {
    query.andWhere('payment.paid_at BETWEEN :dateFrom AND :dateTo', {
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    });
  }

  const [payments, total] = await query
    .skip(skip)
    .take(limit)
    .getManyAndCount();

  return {
    data: payments,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// Get payout summary for admin dashboard
async getPayoutSummary() {
  const totalPayouts = await this.paymentRepo
    .createQueryBuilder('payment')
    .select('SUM(payment.amount)', 'total')
    .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
    .getRawOne();

  const pendingPayouts = await this.agentsRepository
    .createQueryBuilder('agent')
    .select('SUM(agent.wallet_balance)', 'total')
    .getRawOne();

  const recentPayouts = await this.paymentRepo
    .createQueryBuilder('payment')
    .select('SUM(payment.amount)', 'total')
    .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
    .andWhere('payment.paid_at >= :date', {
      date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    })
    .getRawOne();

  return {
    totalPayouts: parseFloat(totalPayouts.total) || 0,
    pendingPayouts: parseFloat(pendingPayouts.total) || 0,
    recentPayouts: parseFloat(recentPayouts.total) || 0,
    totalAgents: await this.agentsRepository.count(),
  };
}

async updateAgentVisitAmount(
  agentId: number,
  visitAmount: number,
  adminUser: User,
  notes?: string
): Promise<Agent> {
  return await this.agentsRepository.manager.transaction(async (transactionalEntityManager) => {
    // Find agent
    const agent = await transactionalEntityManager.findOne(Agent, {
      where: { id: agentId },
      relations: ['user']
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }
    if(!agent.user){
      throw new NotFoundException('user not found');
    }

    // Validate visit amount
    if (visitAmount < 0) {
      throw new BadRequestException('Visit amount cannot be negative');
    }

    if (visitAmount > 10000) {
      throw new BadRequestException('Visit amount cannot exceed 10,000 SAR');
    }

    const oldVisitAmount = agent.visitAmount || 0;

    // Only update the visit amount
    agent.visitAmount = visitAmount;
    agent.updatedBy = adminUser;

    // Save agent
    const updatedAgent = await transactionalEntityManager.save(Agent, agent);

    // Send notification to agent
    setTimeout(async () => {
      try {
        await this.notificationsService.createNotification({
          userId: agent.user.id,
          type: NotificationType.SYSTEM,
          title: 'Visit Amount Updated',
          message: `Your visit commission amount has been updated from SAR ${oldVisitAmount} to SAR ${visitAmount}.`,
          channel: NotificationChannel.IN_APP,
        });
      } catch (error) {
        console.error('Failed to send notification:', error);
      }
    }, 0);

    return updatedAgent;
  });
}
}

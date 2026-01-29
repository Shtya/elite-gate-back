import { Injectable, NotFoundException } from '@nestjs/common';
import { ReviewsService } from '../reviews/reviews.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ReportSnapshot, ReportSnapshotType, Appointment, AgentPayment, User, Conversion, VisitorTracking, PropertyListingRequest, Property } from 'entities/global.entity';
import { GenerateReportDto, ReportQueryDto, AgentPerformanceQueryDto, MarketingPerformanceQueryDto } from '../../dto/reports.dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(ReportSnapshot)
    public readonly reportSnapshotsRepository: Repository<ReportSnapshot>, // 👈 expose
    @InjectRepository(Appointment)
    private appointmentsRepository: Repository<Appointment>,
    @InjectRepository(AgentPayment)
    private paymentsRepository: Repository<AgentPayment>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Conversion)
    private conversionsRepository: Repository<Conversion>,
    @InjectRepository(VisitorTracking)
    private visitorTrackingRepository: Repository<VisitorTracking>,
    @InjectRepository(Property)
    private propertyRepository: Repository<Property>,
    private readonly reviewsService: ReviewsService,
  ) {}

  async generateReport(generateReportDto: GenerateReportDto): Promise<ReportSnapshot> {
    const { type, periodStart, periodEnd } = generateReportDto;

    let payload: any = {};

    switch (type) {
      case ReportSnapshotType.ADMIN_DASHBOARD:
        payload = await this.generateAdminDashboardData(periodStart, periodEnd);
        break;
      case ReportSnapshotType.AGENT_PERFORMANCE:
        payload = await this.generateAgentPerformanceData(periodStart, periodEnd);
        break;
      case ReportSnapshotType.MARKETING_PERFORMANCE:
        payload = await this.generateMarketingPerformanceData(periodStart, periodEnd);
        break;
      case ReportSnapshotType.FINANCIAL:
        payload = await this.generateFinancialData(periodStart, periodEnd);
        break;
    }

    const snapshot = this.reportSnapshotsRepository.create({
      type,
      periodStart,
      periodEnd,
      payload,
      generatedAt: new Date(),
    });

    return this.reportSnapshotsRepository.save(snapshot);
  }
 

  async getReportSnapshot(id: number): Promise<ReportSnapshot> {
    const snapshot = await this.reportSnapshotsRepository.findOne({ where: { id } });
    if (!snapshot) {
      throw new NotFoundException('Report snapshot not found');
    }
    return snapshot;
  }

  async getAdminDashboard(): Promise<any> {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    return {
      overview: await this.generateAdminDashboardData(startOfMonth.toISOString(), today.toISOString()),
      comparison: await this.generateAdminDashboardData(startOfLastMonth.toISOString(), endOfLastMonth.toISOString()),
    };
  }

  async getAgentPerformance(query: AgentPerformanceQueryDto): Promise<any> {
    const { agentId, startDate, endDate } = query;
    return this.generateAgentPerformanceData(startDate, endDate, agentId);
  }

  async getMarketingPerformance(query: MarketingPerformanceQueryDto): Promise<any> {
    const { marketerId, startDate, endDate } = query;
    return this.generateMarketingPerformanceData(startDate, endDate, marketerId);
  }

  async getFinancialOverview(query: ReportQueryDto): Promise<any> {
    const { startDate, endDate } = query;
    return this.generateFinancialData(startDate, endDate);
  }

  async getAgentSummary(agentId: number, query: AgentPerformanceQueryDto): Promise<any> {
    const { startDate, endDate } = query;
    
    const agent = await this.usersRepository.findOne({ where: { id: agentId } });
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const appointments = await this.appointmentsRepository.find({
      where: {
        agent: { id: agentId },
        appointmentDate: Between(new Date(startDate), new Date(endDate)),
      },
    } as any );

    const payments = await this.paymentsRepository.find({
      where: {
        agent: { id: agentId },
        status: 'completed',
        paidAt: Between(new Date(startDate), new Date(endDate)),
      },
    }as any);

    const totalEarnings = payments.reduce((sum, payment) => sum + parseFloat(payment.amount.toString()), 0);
    const completedAppointments = appointments.filter(apt => apt.status === 'completed').length;

    return {
      agent: {
        id: agent.id,
        name: agent.fullName,
      },
      period: { startDate, endDate },
      appointments: {
        total: appointments.length,
        completed: completedAppointments,
        completionRate: appointments.length > 0 ? (completedAppointments / appointments.length * 100).toFixed(2) + '%' : '0%',
      },
      earnings: {
        total: totalEarnings,
        averagePerAppointment: completedAppointments > 0 ? (totalEarnings / completedAppointments).toFixed(2) : 0,
      },
    };
  }

  private async generateAdminDashboardData(startDate: string, endDate: string): Promise<any> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const [
      totalUsers,
      totalAgents,
      totalAppointments,
      completedAppointments,
      totalProperties,
      totalRevenue,
      visitorStats,
      topAgents,
    ]: any = await Promise.all([
      this.usersRepository.count({ where: { createdAt: Between(start, end) } }),
      this.usersRepository.count({ where: { userType: 'agent', createdAt: Between(start, end) } } as any),
      this.appointmentsRepository.count({ where: { createdAt: Between(start, end) } }),
      this.appointmentsRepository.count({ where: { status: 'completed', createdAt: Between(start, end) } } as any),
      this.propertyRepository.count({ where: {  createdAt: Between(start, end) } }),
      this.getTotalRevenue(start, end),
      this.getVisitorStats(start, end),
      this.reviewsService.getTopRatedAgents(5),
    ]);

    return {
      period: { startDate, endDate },
      userStats: { totalUsers, totalAgents },
      appointmentStats: { totalAppointments, completedAppointments },
      propertyStats: { totalProperties },
      financialStats: { totalRevenue },
      marketingStats: visitorStats,
      topAgents,
    };
  }

  private async generateAgentPerformanceData(startDate: string, endDate: string, agentId?: number): Promise<any> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const where: any = {
      appointmentDate: Between(start, end),
    };
    if (agentId) {
      where.agent = { id: agentId };
    }

    const appointments = await this.appointmentsRepository.find({
      where,
      relations: ['agent'],
    });

    // Group by agent and calculate metrics
    const agentPerformance = appointments.reduce((acc, appointment) => {
      if (!appointment.agent) return acc;

      const agentId = appointment.agent.id;
      if (!acc[agentId]) {
        acc[agentId] = {
          agent: appointment.agent,
          totalAppointments: 0,
          completedAppointments: 0,
          cancelledAppointments: 0,
        };
      }

      acc[agentId].totalAppointments++;
      if (appointment.status === 'completed') {
        acc[agentId].completedAppointments++;
      } else if (appointment.status === 'cancelled') {
        acc[agentId].cancelledAppointments++;
      }

      return acc;
    }, {});

    return {
      period: { startDate, endDate },
      agentPerformance: Object.values(agentPerformance),
    };
  }

  private async generateMarketingPerformanceData(startDate: string, endDate: string, marketerId?: number): Promise<any> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const where: any = { createdAt: Between(start, end) };
    if (marketerId) {
      where.marketer = { id: marketerId };
    }

    const [visitors, conversions] = await Promise.all([
      this.visitorTrackingRepository.find({ where, relations: ['marketer'] }),
      this.conversionsRepository.find({ where, relations: ['marketer', 'visitor'] }),
    ]);

    const conversionRate = visitors.length > 0 ? (conversions.length / visitors.length * 100).toFixed(2) + '%' : '0%';

    return {
      period: { startDate, endDate },
      visitors: visitors.length,
      conversions: conversions.length,
      conversionRate,
      sources: this.analyzeTrafficSources(visitors),
    };
  }

  private async generateFinancialData(startDate: string, endDate: string): Promise<any> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const payments = await this.paymentsRepository.find({
      where: {
        paidAt: Between(start, end),
        status: 'completed',
      },
    }as any);

    const totalRevenue = payments.reduce((sum, payment) => sum + parseFloat(payment.amount.toString()), 0);
    const revenueByGateway = this.analyzeRevenueByGateway(payments);

    return {
      period: { startDate, endDate },
      totalRevenue,
      revenueByGateway,
      paymentCount: payments.length,
      averagePayment: payments.length > 0 ? (totalRevenue / payments.length).toFixed(2) : 0,
    };
  }

  private async getTotalRevenue(start: Date, end: Date): Promise<number> {
    const { total } = await this.paymentsRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where('payment.paid_at BETWEEN :start AND :end', { start, end })
      .andWhere('payment.status = :status', { status: 'completed' })
      .getRawOne();

    return parseFloat(total) || 0;
  }

  private async getVisitorStats(start: Date, end: Date): Promise<any> {
    const totalVisitors = await this.visitorTrackingRepository.count({
      where: { createdAt: Between(start, end) },
    });

    const totalConversions = await this.conversionsRepository.count({
      where: { convertedAt: Between(start, end) },
    });

    return {
      totalVisitors,
      totalConversions,
      conversionRate: totalVisitors > 0 ? (totalConversions / totalVisitors * 100).toFixed(2) + '%' : '0%',
    };
  }

  private analyzeTrafficSources(visitors: any[]): any {
    const sources = visitors.reduce((acc, visitor) => {
      const source = visitor.source;
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});

    return sources;
  }

  private analyzeRevenueByGateway(payments: any[]): any {
    const byGateway = payments.reduce((acc, payment) => {
      const gateway = payment.gateway;
      acc[gateway] = (acc[gateway] || 0) + parseFloat(payment.amount.toString());
      return acc;
    }, {});

    return byGateway;
  }
}
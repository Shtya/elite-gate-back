import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, Between, MoreThanOrEqual, LessThanOrEqual, FindOptionsWhere } from 'typeorm';
import { User, Campaign, ReferralPartner, VisitorTracking, Conversion, VerificationStatus, UserType } from 'entities/global.entity';
import * as bcrypt from 'bcryptjs';
type ConversionType = 'registration' | 'appointment';

interface CreatePartnerDto {
  name: string;
  kind?: 'external' | 'internal';
  platform?: string;
  campaignId: number;
  baseShareUrl?: string;
  utm?: { utm_source?: string; utm_campaign?: string; utm_content?: string };
  email: string;
  passwordHash: string;

	  // NEW:
  visitRewardAmount?: number; // EGP/visit
  registrationRewardAmount?: number; // EGP/registration
  appointmentRewardAmount?: number; // EGP/booking
  purchaseSharePercent?: number; // % if property is bought
}

interface BuildShareUrlDto {
  baseShareUrl?: string;
  utm?: { utm_source?: string; utm_campaign?: string; utm_content?: string };
}

export interface TrackVisitorDto {
  visitedUrl: string;
  landingPage?: string;
  referralCode: string; // Required (نلتزم به)
  campaignId: number; // Required
  utmSource?: string;
  utmCampaign?: string;
  utmContent?: string;
  userAgent?: string;
  ipAddress?: string;
}

interface CreateConversionDto {
  userId: number;
  type: ConversionType;
  visitorId?: number;
  referralCode?: string;
  campaignId?: number; // اختياري، بنستنبطه من الزيارة غالبًا
}

@Injectable()
export class TrafficService {
  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    @InjectRepository(ReferralPartner)
    private readonly partnerRepo: Repository<ReferralPartner>,
    @InjectRepository(VisitorTracking)
    private readonly visitRepo: Repository<VisitorTracking>,
    @InjectRepository(Conversion)
    private readonly convRepo: Repository<Conversion>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // ============ Helpers ============
  private async ensureCampaign(id: number): Promise<Campaign> {
    const c = await this.campaignRepo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Campaign not found');
    return c;
  }
  private async incrementPartnerBalance(partner: ReferralPartner, delta: number) {
    if (!delta) return partner;
    const current = Number(partner.currentBalance || 0);
    partner.currentBalance = (current + delta).toFixed(2);
    return this.partnerRepo.save(partner);
  }
  private async ensurePartner(id: number): Promise<ReferralPartner> {
    const p = await this.partnerRepo.findOne({
      where: { user: { id } },
      relations: ['campaign'],
    });
    if (!p) throw new NotFoundException('Partner not found');
    return p;
  }

  private generateReferralCode(len = 6): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // بدون المتشابهات
    let out = '';
    for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  private async uniqueReferralCode(): Promise<string> {
    for (let i = 0; i < 5; i++) {
      const code = this.generateReferralCode(6);
      const exists = await this.partnerRepo.findOne({
        where: { referralCode: code },
      });
      if (!exists) return code;
    }
    throw new ConflictException('Failed to generate unique referral code');
  }

  private buildShareUrlBase(campaign: Campaign, baseShareUrl?: string): URL {
    const DEFAULT_ORIGIN = process.env.APP_PUBLIC_ORIGIN || 'https://your-frontend.com';
    const base = baseShareUrl || `${DEFAULT_ORIGIN}/landing`;
    try {
      return new URL(base); // absolute
    } catch {
      return new URL(base, DEFAULT_ORIGIN); // relative → prefix origin
    }
  }

  private buildShareUrlQuery(u: URL, params: Record<string, string | number | undefined | null>) {
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      u.searchParams.set(k, String(v));
    });
  }

  private toSlug(input?: string | null): string | undefined {
    if (!input) return undefined;
    return input
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/(^-|-$)/g, '');
  }
  private buildShareUrlInternal(partner: ReferralPartner, campaignOrOpts?: Campaign | { baseShareUrl?: string; utm?: Record<string, string | undefined> }, maybeOpts?: { baseShareUrl?: string; utm?: Record<string, string | undefined> }) {
    let campaign: Campaign | undefined;
    let opts: { baseShareUrl?: string; utm?: Record<string, string | undefined> } | undefined;

    if (campaignOrOpts && 'id' in campaignOrOpts) {
      campaign = campaignOrOpts as Campaign;
      opts = maybeOpts;
    } else {
      campaign = undefined;
      opts = campaignOrOpts as any;
    }

    const u = this.buildShareUrlBase(campaign, opts?.baseShareUrl);

    const utmSource = opts?.utm?.utm_source || partner.platform || (campaign as any)?.targetChannel || 'direct';

    const utmCampaign = opts?.utm?.utm_campaign || (campaign ? this.toSlug((campaign as any)?.name || (campaign as any)?.title) : 'general');

    this.buildShareUrlQuery(u, {
      ref: partner.referralCode,
      campaignId: campaign?.id,
      utm_source: utmSource,
      utm_campaign: utmCampaign,
      utm_content: opts?.utm?.utm_content,
    });

    return u.toString();
  }

  private getAttributionWindowDays(campaign: Campaign): number {
    const n = Number((campaign as any).attributionWindowDays ?? 60);
    return Number.isFinite(n) && n > 0 ? n : 60;
  }

  // ============ Partners ============
  // ... داخل TrafficService

  async createPartnerAndShareUrl(body: CreatePartnerDto) {
    const existUser = await this.userRepo.findOne({
      where: { email: body.email },
    });

    if (existUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Generate referral code
    const referralCode = await this.uniqueReferralCode();
    const passwordHash = await bcrypt.hash(body.passwordHash, 12);

    // 1️⃣ Create and save user first
    const user = this.userRepo.create({
      fullName: body.name,
      email: body.email,
      passwordHash,
      verificationStatus: VerificationStatus.VERIFIED,
      verifiedAt: new Date(),
      isActive: true,
      userType: UserType.MARKETER,
    });
    const savedUser = await this.userRepo.save(user);

    // 2️⃣ Create partner and associate user
    const partner = this.partnerRepo.create({
      name: body.name,
      platform: body.platform ?? null,
      referralCode,
      isActive: true,
      user: savedUser,
      userId: savedUser.id,

			 // NEW reward config (defaults)
      visitRewardAmount: (body.visitRewardAmount ?? 0).toFixed(2),
      registrationRewardAmount: (body.registrationRewardAmount ?? 0).toFixed(2),
      appointmentRewardAmount: (body.appointmentRewardAmount ?? 0).toFixed(2),
      purchaseSharePercent: (body.purchaseSharePercent ?? 0).toFixed(2),

      currentBalance: '0.00',
      totalWithdrawn: '0.00',
    });

    const savedPartner = await this.partnerRepo.save(partner);

    // 3️⃣ Generate and persist share URL
    const shareUrl = this.buildShareUrlInternal(savedPartner, {
      baseShareUrl: body.baseShareUrl,
    });
    savedPartner.shareUrl = shareUrl;
    await this.partnerRepo.save(savedPartner);

    return { partner: savedPartner, shareUrl };
  }

  async buildShareUrlForPartner(partnerId: number, body: BuildShareUrlDto) {
    const partner = await this.ensurePartner(partnerId);
    const campaign = await this.ensureCampaign((partner.campaign as any).id || partner.campaign);
    const shareUrl = this.buildShareUrlInternal(partner, campaign, {
      baseShareUrl: body.baseShareUrl,
      utm: body.utm,
    });
    return { shareUrl };
  }

  // (اختياري) إدارة بسيطة
  async listPartners(q: any) {
    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(q.limit) || 20));
    const where: FindOptionsWhere<ReferralPartner> = {};
    if (q.q) (where as any).name = ILike(`%${q.q}%`);
    if (typeof q.isActive !== 'undefined') (where as any).isActive = String(q.isActive) === 'true';
    if (q.campaignId) (where as any).campaign = { id: Number(q.campaignId) };

    const [items, total] = await this.partnerRepo.findAndCount({
      where,
      relations: ['campaign'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { page, limit, total, items };
  }
  async getpartnersbyId(id: number) {
    const partner = await this.partnerRepo.find({
      where: { user: { id } },
      relations: ['campaign'],
      order: { createdAt: 'DESC' },
    });
    return { partner };
  }
  async updatePartner(id: number, body: Partial<CreatePartnerDto>) {
    const partner = await this.ensurePartner(id);
    if (body.campaignId && body.campaignId !== (partner.campaign as any).id) {
      const camp = await this.ensureCampaign(body.campaignId);
      (partner as any).campaign = camp;
    }
    if (typeof body.name === 'string') partner.name = body.name;
    if (body.kind) partner.kind = body.kind;
    if (typeof body.platform !== 'undefined') partner.platform = body.platform || null;
    const saved = await this.partnerRepo.save(partner);

    // Update share URL after changes
    const shareUrl = this.buildShareUrlInternal(saved, (partner as any).campaign, {});
    saved.shareUrl = shareUrl;
    await this.partnerRepo.save(saved);

    return { partner: saved, shareUrl };
  }

  async deletePartner(id: number) {
    const partner = await this.ensurePartner(id);
    await this.partnerRepo.remove(partner);
    return { deleted: true };
  }
  async trackVisitor(dto: TrackVisitorDto, req?: any) {
    if (!dto.referralCode) throw new BadRequestException('referralCode is required');

    let ipAddress = dto.ipAddress;
    let userAgent = dto.userAgent;

    if (req && !ipAddress) {
      ipAddress = this.extractIpAddress(req);
    }
    if (req && !userAgent) {
      userAgent = req.headers['user-agent'];
    }

    const partner = await this.partnerRepo.findOne({
      where: { referralCode: dto.referralCode, isActive: true },
      relations: ['campaign'],
    });

    if (!partner) throw new NotFoundException('Partner (by referralCode) not found or inactive');

    // ✅ Check for duplicate visits from same IP within last 24 hours
    if (ipAddress) {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const existingVisit = await this.visitRepo.findOne({
        where: {
          ipAddress: ipAddress,
          referralCode: dto.referralCode,
          createdAt: MoreThanOrEqual(twentyFourHoursAgo),
        },
        order: { createdAt: 'DESC' },
      });

      if (existingVisit) {
        // Return existing visit ID instead of creating duplicate
        return {
          visitorId: existingVisit.id,
          ipAddress: existingVisit.ipAddress,
          userAgent: existingVisit.userAgent,
          isDuplicate: true,
          previousVisitAt: existingVisit.createdAt,
        };
      }
    }

    // ✅ Try to resolve campaign (optional)
    let campaign: Campaign | null = null;
    const partnerCampaignId = (partner.campaign as any)?.id || partner.campaign;

    if (dto.campaignId) {
      try {
        campaign = await this.ensureCampaign(dto.campaignId);

        // Optional consistency check
        if (partnerCampaignId && partnerCampaignId !== dto.campaignId) {
          throw new BadRequestException('referralCode does not belong to the given campaignId');
        }
      } catch {
        // ignore if invalid campaignId — tracking still continues
        campaign = null;
      }
    } else if (partner.campaign) {
      // Use partner's linked campaign if available
      campaign = partner.campaign;
    }

    // ✅ Build safe UTM values (without assuming campaign exists)
    const utmSource = dto.utmSource || partner.platform || ((campaign as any)?.targetChannel ?? 'direct');

    const utmCampaign = dto.utmCampaign || this.toSlug((campaign as any)?.name || (campaign as any)?.title || 'general') || null;

    // ✅ Create visit even if campaign is null
    const visit = this.visitRepo.create({
      visitedUrl: dto.visitedUrl,
      landingPage: dto.landingPage ?? null,
      utmSource,
      utmCampaign,
      utmContent: dto.utmContent ?? null,
      userAgent: userAgent ?? null,
      ipAddress: ipAddress ?? null,
      referralCode: dto.referralCode,
      partner,
      campaign: campaign ?? null, // ✅ allow null
    });

    const saved = await this.visitRepo.save(visit);

    const perVisit = Number(partner.visitRewardAmount || 0);
    if (perVisit > 0) {
      await this.incrementPartnerBalance(partner, perVisit);
    }
    return {
      visitorId: saved.id,
      ipAddress: saved.ipAddress,
      userAgent: saved.userAgent,
      isDuplicate: false,
    };
  }

  // Helper method to extract IP address from request
  private extractIpAddress(req: any): string | null {
    const headers = ['x-forwarded-for', 'x-real-ip', 'x-client-ip', 'cf-connecting-ip', 'true-client-ip', 'x-cluster-client-ip'];

    for (const header of headers) {
      const ip = req.headers[header];
      if (ip) {
        return Array.isArray(ip) ? ip[0] : ip.split(',')[0].trim();
      }
    }

    return req.connection?.remoteAddress || req.socket?.remoteAddress || null;
  }
  // ============ Conversions ============
  async createConversion(dto: CreateConversionDto, userId: number) {
    if (!userId) throw new BadRequestException('userId is required');
    if (!dto.type) throw new BadRequestException('type is required');
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    let visit: VisitorTracking | null = null;

    if (dto.visitorId) {
      visit = await this.visitRepo.findOne({
        where: { id: dto.visitorId },
        relations: ['partner', 'campaign'],
      });
      if (!visit) throw new NotFoundException('Visitor not found');
    } else if (dto.referralCode) {
      // Resolve by ref within campaign window
      // campaignId اختياري؛ لو مش موجود هنحاول ناخده من آخر زيارة لنفس ref
      let campaign: Campaign | null = null;

      if (dto.campaignId) {
        campaign = await this.ensureCampaign(dto.campaignId);
      }

      // آخر زيارة بنفس ref (ولو فيه campaignId نقيّد عليها)
      const where: FindOptionsWhere<VisitorTracking> = {
        referralCode: dto.referralCode,
      };
      if (campaign) (where as any).campaign = { id: campaign.id };

      visit = await this.visitRepo.findOne({
        where,
        relations: ['partner', 'campaign'],
        order: { createdAt: 'DESC' },
      });

      if (!visit) throw new NotFoundException('No visit found for referralCode');
      campaign = visit.campaign;

      // نافذة الإسناد من الحملة
      const days = this.getAttributionWindowDays(campaign);
      const since = new Date();
      since.setDate(since.getDate() - days);
      if (visit.createdAt < since) {
        throw new BadRequestException('Visit is outside the campaign attribution window');
      }
    } else {
      throw new BadRequestException('Provide visitorId or referralCode');
    }

    // Idempotency: منع تكرار نفس التحويل لنفس اليوم
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const existing = await this.convRepo.findOne({
      where: {
        user: { id: user.id },
        type: dto.type as any,
        convertedAt: Between(start, end),
      },
    });
    if (existing) return existing;

    const conv = this.convRepo.create({
      user,
      type: dto.type as any,
      visitor: visit,
      partner: visit.partner,
      campaign: visit.campaign,
      referralCode: visit.referralCode,
      convertedAt: new Date(),
    });

    const savedConv = await this.convRepo.save(conv);

    // NEW: add reward by type
    const partner = visit.partner;
    if (partner) {
      let reward = 0;
      if (dto.type === 'registration') {
        reward = Number(partner.registrationRewardAmount || 0);
      } else if (dto.type === 'appointment') {
        reward = Number(partner.appointmentRewardAmount || 0);
      }
      if (reward > 0) {
        await this.incrementPartnerBalance(partner, reward);
      }
    }

    return savedConv;
  }

  // ============ Performance ============
  async getPartnerPerformance(partnerId: number, q: { startDate?: string; endDate?: string }) {
    const partner = await this.ensurePartner(partnerId);

    // Campaign is optional
    const campaignId = partner.campaign ? (partner.campaign as any).id || partner.campaign : undefined;
    const campaign = campaignId ? await this.ensureCampaign(campaignId) : undefined;

    const start = q.startDate ? new Date(q.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = q.endDate ? new Date(q.endDate) : new Date();

    const [visits, regs, appts] = await Promise.all([
      this.visitRepo.find({
        where: { partner: { id: partner.id }, createdAt: Between(start, end) },
        select: ['id', 'createdAt'],
      }),
      this.convRepo.find({
        where: { partner: { id: partner.id }, type: 'registration' as any, convertedAt: Between(start, end) },
        select: ['id', 'convertedAt'],
      }),
      this.convRepo.find({
        where: { partner: { id: partner.id }, type: 'appointment' as any, convertedAt: Between(start, end) },
        select: ['id', 'convertedAt'],
      }),
    ]);

    const visitsByDay = visits.reduce<Record<string, number>>((acc, v) => {
      const d = v.createdAt.toISOString().slice(0, 10);
      acc[d] = (acc[d] || 0) + 1;
      return acc;
    }, {});

    const regsByDay = regs.reduce<Record<string, number>>((acc, v) => {
      const d = v.convertedAt.toISOString().slice(0, 10);
      acc[d] = (acc[d] || 0) + 1;
      return acc;
    }, {});

    const apptsByDay = appts.reduce<Record<string, number>>((acc, v) => {
      const d = v.convertedAt.toISOString().slice(0, 10);
      acc[d] = (acc[d] || 0) + 1;
      return acc;
    }, {});

    const totalVisitors = visits.length;
    const totalRegistrations = regs.length;
    const totalAppointments = appts.length;
    const conversionRate = totalVisitors ? `${((totalRegistrations / totalVisitors) * 100).toFixed(2)}%` : '0%';

    const visitReward = Number(partner.visitRewardAmount || 0);
    const regReward = Number(partner.registrationRewardAmount || 0);
    const apptReward = Number(partner.appointmentRewardAmount || 0);

    const estVisitEarnings = totalVisitors * visitReward;
    const estRegEarnings = totalRegistrations * regReward;
    const estApptEarnings = totalAppointments * apptReward;
    const estTotalEarnings = estVisitEarnings + estRegEarnings + estApptEarnings;

    return {
      partner: {
        id: partner.id,
        name: partner.name,
        platform: partner.platform,
        referralCode: partner.referralCode,
        campaignId: campaignId,
        isActive: partner.isActive,
        currentBalance: partner.currentBalance,
        totalWithdrawn: partner.totalWithdrawn,
      },
      campaign: campaign
        ? {
            id: campaign.id,
            name: (campaign as any).name,
            defaultChannel: (campaign as any).defaultChannel,
            defaultUtmSource: (campaign as any).defaultUtmSource,
            attributionWindowDays: this.getAttributionWindowDays(campaign),
          }
        : null,
      metrics: {
        visits: totalVisitors,
        registrations: totalRegistrations,
        appointments: totalAppointments,
        conversionRate,
        // NEW
        estVisitEarnings,
        estRegistrationEarnings: estRegEarnings,
        estAppointmentEarnings: estApptEarnings,
        estTotalEarnings,
      },
      series: {
        visitsByDay,
        registrationsByDay: regsByDay,
        appointmentsByDay: apptsByDay,
      },
      status: {
        active: partner.isActive,
        healthFlags: [],
      },
      period: { startDate: start.toISOString(), endDate: end.toISOString() },
    };
  }

  async adjustPartnerBalance(partnerId: number, amount: number) {
    if (!Number.isFinite(amount)) {
      throw new BadRequestException('amount must be a valid number');
    }
    const partner = await this.ensurePartner(partnerId);
    const current = Number(partner.currentBalance || 0);
    partner.currentBalance = (current + amount).toFixed(2);
    await this.partnerRepo.save(partner);

    return {
      partnerId: partner.id,
      currentBalance: Number(partner.currentBalance),
      totalWithdrawn: Number(partner.totalWithdrawn || 0),
    };
  }

  async createPartnerWithdrawal(partnerId: number, amount: number) {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Invalid withdrawal amount. Please enter a positive numeric value.');
    }

    const partner = await this.ensurePartner(partnerId);

    const current = Number(partner.currentBalance || 0);

    if (amount > current) {
      throw new BadRequestException(`Withdrawal request exceeds available balance. Your current balance is ${current.toFixed(2)} EGP.`);
    }

    const newBalance = current - amount;
    partner.currentBalance = newBalance.toFixed(2);

    const totalWithdrawn = Number(partner.totalWithdrawn || 0);
    partner.totalWithdrawn = (totalWithdrawn + amount).toFixed(2);

    const saved = await this.partnerRepo.save(partner);

    return {
      message: 'Withdrawal processed successfully.',
      partnerId: partner.id,
      withdrawnAmount: amount,
      newBalance: Number(partner.currentBalance),
      totalWithdrawn: Number(partner.totalWithdrawn),
    };
  }
}

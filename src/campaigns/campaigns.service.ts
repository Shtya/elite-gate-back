import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign, CampaignAudience, CampaignChannel, CampaignFrequency, CampaignImage, CampaignRunType, CampaignStatus, NotificationChannel, NotificationType, User, UserType } from 'entities/global.entity';
import { CreateCampaignDto, UpdateCampaignDto, CampaignQueryDto, CampaignImageDto } from '../../dto/campaigns.dto';
import { NotificationsService } from 'src/notifications/notifications.service';

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    public readonly campaignsRepository: Repository<Campaign>, // 👈 expose
    @InjectRepository(CampaignImage)
    private campaignImagesRepository: Repository<CampaignImage>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private notificationsService: NotificationsService,
  ) {}

  async create(createCampaignDto: CreateCampaignDto, userId: number): Promise<Campaign> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }
 
    const campaign = this.campaignsRepository.create({
      ...createCampaignDto,
			images: (createCampaignDto.images ?? []).map((url) => ({ imageUrl: url } as CampaignImage)),
      createdBy: user,
    });

    const savedCampaign: any = await this.campaignsRepository.save(campaign);

    // Save images if provided
    if (createCampaignDto.images && createCampaignDto.images.length > 0) {
      const images: any = createCampaignDto.images.map(imageUrl =>
        this.campaignImagesRepository.create({
          campaign: savedCampaign,
          imageUrl,
        } as any),
      );
      await this.campaignImagesRepository.save(images);
    }

    // Notify the admin about a new campaign
    await this.notificationsService.notifyUserType(UserType.ADMIN, {
      type: NotificationType.CAMPAIGN,
      title: 'New Campaign Added',
      message: `A new campaign "${savedCampaign.name}" has been created and requires approval.`,
      relatedId: savedCampaign.id,
      channel: NotificationChannel.IN_APP,
    });

    return this.findOne(savedCampaign.id);
  }

  async findAll(query: CampaignQueryDto): Promise<{ data: Campaign[]; total: number }> {
    const { status, targetChannel, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (targetChannel) where.targetChannel = targetChannel;

    const [data, total] = await this.campaignsRepository.findAndCount({
      where,
      relations: ['createdBy', 'images'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total };
  }

  async findOne(id: number): Promise<Campaign> {
    const campaign = await this.campaignsRepository.findOne({
      where: { id },
      relations: ['createdBy', 'images'],
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return campaign;
  }

  async update(id: number, updateCampaignDto: UpdateCampaignDto): Promise<Campaign> {
    const campaign = await this.findOne(id);
    Object.assign(campaign, updateCampaignDto);
    return this.campaignsRepository.save(campaign);
  }

  async remove(id: number): Promise<void> {
    const campaign = await this.findOne(id);
    await this.campaignsRepository.remove(campaign);
  }

  async startCampaign(id: number): Promise<Campaign> {
    const campaign = await this.findOne(id);

    if (campaign.status !== CampaignStatus.DRAFT && campaign.status !== CampaignStatus.PAUSED) {
      throw new BadRequestException('Campaign can only be started from draft or paused status');
    }

    campaign.status = CampaignStatus.RUNNING;
    // Notify marketers about campaign start
    await this.notificationsService.notifyUserType(UserType.MARKETER, {
      type: NotificationType.CAMPAIGN,
      title: 'New Campaign Started',
      message: `The campaign "${campaign.name}" has been launched.`,
      relatedId: campaign.id,
      channel: NotificationChannel.IN_APP,
    });

    // Notify the admin about campaign start
    await this.notificationsService.notifyUserType(UserType.ADMIN, {
      type: NotificationType.CAMPAIGN,
      title: 'Campaign Launched Successfully',
      message: `The campaign "${campaign.name}" has been successfully launched.`,
      relatedId: campaign.id,
      channel: NotificationChannel.IN_APP,
    });

    return this.campaignsRepository.save(campaign);
  }

  async pauseCampaign(id: number): Promise<Campaign> {
    const campaign = await this.findOne(id);

    if (campaign.status !== CampaignStatus.RUNNING) {
      throw new BadRequestException('Only running campaigns can be paused');
    }

    campaign.status = CampaignStatus.PAUSED;
    return this.campaignsRepository.save(campaign);
  }

  async stopCampaign(id: number): Promise<Campaign> {
    const campaign = await this.findOne(id);

    if (campaign.status === CampaignStatus.COMPLETED || campaign.status === CampaignStatus.CANCELLED) {
      throw new BadRequestException('Campaign is already stopped');
    }

    campaign.status = CampaignStatus.CANCELLED;
    return this.campaignsRepository.save(campaign);
  }

  async addImage(id: number, imageDto: CampaignImageDto): Promise<CampaignImage> {
    const campaign = await this.findOne(id);

    const image = this.campaignImagesRepository.create({
      ...imageDto,
      campaign,
    });

    return this.campaignImagesRepository.save(image);
  }

  async getCampaignAnalytics(id: number): Promise<any> {
    const campaign = await this.findOne(id);

    // This would typically involve more complex analytics
    return {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      actualRecipients: campaign.actualRecipients || 0,
      views: campaign.views || 0,
      responses: campaign.responses || 0,
      engagementRate: campaign.actualRecipients ? (((campaign.responses || 0) / campaign.actualRecipients) * 100).toFixed(2) + '%' : '0%',
    };
  }
}

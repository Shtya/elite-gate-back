import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Req } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto, UpdateNotificationDto, NotificationQueryDto, SendNotificationDto } from '../../dto/notifications.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserType } from 'entities/global.entity';
import { CRUD } from 'common/crud.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @Roles(UserType.ADMIN)
  create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationsService.create(createNotificationDto);
  }

  @Get()
  @Roles(UserType.ADMIN,UserType.AGENT)
  findAll(@Query() query: any) {
    const filters: Record<string, any> = {};
    if (query.userId) filters.user = { id: Number(query.userId) };
    if (query.type) filters.type = query.type;
    if (query.status) filters.status = query.status;
    if (query.channel) filters.channel = query.channel;

    return CRUD.findAll(
      this.notificationsService.notificationsRepository, // repo
      'notification', // alias
      query.q || query.search, // search
      query.page, // page
      query.limit, // limit
      query.sortBy ?? 'createdAt', // sortBy
      query.sortOrder ?? 'DESC', // sortOrder
      ['user'], // relations
      ['title', 'message'], // searchFields on root columns
      filters, // filters (no ranges)
    );
  }

  @Get('my')
  async getMyNotifications(@Query() query: any, @Req() req: any) {
    const repository = this.notificationsService.notificationsRepository;
    const userId = Number(req?.user?.id);
  
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
  
    const qb = repository.createQueryBuilder('notification')
      .leftJoinAndSelect('notification.user', 'user')
      .where('user.id = :userId', { userId })
      .skip(skip)
      .take(limit)
      .orderBy('notification.createdAt', query.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC');
  
    // Optional filters
    if (query.type) {
      qb.andWhere('notification.type = :type', { type: query.type });
    }
  
    if (query.status) {
      qb.andWhere('notification.status = :status', { status: query.status });
    }
  
    if (query.channel) {
      qb.andWhere('notification.channel = :channel', { channel: query.channel });
    }
  
    // Search by title or message
    if (query.q || query.search) {
      const search = `%${query.q || query.search}%`;
      qb.andWhere('(notification.title ILIKE :search OR notification.message ILIKE :search)', { search });
    }
  
    const [records, total] = await qb.getManyAndCount();
  
    return {
      total_records: total,
      current_page: page,
      per_page: limit,
      records,
    };
  }
  

  @Get(':id')
  @Roles(UserType.ADMIN)
  findOne(@Param('id') id: string) {
    return this.notificationsService.findOne(+id);
  }

  @Patch(':id')
  @Roles(UserType.ADMIN)
  update(@Param('id') id: string, @Body() updateNotificationDto: UpdateNotificationDto) {
    return this.notificationsService.update(+id, updateNotificationDto);
  }

  @Delete(':id')
  @Roles(UserType.ADMIN)
  remove(@Param('id') id: string) {
    return this.notificationsService.remove(+id);
  }

  @Post('send')
  @Roles(UserType.ADMIN)
  sendNotification(@Body() sendNotificationDto: SendNotificationDto) {
    return this.notificationsService.sendImmediate(sendNotificationDto);
  }

  @Post(':id/mark-read')
  markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(+id);
  }

  @Post('mark-all-read')
  markAllAsRead() {
    const userId = 1; // Replace with actual user ID from token
    return this.notificationsService.markAllAsRead(userId);
  }
}

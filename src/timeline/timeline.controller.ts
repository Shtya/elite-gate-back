import { Controller, Get, Post, Body, Query, UseGuards, Param } from '@nestjs/common';
import { TimelineService } from './timeline.service';
import { CreateTimelineEventDto, TimelineQueryDto } from '../../dto/timeline.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserType } from 'entities/global.entity';
import { CRUD } from 'common/crud.service';

@Controller('timeline')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TimelineController {
  constructor(private readonly timelineService: TimelineService) {}

  @Post()
  @Roles(UserType.ADMIN, UserType.AGENT, UserType.QUALITY)
  create(@Body() createTimelineEventDto: CreateTimelineEventDto) {
    return this.timelineService.create(createTimelineEventDto);
  }

  @Get()
  @Roles(UserType.ADMIN, UserType.AGENT, UserType.QUALITY, UserType.CUSTOMER)
  findAll(@Query() query: any) {
    const filters: Record<string, any> = {};
    if (query.customerId) filters.customer = { id: Number(query.customerId) };
    if (query.eventType) filters.eventType = query.eventType;

    return CRUD.findAll(
      this.timelineService.timelineEventsRepository, // repo
      'customer_timeline_event', // alias for QB
      query.q || query.search, // search (optional)
      query.page, // page
      query.limit, // limit
      query.sortBy ?? 'createdAt', // sortBy
      query.sortOrder ?? 'DESC', // sortOrder
      ['customer', 'actorUser'], // relations
      ['notes', 'eventType', 'relatedTable'], // searchFields (root columns)
      filters, // filters
    );
  }

  // ✅ Also use CRUD.findAll with fixed customerId
  @Get('customer/:customerId')
  @Roles(UserType.ADMIN, UserType.AGENT, UserType.QUALITY, UserType.CUSTOMER)
  findByCustomer(@Param('customerId') customerId: string, @Query() query: any) {
    const filters: Record<string, any> = {
      customer: { id: Number(customerId) },
    };
    if (query.eventType) filters.eventType = query.eventType;

    return CRUD.findAll(
      this.timelineService.timelineEventsRepository,
      'customer_timeline_event',
      query.q || query.search,
      query.page,
      query.limit ?? 50, // keep your previous default
      query.sortBy ?? 'createdAt',
      query.sortOrder ?? 'DESC',
      ['actorUser'],
      ['notes', 'eventType', 'relatedTable'],
      filters,
    );
  }

  @Post('appointment/:appointmentId/status-change')
  @Roles(UserType.ADMIN, UserType.AGENT)
  logAppointmentStatusChange(@Param('appointmentId') appointmentId: string, @Body('oldStatus') oldStatus: string, @Body('newStatus') newStatus: string, @Body('notes') notes?: string) {
    return this.timelineService.logAppointmentStatusChange(+appointmentId, oldStatus, newStatus, notes);
  }

  @Post('customer/:customerId/registration')
  @Roles(UserType.ADMIN)
  logCustomerRegistration(@Param('customerId') customerId: string) {
    return this.timelineService.logCustomerRegistration(+customerId);
  }
}

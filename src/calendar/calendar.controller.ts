import { Controller, Get, Post, Body, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { ConnectCalendarAccountDto, SyncAppointmentDto, CalendarQueryDto } from '../../dto/calendar.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserType } from 'entities/global.entity';
import { CRUD } from 'common/crud.service';

@Controller('calendar')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Post('connect')
  @Roles(UserType.AGENT, UserType.ADMIN)
  connectAccount(@Body() connectCalendarAccountDto: ConnectCalendarAccountDto) {
    return this.calendarService.connectAccount(connectCalendarAccountDto);
  }

  @Get('accounts')
  @Roles(UserType.AGENT, UserType.ADMIN)
  getAccounts(@Query() query: any) {
    const filters: Record<string, any> = {};
    if (query.provider) filters.provider = query.provider; // enum CalendarProvider
    if (query.userId) filters.user = { id: Number(query.userId) }; // nested filter

    return CRUD.findAll(
      this.calendarService.calendarAccountRepository, // repo
      'calendar_account', // alias used by QB
      query.q || query.search, // search term
      query.page, // page
      query.limit, // limit
      query.sortBy ?? 'createdAt', // sortBy
      query.sortOrder ?? 'DESC', // sortOrder
      ['user'], // relations
      ['provider', 'email', 'accountLabel'], // searchFields on root columns (adjust to your entity)
      filters, // equality/nested filters only
    );
  }

  @Get('accounts/:id')
  @Roles(UserType.AGENT, UserType.ADMIN)
  getAccount(@Param('id') id: string) {
    return this.calendarService.getAccount(+id);
  }

  @Delete('accounts/:id')
  @Roles(UserType.AGENT, UserType.ADMIN)
  disconnectAccount(@Param('id') id: string) {
    return this.calendarService.disconnectAccount(+id);
  }

  @Post('sync/appointment')
  @Roles(UserType.AGENT, UserType.ADMIN)
  syncAppointment(@Body() syncAppointmentDto: SyncAppointmentDto) {
    return this.calendarService.syncAppointment(syncAppointmentDto);
  }

  @Get('sync/appointment/:appointmentId')
  @Roles(UserType.AGENT, UserType.ADMIN)
  getAppointmentSync(@Param('appointmentId') appointmentId: string) {
    return this.calendarService.getAppointmentSync(+appointmentId);
  }

  @Post('sync/refresh-tokens')
  @Roles(UserType.ADMIN)
  refreshTokens() {
    return this.calendarService.refreshExpiredTokens();
  }
}

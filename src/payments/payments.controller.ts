import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, UpdatePaymentDto, ProcessPaymentDto, PaymentQueryDto } from '../../dto/payments.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserType } from 'entities/global.entity';
import { CRUD } from 'common/crud.service';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Roles(UserType.ADMIN)
  create(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.create(createPaymentDto);
  }

  @Get()
  @Roles(UserType.ADMIN, UserType.AGENT)
  findAll(@Query() query: any) {
    const filters: Record<string, any> = {};
    if (query.agentId) filters.agent = { id: Number(query.agentId) };
    if (query.status)  filters.status = query.status;
    if (query.gateway) filters.gateway = query.gateway;

    return CRUD.findAll(
      this.paymentsService.paymentsRepository,  // repo
      'agent_payment',                          // alias (must match your QB alias)
      query.q || query.search,                  // search
      query.page,                               // page
      query.limit,                              // limit
      query.sortBy ?? 'createdAt',              // sortBy
      query.sortOrder ?? 'DESC',                // sortOrder
      ['appointment', 'agent', 'updatedBy'],    // relations
      [],                                       // searchFields (add root cols if desired)
      filters,                                  // equality filters
    );
  }

  @Get(':id')
  @Roles(UserType.ADMIN, UserType.AGENT)
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(+id);
  }

  @Patch(':id')
  @Roles(UserType.ADMIN)
  update(@Param('id') id: string, @Body() updatePaymentDto: UpdatePaymentDto) {
    return this.paymentsService.update(+id, updatePaymentDto);
  }

  // @Post(':id/process')
  // @Roles(UserType.ADMIN)
  // processPayment(@Param('id') id: string, @Body() processPaymentDto: ProcessPaymentDto) {
  //   return this.paymentsService.processPayment(+id, processPaymentDto);
  // }

  @Post(':id/complete')
  @Roles(UserType.ADMIN)
  completePayment(@Param('id') id: string) {
    return this.paymentsService.completePayment(+id);
  }

  @Get('agent/:agentId/balance')
  @Roles(UserType.ADMIN, UserType.AGENT)
  getAgentBalance(@Param('agentId') agentId: string) {
    return this.paymentsService.getAgentBalance(+agentId);
  }

   @Get('agent/:agentId/payments')
  @Roles(UserType.ADMIN, UserType.AGENT)
  getAgentPayments(@Param('agentId') agentId: string, @Query() query: any) {
    const filters: Record<string, any> = { agent: { id: Number(agentId) } };
    if (query.status)  filters.status = query.status;
    if (query.gateway) filters.gateway = query.gateway;

    return CRUD.findAll(
      this.paymentsService.paymentsRepository,  // repo
      'agent_payment',                          // alias
      query.q || query.search,                  // search
      query.page,                               // page
      query.limit,                              // limit
      query.sortBy ?? 'createdAt',              // sortBy
      query.sortOrder ?? 'DESC',                // sortOrder
      ['appointment', 'updatedBy'],             // relations (agent is implied by filter)
      [],                                       // searchFields
      filters,                                  // filters
    );
  }
}
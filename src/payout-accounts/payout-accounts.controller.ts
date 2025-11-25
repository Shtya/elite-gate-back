import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { PayoutAccountsService } from './payout-accounts.service';
import { CreatePayoutAccountDto, UpdatePayoutAccountDto } from '../../dto/payout-accounts.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserType } from 'entities/global.entity';
import { CRUD } from 'common/crud.service';

@Controller('payout-accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PayoutAccountsController {
  constructor(private readonly payoutAccountsService: PayoutAccountsService) {}

  @Get()
  @Roles(UserType.ADMIN)
  findAll(@Query() query: any) {
    const filters: Record<string, any> = {};
    if (query.agentId) filters.agent = { id: Number(query.agentId) };
    // If you have flags like isVerified/isPrimary on AgentPayoutAccount, add them here:
    if (typeof query.isVerified !== 'undefined') {
      filters.isVerified = query.isVerified === 'true' ? true : query.isVerified === 'false' ? false : query.isVerified;
    }

    return CRUD.findAll(
      this.payoutAccountsService.payoutAccountsRepository, // repo
      'agent_payout_account', // alias (match your QB alias)
      query.q || query.search, // search
      query.page, // page
      query.limit, // limit
      query.sortBy ?? 'createdAt', // sortBy
      query.sortOrder ?? 'DESC', // sortOrder
      ['agent'], // relations
      [], // searchFields (add root cols if any)
      filters, // filters
    );
  }

  @Post()
  @Roles(UserType.AGENT, UserType.ADMIN)
  create(@Body() createPayoutAccountDto: CreatePayoutAccountDto) {
    return this.payoutAccountsService.create(createPayoutAccountDto);
  }

  @Get('agent/:agentId')
  @Roles(UserType.AGENT, UserType.ADMIN)
  findByAgent(@Param('agentId') agentId: string) {
    return this.payoutAccountsService.findByAgent(+agentId);
  }

  @Get(':id')
  @Roles(UserType.AGENT, UserType.ADMIN)
  findOne(@Param('id') id: string) {
    return this.payoutAccountsService.findOne(+id);
  }

  @Patch(':id')
  @Roles(UserType.AGENT, UserType.ADMIN)
  update(@Param('id') id: string, @Body() updatePayoutAccountDto: UpdatePayoutAccountDto) {
    return this.payoutAccountsService.update(+id, updatePayoutAccountDto);
  }

  @Delete(':id')
  @Roles(UserType.AGENT, UserType.ADMIN)
  remove(@Param('id') id: string) {
    return this.payoutAccountsService.remove(+id);
  }

  @Post('agent/:agentId/verify')
  @Roles(UserType.ADMIN)
  verifyAccount(@Param('agentId') agentId: string) {
    return this.payoutAccountsService.verifyAccount(+agentId);
  }
}

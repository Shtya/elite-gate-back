import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { AgentAvailabilityService } from './agent-availability.service';
import { CreateAgentAvailabilityDto, UpdateAgentAvailabilityDto, CreateAgentPreferredPropertyDto, AgentAvailabilityQueryDto } from '../../dto/agent-availability.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserType } from 'entities/global.entity';
import { CRUD } from 'common/crud.service';

@Controller('agent-availability')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AgentAvailabilityController {
  constructor(private readonly agentAvailabilityService: AgentAvailabilityService) {}

  // Availability
  @Post('availability')
  @Roles(UserType.AGENT, UserType.ADMIN)
  createAvailability(@Body() createAgentAvailabilityDto: CreateAgentAvailabilityDto) {
    return this.agentAvailabilityService.createAvailability(createAgentAvailabilityDto);
  }

  @Get('availability')
  @Roles(UserType.ADMIN, UserType.AGENT)
  getAvailability(@Query() query: any) {
    const filters: Record<string, any> = {};
    if (query.agentId) filters.agentId = Number(query.agentId); // if you have a FK column
    if (query.agentId && !filters.agentId) filters.agent = { id: Number(query.agentId) }; // or relation, if no FK column
    if (typeof query.dayOfWeek !== 'undefined') filters.dayOfWeek = Number(query.dayOfWeek);

    return CRUD.findAll(this.agentAvailabilityService.agentAvailabilityRepository, 'agent_availability', query.q || query.search, query.page, query.limit, query.sortBy ?? 'dayOfWeek', query.sortOrder ?? 'ASC', ['agent'], [], filters);
  }

  @Get('availability/:id')
  @Roles(UserType.ADMIN, UserType.AGENT)
  getAvailabilityById(@Param('id') id: string) {
    return this.agentAvailabilityService.getAvailabilityById(+id);
  }

  @Patch('availability/:id')
  @Roles(UserType.AGENT, UserType.ADMIN)
  updateAvailability(@Param('id') id: string, @Body() updateAgentAvailabilityDto: UpdateAgentAvailabilityDto) {
    return this.agentAvailabilityService.updateAvailability(+id, updateAgentAvailabilityDto);
  }

  @Delete('availability/:id')
  @Roles(UserType.AGENT, UserType.ADMIN)
  deleteAvailability(@Param('id') id: string) {
    return this.agentAvailabilityService.deleteAvailability(+id);
  }

  // Preferred Properties
  @Post('preferred-properties')
  @Roles(UserType.AGENT, UserType.ADMIN)
  addPreferredProperty(@Body() createAgentPreferredPropertyDto: CreateAgentPreferredPropertyDto) {
    return this.agentAvailabilityService.addPreferredProperty(createAgentPreferredPropertyDto);
  }

  @Get('preferred-properties/:agentId')
  @Roles(UserType.ADMIN, UserType.AGENT)
  getPreferredProperties(@Param('agentId') agentId: string, @Query() query: any) {
    const filters: Record<string, any> = { agent: { id: Number(agentId) } };

    return CRUD.findAll(
      this.agentAvailabilityService.preferredPropertyRepository, // repo
      'agent_preferred_property', // alias (match your QB alias)
      query.q || query.search, // search
      query.page, // page
      query.limit, // limit
      query.sortBy ?? 'createdAt', // sortBy
      query.sortOrder ?? 'DESC', // sortOrder
      ['agent', 'property', 'property.city', 'property.area'], // relations
      [], // searchFields (add root cols if any)
      filters, // filters
    );
  }

  @Delete('preferred-properties/:id')
  @Roles(UserType.AGENT, UserType.ADMIN)
  removePreferredProperty(@Param('id') id: string) {
    return this.agentAvailabilityService.removePreferredProperty(+id);
  }

  @Get('agents/available')
  @Roles(UserType.ADMIN, UserType.CUSTOMER)
  getAvailableAgents(@Query('date') date: string, @Query('time') time: string) {
    return this.agentAvailabilityService.getAvailableAgents(date, time);
  }
}

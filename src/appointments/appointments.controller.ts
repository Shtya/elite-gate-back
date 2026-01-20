import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Req, ParseIntPipe, UseFilters, UnauthorizedException } from '@nestjs/common';
import { HttpStatusFilter } from 'common/http-status.filter';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto, UpdateAppointmentDto, AssignAgentDto, UpdateStatusDto, AppointmentQueryDto, BookWithRegistrationDto, AvailabilityQueryDto } from '../../dto/appointments.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AgentAppointmentRequestStatus, AppointmentStatus, UserType } from 'entities/global.entity';
import { CRUD } from 'common/crud.service';

interface RequestWithUser extends Request {
  user: any;
}

@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService


  ) {}

  @Post()
  @Roles(UserType.CUSTOMER, UserType.ADMIN, UserType.AGENT)
  @UseFilters(HttpStatusFilter)
  create(@Body() createAppointmentDto: CreateAppointmentDto,@Req() req: RequestWithUser) {
    const userId = Number(req.user.id);
    if (req.user.userType === UserType.ADMIN) {
      if (!createAppointmentDto.customerId) {
        throw new UnauthorizedException(
          'Customer ID is required when admin creates an appointment.',
        );
      }
    }
    else{
      createAppointmentDto.customerId = userId;

    }
    console.log(createAppointmentDto.customerId)
    return this.appointmentsService.create(createAppointmentDto);
  }

  @Post('book-with-registration')
  async createWithRegistration(@Body() dto: BookWithRegistrationDto) {
    return this.appointmentsService.createWithRegistration(dto);
  }

  @Get('available-slots')
  async getAvailableSlots(@Query() query: AvailabilityQueryDto) {
    return this.appointmentsService.getAvailableSlots(query.propertyId, query.date);
  }



  @Get()
  @Roles(UserType.ADMIN, UserType.AGENT, UserType.QUALITY, UserType.CUSTOMER)
  async findAll(@Query() query: any) {
    const repository = this.appointmentsService.appointmentsRepository;

    // Pagination
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    // Sorting
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder: 'ASC' | 'DESC' = (query.sortOrder || 'DESC').toUpperCase() as any;

    // Base query
    const qb = repository.createQueryBuilder('appointment')
      .skip(skip)
      .take(limit);

    // Nested relations
    const relations = ['property', 'property.city', 'property.area', 'customer', 'agent'];
    const addedAliases = new Set<string>();
    relations.forEach(path => {
      const segments = path.split('.');
      let parentAlias = 'appointment';

      segments.forEach(seg => {
        const alias = `${parentAlias}_${seg}`;
        if (!addedAliases.has(alias)) {
          qb.leftJoinAndSelect(`${parentAlias}.${seg}`, alias);
          addedAliases.add(alias);
        }
        parentAlias = alias;
      });
    });

    // Filters
    if (query.customerId) qb.andWhere('appointment.customer_id = :customerId', { customerId: Number(query.customerId) });
    if (query.agentId) qb.andWhere('appointment.agent_id = :agentId', { agentId: Number(query.agentId) });
    if (query.propertyId) qb.andWhere('appointment.property_id = :propertyId', { propertyId: Number(query.propertyId) });
    if (query.status) qb.andWhere('appointment.status = :status', { status: query.status });

    // Optional search (if needed)
    if (query.q) {
      qb.andWhere(
        '(appointment.customer_notes ILIKE :search OR appointment.agent_notes ILIKE :search)',
        { search: `%${query.q}%` }
      );
    }

    // Sorting
    qb.orderBy(`appointment.${sortBy}`, sortOrder);

    // Execute
    const [records, total] = await qb.getManyAndCount();

    return {
      total_records: total,
      current_page: page,
      per_page: limit,
      records,
    };
  }
@Get("agent")
@Roles(UserType.AGENT)
async getAgentAppointments(@Req() req: RequestWithUser) {
  return this.appointmentsService.getAgentAppointments(+req.user.id);
}
@Patch("requests/:requestId")
@Roles(UserType.AGENT)
async respondToRequest(
  @Param("requestId") requestId: number,
  @Body("status") status: AppointmentStatus,
  @Req() req: RequestWithUser
) {
  return this.appointmentsService.respondToAppointmentRequest(
    requestId,
    req.user.id,
    status
  );
}blo

  @Get(':id')
  @Roles(UserType.ADMIN, UserType.AGENT, UserType.CUSTOMER, UserType.QUALITY)
  findOne(@Param('id') id: string) {
    return this.appointmentsService.findOne(+id);
  }

  @Patch(':id')
  @Roles(UserType.ADMIN, UserType.AGENT)
  update(@Param('id') id: string, @Body() updateAppointmentDto: UpdateAppointmentDto) {
    return this.appointmentsService.update(+id, updateAppointmentDto);
  }

  @Post(':id/assign-agent')
  @Roles(UserType.ADMIN)
  assignAgent(@Param('id') id: string, @Body() assignAgentDto: AssignAgentDto) {
    return this.appointmentsService.assignAgent(+id, assignAgentDto.agentId);
  }

  @Post(':id/update-status')
  @Roles(UserType.ADMIN, UserType.AGENT, UserType.CUSTOMER)
  updateStatus(@Param('id') id: string, @Body() updateStatusDto: UpdateStatusDto) {
    return this.appointmentsService.updateStatus(+id, updateStatusDto);
  }
  @Patch(":id/final-status")
  async updateFinalStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: any,
  ) {
    return this.appointmentsService.updateAppointmentFinalStatus(
      id,
      dto.status,
      dto.notes,
    );
  }

  @Get('customer/:customerId')
  @Roles(UserType.CUSTOMER, UserType.ADMIN, UserType.AGENT)
  findByCustomer(@Param('customerId') customerId: string, @Query() query: any) {
    const filters: Record<string, any> = {
      customer: { id: Number(customerId) }, // path param → nested filter
    };

    if (query.status) filters.status = query.status;
    if (query.propertyId) filters.property = { id: Number(query.propertyId) };

    return CRUD.findAll(
      this.appointmentsService.appointmentsRepository, // repo
      'appointment', // alias
      query.q || query.search, // search
      query.page, // page
      query.limit, // limit
      query.sortBy ?? 'appointmentDate', // sortBy
      query.sortOrder ?? 'DESC', // sortOrder
      ['property', 'agent', 'property.city', 'property.area'], // relations
      [], // searchFields (add root cols if you have any)
      filters, // equality + nested filters
    );
  }
  @Get('agent/:agentId')
  @Roles(UserType.AGENT, UserType.ADMIN)
  async findByAgent(
    @Param('agentId') agentId: string,
    @Query() query: any,
  ) {
    const repository = this.appointmentsService.appointmentsRepository;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const qb = repository.createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.property', 'property')
      .leftJoinAndSelect('property.city', 'city')        // nested join
      .leftJoinAndSelect('property.area', 'area')
      .leftJoinAndSelect('appointment.customer', 'customer')
      .leftJoinAndSelect('appointment.agent', 'agent')
      .where('appointment.agent_id = :agentId', { agentId: Number(agentId) })
      .skip(skip)
      .take(limit)
      .orderBy('appointment.appointmentDate', 'DESC');

    // Optional filters
    if (query.status) {
      qb.andWhere('appointment.status = :status', { status: query.status });
    }
    if (query.propertyId) {
      qb.andWhere('property.id = :propertyId', { propertyId: Number(query.propertyId) });
    }

    const [records, total] = await qb.getManyAndCount();

    return {
      total_records: total,
      current_page: page,
      per_page: limit,
      records,
    };
  }


  }

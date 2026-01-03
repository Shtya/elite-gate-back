import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  Req,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { genericUploadOptions, toWebPathFiles } from "common/upload.config";

import { AgentsService } from "./agents.service";
import {
  CreateAgentDto,
  UpdateAgentDto,
  ApproveAgentDto,
  UpdateVisitAmountDto,
} from "../../dto/agents.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role, UserRole, UserType } from "entities/global.entity";
import { CRUD } from "common/crud.service";
import { RegisterDto } from "dto/auth.dto";
import { Request } from "express";
import { CreatePayoutDto } from "dto/create-payment.dto";

interface RequestWithUser extends Request {
  user: any;
}
@Controller("agents")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post()
  @Roles(UserType.ADMIN, UserType.CUSTOMER)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'identityProof', maxCount: 1 },
        { name: 'residencyDocument', maxCount: 1 },
      ],
      genericUploadOptions,
    ),
  )
  async create(
    @Body() createAgentDto: CreateAgentDto,
    @Req() req: RequestWithUser,
    @UploadedFiles()
    files?: { identityProof?: Express.Multer.File[]; residencyDocument?: Express.Multer.File[] },
  ) {
    const byAdmin = req.user.userType?.toLowerCase() === UserType.ADMIN.toLowerCase();
  
    if (byAdmin && !createAgentDto.userId) {
      throw new BadRequestException('Admin must provide userId for the customer');
    } else if (!byAdmin) {
      createAgentDto.userId = req.user.id;
    }
  
    if (files?.identityProof?.[0]) {
      createAgentDto.identityProof = toWebPathFiles(files.identityProof[0].filename);
    }
    if (files?.residencyDocument?.[0]) {
      createAgentDto.residencyDocument = toWebPathFiles(files.residencyDocument[0].filename);
    }
  
    if (!createAgentDto.identityProof || !createAgentDto.residencyDocument) {
      throw new BadRequestException('identityProof or residencyDocument is missing');
    }
  
    return this.agentsService.create(createAgentDto, byAdmin);
  }
  
  @Get("dashboard")
  @Roles(UserType.AGENT)
  async getMyDashboard(@Req() req: RequestWithUser) {
    const agentId = req.user?.id; // assuming JWT contains agentId
    if (!agentId) {
      throw new BadRequestException("Agent information not found in token");
    }
    return this.agentsService.getDashboard(agentId);
  }


  @Get()
  @Roles(UserType.ADMIN, UserType.QUALITY, UserType.AGENT)
  async findAll(@Query() query: any) {
    const repository = this.agentsService.agentsRepository;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
  
    const qb = repository.createQueryBuilder('agent')
      .leftJoinAndSelect('agent.user', 'agent_user')
      .leftJoinAndSelect('agent.cities', 'city') // join cities
      .leftJoinAndSelect('agent.areas', 'area')  // join areas with a DIFFERENT alias
      .skip(skip)
      .take(limit)
      .orderBy('agent.createdAt', 'DESC');
  
    // Filters
    if (query.status) qb.andWhere('agent.status = :status', { status: query.status });
    if (query.cityId) qb.andWhere('city.id = :cityId', { cityId: Number(query.cityId) });
    if (query.areaId) qb.andWhere('area.id = :areaId', { areaId: Number(query.areaId) });
  
    const [records, total] = await qb.getManyAndCount();
  
    return {
      total_records: total,
      current_page: page,
      per_page: limit,
      records,
    };
  }
  
  @Post('register')
    @UseInterceptors(
      FileFieldsInterceptor([
        { name: 'profilePhotoUrl', maxCount: 1 },
        { name: 'identityProof', maxCount: 1 },
        { name: 'residencyDocument', maxCount: 1 },
      ], genericUploadOptions),
    )
  async registerAgent(
    @Body() registerDto: RegisterDto & {cityIds: any[]; areaIds?: any[], visitAmount?:number,},
    @UploadedFiles() files?: { identityProof?: Express.Multer.File[]; residencyDocument?: Express.Multer.File[], profilePhotoUrl?: Express.Multer.File[] },
  ) {
    if (typeof registerDto.cityIds === 'string' && registerDto.cityIds === 'all') {
      registerDto.cityIds = ['all'];
    }
    
    if (!Array.isArray(registerDto.cityIds) || registerDto.cityIds.length === 0) {
      throw new BadRequestException('cityIds must be a non-empty array');
    }
    registerDto.cityIds = registerDto.cityIds.map(String);
    if (registerDto.areaIds) registerDto.areaIds = registerDto.areaIds.map(String);
  
    if (files?.identityProof?.[0]) {
      registerDto.identityProof = toWebPathFiles(files.identityProof[0].filename);
    }
    if (files?.residencyDocument?.[0]) {
      registerDto.residencyDocument = toWebPathFiles(files.residencyDocument[0].filename);
    }
    if (files?.profilePhotoUrl?.[0]) {
        registerDto.profilePhotoUrl = toWebPathFiles(files.profilePhotoUrl[0].filename);
      }
  
    return this.agentsService.registerAgent(registerDto, files);
  }
  @Post(":id/approve")
  @Roles(UserType.ADMIN, UserType.QUALITY)
  approve(@Param("id") id: string, @Body() approveAgentDto: ApproveAgentDto) {
    return this.agentsService.approve(+id, approveAgentDto);
  }
  @Get(":id")
  @Roles(UserType.ADMIN, UserType.QUALITY)
  findOne(@Param("id") id: string) {
    return this.agentsService.findOne(+id);
  }


  @Patch(':id')
  @Roles(UserType.ADMIN)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'identityProof', maxCount: 1 },
        { name: 'residencyDocument', maxCount: 1 },
      ],
      genericUploadOptions
    ),
  )
  update(
    @Param('id') id: string,
    @Body() updateAgentDto: UpdateAgentDto,
@UploadedFiles()
files: {
  identityProof?: Express.Multer.File[];
  residencyDocument?: Express.Multer.File[];
},
  ) {

    if (files?.identityProof?.[0]) {
      updateAgentDto.identityProof = toWebPathFiles(files.identityProof[0].filename);
    }
    if (files?.residencyDocument?.[0]) {
      updateAgentDto.residencyDocument = toWebPathFiles(files.residencyDocument[0].filename);
    }
  
    // cityIds and areaIds may contain "all"
    if (updateAgentDto.cityIds) updateAgentDto.cityIds = updateAgentDto.cityIds.map(Number);
    if (updateAgentDto.areaIds) updateAgentDto.areaIds = updateAgentDto.areaIds.map(Number);
  
    return this.agentsService.update(+id, updateAgentDto);
  }

  @Delete(":id")
  @Roles(UserType.ADMIN)
  remove(@Param("id") id: string) {
    return this.agentsService.remove(+id);
  }




  @Get("user/:userId")
  @Roles(UserType.ADMIN, UserType.QUALITY)
  findByUserId(@Param("userId") userId: string) {
    return this.agentsService.findByUserId(+userId);
  }


  @Get(':agentId/stats')
  @Roles(UserType.ADMIN)
  async getAgentWalletStats(@Param('agentId') agentId: number) {
    return this.agentsService.getAgentWalletStats(agentId);
  }
  @Post(':agentId/payout')
  @Roles(UserType.ADMIN)
  async createManualPayout(
    @Param('agentId') agentId: number,
    @Body() createPayoutDto: CreatePayoutDto,
    @Req() req: RequestWithUser
  ) {
    const adminUser = req.user;
    return this.agentsService.createManualPayout(
      agentId,
      createPayoutDto.amount,
      adminUser,
      createPayoutDto.notes
    );
  }

  @Get()
  async getPayouts(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query() filters: any
  ) {
    return this.agentsService.getPayouts(page, limit, filters);
  }

  @Get('summary')
  async getPayoutSummary() {
    return this.agentsService.getPayoutSummary();
  }
  @Roles(UserType.ADMIN)
  @Patch(':agentId/visit-amount')
  async updateAgentVisitAmount(
    @Param('agentId') agentId: number,
    @Body() updateVisitAmountDto: UpdateVisitAmountDto,
    @Req() req: any
  ) {
    const adminUser = req.user;
    return this.agentsService.updateAgentVisitAmount(
      agentId,
      updateVisitAmountDto.visitAmount,
      adminUser,
      updateVisitAmountDto.notes
    );
  }
}

import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { QualityService } from './quality.service';
import { CreateQualityCaseDto, UpdateQualityCaseDto, AddCaseNoteDto, QualityCaseQueryDto } from '../../dto/quality.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserType } from 'entities/global.entity';
import { CRUD } from 'common/crud.service';

@Controller('quality')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QualityController {
  constructor(private readonly qualityService: QualityService) {}

  @Post('cases')
  @Roles(UserType.ADMIN, UserType.QUALITY)
  createCase(@Body() createQualityCaseDto: CreateQualityCaseDto) {
    return this.qualityService.createCase(createQualityCaseDto);
  }

  @Get('cases')
  @Roles(UserType.ADMIN, UserType.QUALITY)
  findAllCases(@Query() query: any) {
    const filters: Record<string, any> = {};
    if (query.status) filters.status = query.status; // e.g., OPEN/IN_PROGRESS/RESOLVED/CLOSED
    if (query.priority) filters.priority = query.priority; // e.g., low/medium/high/critical
    if (query.assigneeId) filters.assignee = { id: Number(query.assigneeId) };

    return CRUD.findAll(
      this.qualityService.qualityCasesRepository, // repo
      'quality_case', // alias (must match your QB alias)
      query.q || query.search, // search term
      query.page, // page
      query.limit, // limit
      query.sortBy ?? 'priority', // sortBy
      query.sortOrder ?? 'DESC', // sortOrder
      ['assignee', 'notes', 'notes.author'], // relations
      ['title', 'description'], // searchFields (root cols on QualityCase)
      filters, // filters
    );
  }

  @Get('cases/:id')
  @Roles(UserType.ADMIN, UserType.QUALITY)
  findCase(@Param('id') id: string) {
    return this.qualityService.findCase(+id);
  }

  @Patch('cases/:id')
  @Roles(UserType.ADMIN, UserType.QUALITY)
  updateCase(@Param('id') id: string, @Body() updateQualityCaseDto: UpdateQualityCaseDto) {
    return this.qualityService.updateCase(+id, updateQualityCaseDto);
  }

  @Post('cases/:id/notes')
  @Roles(UserType.ADMIN, UserType.QUALITY)
  addCaseNote(@Param('id') id: string, @Body() addCaseNoteDto: AddCaseNoteDto) {
    return this.qualityService.addCaseNote(+id, addCaseNoteDto);
  }

  @Post('cases/:id/assign')
  @Roles(UserType.ADMIN, UserType.QUALITY)
  assignCase(@Param('id') id: string, @Body('assigneeId') assigneeId: number) {
    return this.qualityService.assignCase(+id, assigneeId);
  }

  @Post('cases/:id/close')
  @Roles(UserType.ADMIN, UserType.QUALITY)
  closeCase(@Param('id') id: string) {
    return this.qualityService.closeCase(+id);
  }

  @Get('dashboard/stats')
  @Roles(UserType.ADMIN, UserType.QUALITY)
  getQualityStats() {
    return this.qualityService.getQualityStats();
  }
}

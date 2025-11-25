import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { GenerateReportDto, ReportQueryDto, AgentPerformanceQueryDto, MarketingPerformanceQueryDto } from '../../dto/reports.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserType } from 'entities/global.entity';
import { CRUD } from 'common/crud.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('generate')
  @Roles(UserType.ADMIN)
  generateReport(@Body() generateReportDto: GenerateReportDto) {
    return this.reportsService.generateReport(generateReportDto);
  }

  @Get('snapshots')
  @Roles(UserType.ADMIN)
  getReportSnapshots(@Query() query: any) {
    const filters: Record<string, any> = {};
    if (query.type) filters.type = query.type; // ReportSnapshotType

    return CRUD.findAll(
      this.reportsService.reportSnapshotsRepository, // repo
      'report_snapshot', // alias used by QB
      query.q || query.search, // search (optional)
      query.page, // page
      query.limit, // limit
      query.sortBy ?? 'generatedAt', // sortBy
      query.sortOrder ?? 'DESC', // sortOrder
      [], // relations
      [], // searchFields (add if you have e.g. ['name'])
      filters, // filters (no date ranges here)
    );
  }

  @Get('snapshots/:id')
  @Roles(UserType.ADMIN)
  getReportSnapshot(@Param('id') id: string) {
    return this.reportsService.getReportSnapshot(+id);
  }

  @Get('dashboard/admin')
  @Roles(UserType.ADMIN)
  getAdminDashboard() {
    return this.reportsService.getAdminDashboard();
  }

  @Get('performance/agents')
  @Roles(UserType.ADMIN, UserType.QUALITY)
  getAgentPerformance(@Query() query: AgentPerformanceQueryDto) {
    return this.reportsService.getAgentPerformance(query);
  }

  @Get('performance/marketing')
  @Roles(UserType.ADMIN, UserType.MARKETER)
  getMarketingPerformance(@Query() query: MarketingPerformanceQueryDto) {
    return this.reportsService.getMarketingPerformance(query);
  }

  @Get('financial/overview')
  @Roles(UserType.ADMIN)
  getFinancialOverview(@Query() query: ReportQueryDto) {
    return this.reportsService.getFinancialOverview(query);
  }

  @Get('agent/:agentId/summary')
  @Roles(UserType.ADMIN, UserType.AGENT)
  getAgentSummary(@Param('agentId') agentId: string, @Query() query: AgentPerformanceQueryDto) {
    return this.reportsService.getAgentSummary(+agentId, query);
  }
}

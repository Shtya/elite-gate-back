import { IsNotEmpty, IsEnum, IsOptional, IsDateString, IsNumber } from 'class-validator';
import { ReportSnapshotType } from '../entities/global.entity';

export class GenerateReportDto {
  @IsNotEmpty()
  @IsEnum(ReportSnapshotType)
  type: ReportSnapshotType;

  @IsNotEmpty()
  @IsDateString()
  periodStart: string;

  @IsNotEmpty()
  @IsDateString()
  periodEnd: string;
}

export class ReportQueryDto {
  @IsOptional()
  @IsEnum(ReportSnapshotType)
  type?: ReportSnapshotType;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class AgentPerformanceQueryDto {
  @IsOptional()
  @IsNumber()
  agentId?: number;

  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @IsNotEmpty()
  @IsDateString()
  endDate: string;
}

export class MarketingPerformanceQueryDto {
  @IsOptional()
  @IsNumber()
  marketerId?: number;

  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @IsNotEmpty()
  @IsDateString()
  endDate: string;
}
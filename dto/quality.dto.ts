import { IsNotEmpty, IsString, IsEnum, IsOptional, IsNumber } from 'class-validator';
import { QualityCaseStatus, QualityCasePriority } from '../entities/global.entity';

export class CreateQualityCaseDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  relatedTable?: string;

  @IsOptional()
  @IsNumber()
  relatedId?: number;

  @IsOptional()
  @IsEnum(QualityCasePriority)
  priority?: QualityCasePriority;
}

export class UpdateQualityCaseDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(QualityCaseStatus)
  status?: QualityCaseStatus;

  @IsOptional()
  @IsEnum(QualityCasePriority)
  priority?: QualityCasePriority;

  @IsOptional()
  @IsNumber()
  assigneeId?: number;
}

export class AddCaseNoteDto {
  @IsNotEmpty()
  @IsString()
  note: string;
}

export class QualityCaseQueryDto {
  @IsOptional()
  @IsEnum(QualityCaseStatus)
  status?: QualityCaseStatus;

  @IsOptional()
  @IsEnum(QualityCasePriority)
  priority?: QualityCasePriority;

  @IsOptional()
  @IsNumber()
  assigneeId?: number;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}
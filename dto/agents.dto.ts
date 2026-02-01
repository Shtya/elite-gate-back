import { IsNotEmpty, IsNumber, IsEnum, IsOptional, IsString, ArrayNotEmpty, IsArray, IsPositive, Max, MaxLength, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { AgentApprovalStatus } from '../entities/global.entity';


export class CreateAgentDto {
  @IsNumber()
  @Type(() => Number)
  userId: number;

  @IsOptional()
  @IsArray()
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value.map(v => Number(v))
      : value.split(',').map(v => Number(v))
  )
  @IsNumber({}, { each: true })
  cityIds: number[];

  @IsOptional()
  @IsArray()
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value.map(v => Number(v))
      : value.split(',').map(v => Number(v))
  )
  @IsNumber({}, { each: true })
  areaIds?: number[];

  identityProof?: string;
  residencyDocument?: string;

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (e) {
        return [];
      }
    }
    return value;
  })
  @Type(() => WorkingDayDto)
  workingDays?: WorkingDayDto[];
}

export class WorkingTimeDto {
  @IsString()
  startTime: string;

  @IsString()
  endTime: string;
}

export class WorkingDayDto {
  @IsString()
  day: string; // e.g., 'Monday'

  @IsArray()
  @Type(() => WorkingTimeDto)
  times: WorkingTimeDto[];
}
export class UpdateAgentDto {
  @IsOptional()

  cityIds?: number[];

  @IsOptional()
  areaIds?: number[];

  @IsOptional()
  identityProof?: string;

  @IsOptional()
  residencyDocument?: string;

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (e) {
        return [];
      }
    }
    return value;
  })
  @Type(() => WorkingDayDto)
  workingDays?: WorkingDayDto[];
@IsOptional()
  kycNotes?: string;

}


export class ApproveAgentDto {
  @IsEnum(AgentApprovalStatus)
  status: AgentApprovalStatus;

  @IsOptional()
  @IsString()
  kycNotes?: string;
}

export class AgentQueryDto {
  @IsOptional()
  @IsEnum(AgentApprovalStatus)
  status?: AgentApprovalStatus;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  cityId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;
}
export class UpdateVisitAmountDto {
  @IsNumber()
  @IsPositive({ message: 'Visit amount must be a positive number' })
  @Min(0, { message: 'Visit amount cannot be negative' })
  @Max(10000, { message: 'Visit amount cannot exceed 10,000 SAR' })
  @Type(() => Number)
  visitAmount: number;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Notes cannot exceed 500 characters' })
  notes?: string;
}
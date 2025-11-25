import { IsNotEmpty, IsEnum, IsOptional, IsString, IsNumber } from 'class-validator';
import { TimelineEventType } from '../entities/global.entity';

export class CreateTimelineEventDto {
  @IsNotEmpty()
  @IsNumber()
  customerId: number;

  @IsNotEmpty()
  @IsEnum(TimelineEventType)
  eventType: TimelineEventType;

  @IsOptional()
  @IsNumber()
  relatedId?: number;

  @IsOptional()
  @IsString()
  relatedTable?: string;

  @IsOptional()
  @IsNumber()
  actorUserId?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class TimelineQueryDto {
  @IsNotEmpty()
  @IsNumber()
  customerId: number;

  @IsOptional()
  @IsEnum(TimelineEventType)
  eventType?: TimelineEventType;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}
import { IsNotEmpty, IsNumber, IsEnum, IsOptional, IsString, Min, Max, IsBoolean } from 'class-validator';
import { RatingDimension } from '../entities/global.entity';

export enum PunctualityStatus {
  COMMITTED = 'committed',
  SLIGHT_DELAY = 'slight_delay',
  NOTICEABLE_DELAY = 'noticeable_delay',
}

export class CreateCustomerReviewDto {
  @IsNotEmpty()
  @IsNumber()
  appointmentId: number;

  @IsOptional() // Made optional as it can be calculated
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsEnum(PunctualityStatus)
  punctuality?: PunctualityStatus;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  accuracy?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  professionalism?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  trustworthiness?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  recommendation?: number;

  @IsOptional()
  @IsString()
  reviewText?: string;

  @IsNotEmpty()
  @IsNumber()
  agentId: number;

  @IsOptional()
  dimensions?: ReviewDimensionDto[];
}

export class CreateAgentReviewDto {
  @IsNotEmpty()
  @IsNumber()
  appointmentId: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  reviewText?: string;

  @IsOptional()
  dimensions?: ReviewDimensionDto[];
}

export class ReviewDimensionDto {
  @IsNotEmpty()
  @IsEnum(RatingDimension)
  dimension: RatingDimension;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(5)
  score: number;
}

export class UpdateReviewDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  reviewText?: string;

  @IsOptional()
  @IsBoolean()
  isApproved?: boolean;
}

export class ReviewQueryDto {
  @IsOptional()
  @IsNumber()
  agentId?: number;

  @IsOptional()
  @IsNumber()
  customerId?: number;

  @IsOptional()
  @IsBoolean()
  isApproved?: boolean;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}
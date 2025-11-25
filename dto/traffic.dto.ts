import { IsNotEmpty, IsEnum, IsOptional, IsString, IsNumber, IsDateString, IsBoolean } from 'class-validator';
import { TrafficSource, ConversionType, SocialPlatform } from 'entities/global.entity';

export class TrackVisitorDto {
  @IsOptional()
  @IsString()
  referralCode?: string;

  @IsOptional()
  @IsNumber()
  marketerId?: number;

  @IsNotEmpty()
  @IsEnum(TrafficSource)
  source: TrafficSource;

  @IsOptional()
  @IsString()
  utmSource?: string;

  @IsOptional()
  @IsString()
  utmMedium?: string;

  @IsOptional()
  @IsString()
  utmCampaign?: string;

  @IsOptional()
  @IsString()
  utmTerm?: string;

  @IsOptional()
  @IsString()
  utmContent?: string;

  @IsOptional()
  @IsNumber()
  influencerId?: number;

  @IsOptional()
  @IsString()
  landingPage?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsNotEmpty()
  @IsString()
  visitedUrl: string;
  @IsOptional()
  @IsNumber()
  campaignId?: number;


}

export class CreateConversionDto {
  @IsOptional()
  @IsNumber()
  marketerId?: number;

  @IsNotEmpty()
  @IsNumber()
  visitorId: number;

  @IsNotEmpty()
  @IsNumber()
  userId: number;

  @IsOptional()
  @IsEnum(ConversionType)
  conversionType?: ConversionType;
}

export class TrafficQueryDto {
  @IsOptional()
  @IsNumber()
  marketerId?: number;

  @IsOptional()
  @IsNumber()
  influencerId?: number;

  @IsOptional()
  @IsEnum(TrafficSource)
  source?: TrafficSource;

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

export class CreateInfluencerDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  handle?: string;

  @IsNotEmpty()
  @IsEnum(SocialPlatform)
  platform: SocialPlatform;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsNumber()
  userId?: number;
}

export class UpdateInfluencerDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  handle?: string;

  @IsOptional()
  @IsEnum(SocialPlatform)
  platform?: SocialPlatform;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
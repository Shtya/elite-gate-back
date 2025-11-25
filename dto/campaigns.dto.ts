import { IsNotEmpty, IsString, IsEnum, IsOptional, IsNumber, IsDateString, IsArray, IsUrl } from 'class-validator';
import { CampaignChannel, CampaignAudience, CampaignRunType, CampaignFrequency, CampaignStatus } from '../entities/global.entity';
import { Transform } from 'class-transformer';

export class CreateCampaignDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsEnum(CampaignChannel)
  targetChannel: CampaignChannel;

  @IsNotEmpty()
  @IsEnum(CampaignAudience)
  targetAudience: CampaignAudience;

  @IsNotEmpty()
  @IsEnum(CampaignRunType)
  runType: CampaignRunType;

  @IsOptional()
  @IsDateString()
  runOnceDatetime?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(CampaignFrequency)
  runFrequency?: CampaignFrequency;

  @IsOptional()
  @IsString()
  runTime?: string;

  @IsNotEmpty()
  @IsEnum(CampaignStatus)
  status: CampaignStatus;

  @IsOptional()
  @IsNumber()
  actualRecipients?: number;

  @IsNotEmpty()
  @IsString()
  messageContent: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return [];
    const arr = Array.isArray(value) ? value : [value];
    return arr
      .map(v => (typeof v === 'string' ? v : v?.imageUrl))
      .filter(Boolean)
      .map((s: string) => s.trim());
  })
  @IsArray()
  images?: string[];

  // @IsOptional()
  // @IsArray()
  // images?: string[];
}

export class UpdateCampaignDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(CampaignChannel)
  targetChannel?: CampaignChannel;

  @IsOptional()
  @IsEnum(CampaignAudience)
  targetAudience?: CampaignAudience;

  @IsOptional()
  @IsEnum(CampaignRunType)
  runType?: CampaignRunType;

  @IsOptional()
  @IsDateString()
  runOnceDatetime?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(CampaignFrequency)
  runFrequency?: CampaignFrequency;

  @IsOptional()
  @IsString()
  runTime?: string;

  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @IsOptional()
  @IsString()
  messageContent?: string;
}

export class CampaignQueryDto {
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @IsOptional()
  @IsEnum(CampaignChannel)
  targetChannel?: CampaignChannel;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class CampaignImageDto {
  @IsNotEmpty()
  @IsString()
  imageUrl: string;
}

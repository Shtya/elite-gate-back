import { IsNotEmpty, IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class CreateShortLinkDto {
  @IsOptional()
  @IsString()
  slug?: string;

  @IsNotEmpty()
  @IsString()
  destination: string;

  @IsOptional()
  @IsNumber()
  influencerId?: number;

  @IsOptional()
  @IsNumber()
  marketerId?: number;

  @IsOptional()
  @IsNumber()
  campaignId?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateShortLinkDto {
  @IsOptional()
  @IsString()
  destination?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  influencerId?: number;

  @IsOptional()
  @IsNumber()
  marketerId?: number;

  @IsOptional()
  @IsNumber()
  campaignId?: number;
}

export class ShortLinkQueryDto {
  @IsOptional()
  @IsNumber()
  influencerId?: number;

  @IsOptional()
  @IsNumber()
  marketerId?: number;

  @IsOptional()
  @IsNumber()
  campaignId?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}
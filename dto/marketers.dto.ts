import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateMarketerDto {
  @IsNotEmpty()
  @IsNumber()
  userId: number;

  @IsOptional()
  @IsString()
  referralCode?: string;
}

export class UpdateMarketerDto {
  @IsOptional()
  @IsString()
  referralCode?: string;
}

export class MarketerQueryDto {
  @IsOptional()
  @IsNumber()
  createdById?: number;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class GenerateReferralCodeDto {
  @IsNotEmpty()
  @IsString()
  marketerName: string;
}
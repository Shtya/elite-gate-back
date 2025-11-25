import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';

export class CreatePayoutAccountDto {
  @IsNotEmpty()
  @IsNumber()
  agentId: number;

  @IsNotEmpty()
  @IsString()
  accountHolderName: string;

  @IsNotEmpty()
  @IsString()
  iban: string;

  @IsNotEmpty()
  @IsString()
  bankName: string;

  @IsOptional()
  @IsString()
  swiftCode?: string;
}

export class UpdatePayoutAccountDto {
  @IsOptional()
  @IsString()
  accountHolderName?: string;

  @IsOptional()
  @IsString()
  iban?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  swiftCode?: string;
}
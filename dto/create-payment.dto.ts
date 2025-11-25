import { IsNumber, IsString, IsOptional, Min, Max, IsPositive, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePayoutDto {
  @IsNumber()
  @IsPositive({ message: 'Payout amount must be a positive number' })
  @Min(1, { message: 'Payout amount must be at least 1 SAR' })
  @Max(100000, { message: 'Payout amount cannot exceed 100,000 SAR' })
  @Type(() => Number)
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Notes cannot exceed 500 characters' })
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Payment method cannot exceed 50 characters' })
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Transaction reference cannot exceed 100 characters' })
  transactionReference?: string;
}
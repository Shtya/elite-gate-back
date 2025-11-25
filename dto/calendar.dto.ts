import { IsNotEmpty, IsEnum, IsOptional, IsString, IsNumber } from 'class-validator';
import { CalendarProvider } from '../entities/global.entity';

export class ConnectCalendarAccountDto {
  @IsNotEmpty()
  @IsEnum(CalendarProvider)
  provider: CalendarProvider;

  @IsNotEmpty()
  @IsString()
  accessToken: string;

  @IsNotEmpty()
  @IsString()
  refreshToken: string;

  @IsNotEmpty()
  @IsString()
  externalAccountId: string;

  @IsNotEmpty()
  @IsString()
  tokenExpiresAt: string;
}

export class SyncAppointmentDto {
  @IsNotEmpty()
  @IsNumber()
  appointmentId: number;

  @IsOptional()
  @IsEnum(CalendarProvider)
  provider?: CalendarProvider;
}

export class CalendarQueryDto {
  @IsOptional()
  @IsEnum(CalendarProvider)
  provider?: CalendarProvider;

  @IsOptional()
  @IsNumber()
  userId?: number;
}
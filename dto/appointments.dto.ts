import { IsNotEmpty, IsNumber, IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { AppointmentStatus, CreatedChannel } from '../entities/global.entity';
import { Type } from 'class-transformer';

export class CreateAppointmentDto {
  @IsNotEmpty()
  @IsNumber()
  propertyId: number;

  @IsOptional()
  @IsNumber()
  customerId: number;

  @IsOptional()
  @IsNumber()
  agentId?: number;

  @IsNotEmpty()
  @IsDateString()
  appointmentDate: string;

  @IsNotEmpty()
  @IsString()
  startTime: string;

  @IsNotEmpty()
  @IsString()
  endTime: string;

  @IsOptional()
  @IsString()
  customerNotes?: string;

  @IsOptional()
  @IsEnum(CreatedChannel)
  createdChannel?: CreatedChannel;
}

export class UpdateAppointmentDto {
  @IsOptional()
  @IsNumber()
  agentId?: number;

  @IsOptional()
  @IsDateString()
  appointmentDate?: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @IsOptional()
  @IsString()
  customerNotes?: string;

  @IsOptional()
  @IsString()
  agentNotes?: string;
}

export class AssignAgentDto {
  @IsNotEmpty()
  @IsNumber()
  agentId: number;
}

export class UpdateStatusDto {
  @IsNotEmpty()
  @IsEnum(AppointmentStatus)
  status: AppointmentStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class AppointmentQueryDto {
  @IsOptional()
  @IsNumber()
  customerId?: number;

  @IsOptional()
  @IsNumber()
  agentId?: number;

  @IsOptional()
  @IsNumber()
  propertyId?: number;

  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

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

export class BookWithRegistrationDto extends CreateAppointmentDto {
  @IsNotEmpty()
  @IsString()
  phoneNumber: string;

  @IsNotEmpty()
  @IsString()
  email: string;

  @IsNotEmpty()
  @IsString()
  fullName: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  profilePhotoUrl?: string;
}

export class AvailabilityQueryDto {
  @IsNotEmpty()
  @Type(() => Number)
  propertyId: number;

  @IsOptional()
  @IsDateString()
  date?: string;
}
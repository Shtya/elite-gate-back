import { IsNotEmpty, IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';

export class CreateAgentAvailabilityDto {
  @IsNotEmpty()
  @IsNumber()
  agentId: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsNotEmpty()
  @IsString()
  startTime: string;

  @IsNotEmpty()
  @IsString()
  endTime: string;
}

export class UpdateAgentAvailabilityDto {
  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;
}

export class CreateAgentPreferredPropertyDto {
  @IsNotEmpty()
  @IsNumber()
  agentId: number;

  @IsNotEmpty()
  @IsNumber()
  propertyId: number;
}

export class AgentAvailabilityQueryDto {
  @IsOptional()
  @IsNumber()
  agentId?: number;

  @IsOptional()
  @IsNumber()
  dayOfWeek?: number;
}
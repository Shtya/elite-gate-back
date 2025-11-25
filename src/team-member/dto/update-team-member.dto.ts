// src/team/dto/update-team-member.dto.ts
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateTeamMemberDto {
  @IsString() @IsOptional() @MaxLength(150)
  name?: string;

  @IsString() @IsOptional() @MaxLength(150)
  position?: string;

  // image comes via multipart ("image" field) — no field here
}

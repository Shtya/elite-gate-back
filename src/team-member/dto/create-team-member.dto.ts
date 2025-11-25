// src/team/dto/create-team-member.dto.ts
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateTeamMemberDto {
  @IsString() @IsNotEmpty() @MaxLength(150)
  name!: string;

  @IsString() @IsNotEmpty() @MaxLength(150)
  position!: string;

  // image comes via multipart ("image" field) — no field here
}

import { IsEnum, IsNotEmpty, IsOptional, IsString, IsBoolean, IsNumber, IsEmail, MinLength, MaxLength } from 'class-validator';
import { UserType, VerificationStatus } from '../entities/global.entity';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  // Admin-created users should set an initial password
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsEnum(UserType)
  userType: UserType;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  profilePhotoUrl?: string;

  @IsOptional()
  @IsString()
  nationalIdUrl?: string;

  @IsOptional()
  @IsString()
  residencyIdUrl?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsEnum(UserType)
  userType?: UserType;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  profilePhotoUrl?: string;

  @IsOptional() @IsString() nationalIdUrl?: string;
  @IsOptional() @IsString() residencyIdUrl?: string;

  @IsOptional()
  @IsEnum(VerificationStatus)
  verificationStatus?: VerificationStatus;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class VerifyUserDto {
  @IsEnum(VerificationStatus)
  status: VerificationStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UserQueryDto {
  @IsOptional()
  @IsEnum(UserType)
  userType?: UserType;

  @IsOptional()
  @IsEnum(VerificationStatus)
  verificationStatus?: VerificationStatus;

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
export class CreateContactUsDto {
  @IsNotEmpty()
name: string;

@IsEmail()
@MaxLength(255)
email: string;

@IsNotEmpty()
message: string;
}

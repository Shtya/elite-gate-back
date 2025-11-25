import { IsEmail, IsEnum, IsNotEmpty, IsNumber, IsOptional, isPhoneNumber, IsPhoneNumber, IsString, MinLength } from 'class-validator';
import { UserType } from '../entities/global.entity';
import { Optional } from '@nestjs/common';
import { Type } from 'class-transformer';

export class LoginDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsPhoneNumber()
  phoneNumber?: string;

  @IsString()
  password: string;
}

export class RegisterDto {
  @IsOptional()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEnum(UserType)
  userType: UserType;

  // Optional now; we no longer use phone for auth
  @IsOptional()
  @IsPhoneNumber()

  phoneNumber: string;

  @IsOptional()
  profilePhotoUrl?: string;

  @IsOptional()
  identityProof?: string;
  
  @IsOptional()
  residencyDocument?: string;
@Optional()
@Type(() => Number) 
@IsNumber()
visitAmount?:number

}

export class VerifyOtpDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsPhoneNumber()
  phoneNumber?: string;

  @IsString()
  otp: string;
}
export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
  
}
export class ForgotPasswordPhoneDto {
  @IsPhoneNumber()
  phoneNumber: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword: string;
}
export class ResetPasswordPhoneDto {

  @IsPhoneNumber()
  phoneNumber: string;
  @IsString()
  otp: string;
  @IsString()
  newPassword: string;
}
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  profilePhotoUrl?: string;
}

export class EmailLoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class VerifyEmailOtpDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  otp: string;
}

export class VerifyPhoneOtpDto {
  @IsPhoneNumber()
  phoneNumber: string;

  @IsString()
  otp: string;
}
export class PhoneLoginDto {
  @IsPhoneNumber()
  phoneNumber: string;
}
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsBoolean, IsNumber, IsEmail, MinLength, MaxLength } from 'class-validator';
import { UserType, VerificationStatus } from '../entities/global.entity';

export class CreateUserDto {
  @IsEmail({}, { message: "البريد الإلكتروني غير صالح" })
  @IsNotEmpty({ message: "هذا الحقل مطلوب" })
  email: string;

  @IsString({ message: "يجب أن يكون نصاً" })
  @IsNotEmpty({ message: "هذا الحقل مطلوب" })
  fullName: string;

  // Admin-created users should set an initial password
  @IsString({ message: 'يجب أن يكون نصاً' })
  @IsNotEmpty({ message: 'هذا الحقل مطلوب' })
  @MinLength(6, { message: 'يجب أن لا يقل عن 6 حرفاً' })
  password: string;

  @IsEnum(UserType, { message: 'قيمة غير صالحة' })
  userType: UserType;

  @IsOptional()
  @IsString({ message: 'يجب أن يكون نصاً' })
  phoneNumber?: string;

  @IsOptional()
  @IsString({ message: 'يجب أن يكون نصاً' })
  profilePhotoUrl?: string;

  @IsOptional()
  @IsString({ message: 'يجب أن يكون نصاً' })
  nationalIdUrl?: string;

  @IsOptional()
  @IsString({ message: 'يجب أن يكون نصاً' })
  residencyIdUrl?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsEmail({}, { message: 'البريد الإلكتروني غير صالح' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'يجب أن يكون نصاً' })
  fullName?: string;

  @IsOptional()
  @IsEnum(UserType, { message: 'قيمة غير صالحة' })
  userType?: UserType;

  @IsOptional()
  @IsString({ message: 'يجب أن يكون نصاً' })
  @MinLength(6, { message: 'يجب أن لا يقل عن 6 حرفاً' })
  password?: string;

  @IsOptional()
  @IsString({ message: 'يجب أن يكون نصاً' })
  phoneNumber?: string;

  @IsOptional()
  @IsString({ message: 'يجب أن يكون نصاً' })
  profilePhotoUrl?: string;

  @IsOptional() @IsString({ message: 'يجب أن يكون نصاً' }) nationalIdUrl?: string;
  @IsOptional() @IsString({ message: 'يجب أن يكون نصاً' }) residencyIdUrl?: string;

  @IsOptional()
  @IsEnum(VerificationStatus, { message: 'قيمة غير صالحة' })
  verificationStatus?: VerificationStatus;

  @IsOptional()
  @IsBoolean({ message: 'يجب أن يكون قيمة منطقية' })
  isActive?: boolean;
}

export class VerifyUserDto {
  @IsEnum(VerificationStatus, { message: 'قيمة غير صالحة' })
  status: VerificationStatus;

  @IsOptional()
  @IsString({ message: 'يجب أن يكون نصاً' })
  notes?: string;
}

export class UserQueryDto {
  @IsOptional()
  @IsEnum(UserType, { message: 'قيمة غير صالحة' })
  userType?: UserType;

  @IsOptional()
  @IsEnum(VerificationStatus, { message: 'قيمة غير صالحة' })
  verificationStatus?: VerificationStatus;

  @IsOptional()
  @IsBoolean({ message: 'يجب أن يكون قيمة منطقية' })
  isActive?: boolean;

  @IsOptional()
  @IsNumber({}, { message: 'يجب أن يكون رقماً' })
  page?: number;

  @IsOptional()
  @IsNumber({}, { message: 'يجب أن يكون رقماً' })
  limit?: number;
}
export class CreateContactUsDto {
  @IsNotEmpty({ message: 'هذا الحقل مطلوب' })
name: string;

@IsEmail({}, { message: 'البريد الإلكتروني غير صالح' })
@MaxLength(255, { message: 'يجب أن لا يزيد عن 255 حرفاً' })
email: string;

@IsNotEmpty({ message: 'هذا الحقل مطلوب' })
message: string;
}

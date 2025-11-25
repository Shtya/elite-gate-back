import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Put,
  Get,
  BadRequestException,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import {
  LoginDto,
  RegisterDto,
  VerifyOtpDto,
  RefreshTokenDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  UpdateProfileDto,
  EmailLoginDto,
  VerifyEmailOtpDto,
  PhoneLoginDto,
  VerifyPhoneOtpDto,
  ForgotPasswordPhoneDto,
  ResetPasswordPhoneDto,
} from "../../dto/auth.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { Request } from "express";

interface RequestWithUser extends Request {
  user: any;
}

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post("verify-otp")
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyOtp(verifyOtpDto);
  }

  @Post("refresh-token")
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: RequestWithUser) {
    return this.authService.logout(req.user.id);
  }

  @Put("profile")
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Req() req: RequestWithUser,
    @Body() updateProfileDto: UpdateProfileDto
  ) {
    return this.authService.updateProfile(req.user.id, updateProfileDto);
  }

  @Post("change-password")
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Req() req: RequestWithUser,
    @Body() changePasswordDto: ChangePasswordDto
  ) {
    return this.authService.changePassword(req.user.id, changePasswordDto);
  }

  @Post("forgot-password")
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post("reset-password")
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }
  @Post("phone/register")
  async phoneRegister(@Body() registerDto: RegisterDto) {
    if (!registerDto.phoneNumber) {
      throw new BadRequestException("Phone number is required");
    }
    return this.authService.phoneRegister(registerDto);
  }

  @Post("phone/send-otp")
  async sendPhoneOtp(@Body() phoneLoginDto: PhoneLoginDto) {
    return this.authService.sendPhoneOtp(phoneLoginDto.phoneNumber);
  }

  @Post("phone/verify-otp")
  async verifyPhoneOtp(@Body() verifyPhoneOtpDto: VerifyPhoneOtpDto) {
    return this.authService.verifyPhoneOtp(verifyPhoneOtpDto);
  }

  @Post("phone/login")
  async phoneLogin(@Body() phoneLoginDto: PhoneLoginDto) {
    return this.authService.sendPhoneOtp(phoneLoginDto.phoneNumber);
  }

  @Post("resend-phone-otp")
  async resendPhoneOtp(@Body('phoneNumber') phoneNumber: string) {
    if (!phoneNumber) {
      throw new BadRequestException('Phone number is required');
    }
    return this.authService.resendPhoneOtp(phoneNumber);
  }
  @Get("profile")
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: RequestWithUser) {
    return this.authService.getProfile(req.user.id);
  }
  @Post("login/send-otp")
  async sendLoginOtp(@Body() dto: EmailLoginDto) {
    return this.authService.sendEmailLoginOtp(dto);
  }

  @Post("login/verify-otp")
  async verifyLoginOtp(@Body() dto: VerifyEmailOtpDto) {
    return this.authService.verifyOtp(dto);
  }
  @Post('resend-otp')
async resendOtp(@Body('email') email: string) {
  if (!email) {
    throw new BadRequestException('Email is required');
  }
  return this.authService.resendOtp(email);
}
@Post("forgot-password/phone")
async forgotPasswordPhone(@Body() dto: ForgotPasswordPhoneDto) {
  return this.authService.forgotPasswordByPhone(dto.phoneNumber);

  
}
@Post("reset-password/phone")
async resetPasswordPhone(@Body() dto: ResetPasswordPhoneDto) {
  return this.authService.resetPasswordByPhone(dto);
}
}

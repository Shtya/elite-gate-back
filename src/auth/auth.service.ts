import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  User,
  AuthSession,
  VerificationStatus,
  NotificationType,
  NotificationChannel,
  UserType,
} from "entities/global.entity";
import {
  LoginDto,
  RegisterDto,
  VerifyOtpDto,
  ChangePasswordDto,
  ResetPasswordDto,
  UpdateProfileDto,
  EmailLoginDto,
  VerifyEmailOtpDto,
  PhoneLoginDto,
  VerifyPhoneOtpDto,
  ResetPasswordPhoneDto,
} from "../../dto/auth.dto";

import { MailService } from "../../common/nodemailer";
import * as bcrypt from "bcryptjs";
import { NotificationsService } from "../notifications/notifications.service";

// SMS Service for phone number OTP
// @Injectable()
// export class SmsService {
//   private readonly logger = new Logger(SmsService.name);

//   async sendSms(phoneNumber: string, message: string): Promise<void> {
//     try {
//       // هنا هنعمل ال sms service

//       this.logger.log(`SMS sent to ${phoneNumber}: ${message}`);
//       console.log(`📱 SMS sent to ${phoneNumber}: ${message}`);
//     } catch (error) {
//       this.logger.error(`Failed to send SMS to ${phoneNumber}:`, error);
//       throw new Error(`Failed to send SMS: ${error.message}`);
//     }
//   }
// }

// WhatsApp Service for WhatsApp OTP
// @Injectable()
// export class WhatsAppService {
//   private readonly logger = new Logger(WhatsAppService.name);

//   async sendWhatsAppMessage(phoneNumber: string, message: string): Promise<void> {
//     try {


//       this.logger.log(`WhatsApp message sent to ${phoneNumber}: ${message}`);
//       console.log(`💬 WhatsApp message sent to ${phoneNumber}: ${message}`);
//     } catch (error) {
//       this.logger.error(`Failed to send WhatsApp message to ${phoneNumber}:`, error);
//       throw new Error(`Failed to send WhatsApp message: ${error.message}`);
//     }
//   }
// }

@Injectable()
export class AuthService {
  private readonly logger = new Logger("AuthService");

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(AuthSession)
    private authSessionRepository: Repository<AuthSession>,
    private jwtService: JwtService,
    private mailService: MailService,
    // private smsService: SmsService,
    // private whatsAppService: WhatsAppService,
    private notificationsService: NotificationsService
  ) {}

  /**
   * Universal registration that supports both email and phone
   * Sends OTP via appropriate channel (email, SMS, or WhatsApp)
   */
  async register(registerDto: RegisterDto): Promise<{ message: string }> {
    // Validate that either email or phone number is provided
    if (!registerDto.email && !registerDto.phoneNumber) {
      throw new BadRequestException("Either email or phone number is required");
    }

    // Check for existing users
    const existingUser = await this.findUserByIdentifier(
      registerDto.email,
      registerDto.phoneNumber
    );

    if (existingUser) {
      if (existingUser.verificationStatus !== VerificationStatus.VERIFIED) {
        // User exists but not verified → resend OTP via appropriate channel
        return await this.handleResendOtp(existingUser);
      }
      throw new ConflictException("User with this email or phone already exists");
    }

    // Create new user
    return await this.createNewUser(registerDto);
  }

  async phoneRegister(registerDto: RegisterDto): Promise<{ message: string }> {
    if (!registerDto.phoneNumber) {
      throw new BadRequestException("Phone number is required for phone registration");
    }

    const existingUser = await this.usersRepository.findOne({
      where: { phoneNumber: registerDto.phoneNumber }
    });

    if (existingUser) {
      if (existingUser.verificationStatus !== VerificationStatus.VERIFIED) {
        return await this.handleResendPhoneOtp(existingUser);
      }
      throw new ConflictException("User with this phone number already exists");
    }

    // Create user with phone number (password is optional for phone registration)
    const passwordHash = registerDto.password
      ? await bcrypt.hash(registerDto.password, 12)
      : null;

    const user = this.usersRepository.create({
      phoneNumber: registerDto.phoneNumber,
      fullName: registerDto.fullName,
      userType: UserType.CUSTOMER,
      profilePhotoUrl: registerDto.profilePhotoUrl,
      passwordHash,
      verificationStatus: VerificationStatus.PENDING,
    });

    await this.usersRepository.save(user);

    // Send OTP via phone
    await this.sendPhoneOtpToUser(user);

    return { message: "Registration successful. We sent a verification code to your phone." };
  }

  /**
   * Send OTP for phone login/registration
   */
  async sendPhoneOtp(phoneNumber: string): Promise<{ message: string }> {
    const user = await this.usersRepository.findOne({
      where: { phoneNumber }
    });

    if (!user) {

      return { message: "If this phone number is registered, a verification code has been sent" };
    }

    await this.sendPhoneOtpToUser(user);

    return { message: "Verification code sent to your phone" };
  }


  async verifyPhoneOtp(
    verifyPhoneOtpDto: VerifyPhoneOtpDto
  ): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    const user = await this.usersRepository.findOne({
      where: { phoneNumber: verifyPhoneOtpDto.phoneNumber }
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Check phone OTP validity
    if (
      !user.phoneOtp ||
      user.phoneOtp !== verifyPhoneOtpDto.otp ||
      !user.phoneOtpExpiresAt ||
      user.phoneOtpExpiresAt < new Date()
    ) {
      throw new UnauthorizedException("Invalid or expired OTP");
    }

    // Clear OTP
    user.phoneOtp = null;
    user.phoneOtpExpiresAt = null;

    // Mark as verified if not already
    if (user.verificationStatus !== VerificationStatus.VERIFIED) {
      user.verificationStatus = VerificationStatus.VERIFIED;
      user.verifiedAt = new Date();
    }

    await this.usersRepository.save(user);

    // Send welcome notification for new verified users
    if (user.verificationStatus === VerificationStatus.VERIFIED) {
      await this.notificationsService.createNotification({
        userId: user.id,
        type: NotificationType.SYSTEM,
        title: "Welcome to Our Platform!",
        message: "Your account has been successfully verified and you can now access all features.",
        channel: NotificationChannel.IN_APP,
      });
    }

    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        email: user.email,
        fullName: user.fullName,
        userType: UserType.CUSTOMER,
        verificationStatus: user.verificationStatus,
      }
    };
  }

  /**
   * Universal OTP verification that works for both email and phone
   */
  async verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<{ accessToken: string; refreshToken: string,user :User }> {
    let user: User;

    if (verifyOtpDto.email) {
      user = await this.usersRepository.findOne({
        where: { email: verifyOtpDto.email }
      });
    } else if (verifyOtpDto.phoneNumber) {
      user = await this.usersRepository.findOne({
        where: { phoneNumber: verifyOtpDto.phoneNumber }
      });
    } else {
      throw new BadRequestException("Either email or phone number is required");
    }

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Check both email and phone OTP
    const isEmailOtpValid = verifyOtpDto.email &&
      user.emailOtp === verifyOtpDto.otp &&
      user.emailOtpExpiresAt &&
      user.emailOtpExpiresAt > new Date();

    const isPhoneOtpValid = verifyOtpDto.phoneNumber &&
      user.phoneOtp === verifyOtpDto.otp &&
      user.phoneOtpExpiresAt &&
      user.phoneOtpExpiresAt > new Date();

    if (!isEmailOtpValid && !isPhoneOtpValid) {
      throw new UnauthorizedException("Invalid or expired OTP");
    }

    // Clear the used OTP
    if (isEmailOtpValid) {
      user.emailOtp = null;
      user.emailOtpExpiresAt = null;
    }
    if (isPhoneOtpValid) {
      user.phoneOtp = null;
      user.phoneOtpExpiresAt = null;
    }

    user.verificationStatus = VerificationStatus.VERIFIED;
    user.verifiedAt = new Date();
    await this.usersRepository.save(user);

    // Send welcome email if user has email
    if (user.email) {
      try {
        await this.mailService.sendWelcomeEmail(user.email, {
          userName: user.fullName,
          userType: UserType.CUSTOMER,
        });
      } catch (error) {
        this.logger.error(`Failed to send welcome email to ${user.email}:`, error);
      }
    }

    // Send welcome notification
    await this.notificationsService.createNotification({
      userId: user.id,
      type: NotificationType.SYSTEM,
      title: "Your Account Has Been Verified",
      message: "Congratulations! Your account has been successfully verified and you can now access all platform features.",
      channel: NotificationChannel.IN_APP,
    });

    return { ...await this.generateTokens(user), user };
  }

  /**
   * Universal login that supports both email and phone with password
   */
  async login(loginDto: LoginDto): Promise<{ accessToken: string; refreshToken: string,user:User }> {
    let user: User;

    if (loginDto.email) {
      user = await this.usersRepository.findOne({
        where: { email: loginDto.email }
      });
    } else if (loginDto.phoneNumber) {
      user = await this.usersRepository.findOne({
        where: { phoneNumber: loginDto.phoneNumber }
      });
    } else {
      throw new BadRequestException("Either email or phone number is required");
    }

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (user.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new UnauthorizedException("Please verify your account before logging in");
    }

    if (user.isActive === false) {
      throw new UnauthorizedException("Your account has been deactivated. Please contact support.");
    }

    return { ...await this.generateTokens(user), user };
  }

  /**
   * Send login OTP via email
   */
  async sendEmailLoginOtp({ email }: EmailLoginDto): Promise<{ message: string }> {
    const user = await this.usersRepository.findOne({ where: { email } });

    if (!user) {
      // For security, don't reveal if user exists
      return { message: "If this email is registered, a login code has been sent" };
    }

    const otp = this.generateOtp();
    user.emailOtp = otp;
    user.emailOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await this.usersRepository.save(user);

    try {
      await this.mailService.sendOtpEmail(user.email, {
        otp,
        userName: user.fullName,
        purpose: "login",
      });
      this.logger.log(`Login OTP email sent to ${user.email} and the otp is: ${otp}`);
    } catch (error) {
      this.logger.error(`Failed to send login OTP email to ${user.email}:`, error);
    }

    return { message: "A login code has been sent to your email." };
  }

  /**
   * Verify email OTP for login
   */
  async verifyEmailLoginOtp({
    email,
    otp,
  }: VerifyEmailOtpDto): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const user = await this.usersRepository.findOne({ where: { email } });

    if (
      !user ||
      !user.emailOtp ||
      user.emailOtp !== otp ||
      user.emailOtpExpiresAt < new Date()
    ) {
      throw new UnauthorizedException("Invalid or expired OTP");
    }

    user.emailOtp = null;
    user.emailOtpExpiresAt = null;
    await this.usersRepository.save(user);

    // Auto-verify if not already verified
    if (user.verificationStatus !== VerificationStatus.VERIFIED) {
      user.verificationStatus = VerificationStatus.VERIFIED;
      user.verifiedAt = new Date();
      await this.usersRepository.save(user);
    }

    if (user.isActive === false) {
      throw new UnauthorizedException("Your account has been deactivated.");
    }

    return this.generateTokens(user);
  }

  /**
   * Resend OTP for email verification
   */
  async resendOtp(email: string): Promise<{ message: string }> {
    const user = await this.usersRepository.findOne({ where: { email } });

    if (!user) {
      throw new NotFoundException("No account found with this email");
    }

    if (user.verificationStatus === VerificationStatus.VERIFIED) {
      throw new ConflictException("This email is already verified");
    }

    const otp = this.generateOtp();
    user.emailOtp = otp;
    user.emailOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await this.usersRepository.save(user);

    try {
      await this.mailService.sendOtpEmail(user.email, {
        otp,
        userName: user.fullName,
        purpose: "registration",
      });
      this.logger.log(`OTP resent to ${user.email} and the otp is: ${otp}`);
    } catch (error) {
      this.logger.error(`Failed to resend OTP email to ${user.email}:`, error);
    }

    return { message: "A new OTP has been sent to your email. Please verify your account." };
  }

  /**
   * Resend OTP for phone verification
   */
  async resendPhoneOtp(phoneNumber: string): Promise<{ message: string }> {
    const user = await this.usersRepository.findOne({
      where: { phoneNumber }
    });

    if (!user) {
      throw new NotFoundException("No account found with this phone number");
    }

    if (user.verificationStatus === VerificationStatus.VERIFIED) {
      throw new ConflictException("This phone number is already verified");
    }

    await this.sendPhoneOtpToUser(user);

    return { message: "A new OTP has been sent to your phone" };
  }

  // ========== HELPER METHODS ==========

  /**
   * Find user by email or phone number
   */
  private async findUserByIdentifier(email?: string, phoneNumber?: string): Promise<User | null> {
    const whereConditions: any[] = [];
    if (email) whereConditions.push({ email });
    if (phoneNumber) whereConditions.push({ phoneNumber });

    if (whereConditions.length === 0) return null;

    return await this.usersRepository.findOne({
      where: whereConditions,
    });
  }

  /**
   * Handle OTP resend for existing unverified users
   */
  private async handleResendOtp(user: User): Promise<{ message: string }> {
    const otp = this.generateOtp();
    let message = "A new OTP has been sent";

    if (user.email) {
      user.emailOtp = otp;
      user.emailOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      try {
        await this.mailService.sendOtpEmail(user.email, {
          otp,
          userName: user.fullName,
          purpose: "registration",
        });
        message += " to your email";
        this.logger.log(`OTP resent to email: ${user.email} and the otp is: ${otp}`);
      } catch (error) {
        this.logger.error(`Failed to resend OTP email to ${user.email}:`, error);
      }
    }

    if (user.phoneNumber) {
      user.phoneOtp = otp;
      user.phoneOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      try {
        // await this.sendPhoneOtp(user.phoneNumber, otp, "registration");
        message += user.email ? " and phone" : " to your phone";
        this.logger.log(`OTP resent to phone: ${user.phoneNumber} and the otp is: ${otp}`);
      } catch (error) {
        this.logger.error(`Failed to resend OTP to phone ${user.phoneNumber}:`, error);
      }
    }

    await this.usersRepository.save(user);
    return { message: message + ". Please verify your account." };
  }

  /**
   * Handle phone OTP resend
   */
  private async handleResendPhoneOtp(user: User): Promise<{ message: string }> {
    await this.sendPhoneOtpToUser(user);
    return { message: "A new OTP has been sent to your phone" };
  }

  /**
   * Create new user with OTP sending
   */
  private async createNewUser(registerDto: RegisterDto): Promise<{ message: string }> {
    const passwordHash = await bcrypt.hash(registerDto.password, 12);

    const user = this.usersRepository.create({
      email: registerDto.email,
      phoneNumber: registerDto.phoneNumber,
      fullName: registerDto.fullName,
      userType: UserType.CUSTOMER,
      profilePhotoUrl: registerDto.profilePhotoUrl,
      passwordHash,
      verificationStatus: VerificationStatus.PENDING,
    });

    await this.usersRepository.save(user);

    const otp = this.generateOtp();
    let message = "Registration successful. We sent a verification code";

    // Send OTP via appropriate channel(s)
    if (registerDto.email) {
      user.emailOtp = otp;
      user.emailOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      try {
        await this.mailService.sendOtpEmail(user.email, {
          otp,
          userName: user.fullName,
          purpose: "registration",
        });
        message += " to your email";
        this.logger.log(`OTP sent to email: ${user.email} and the otp is: ${otp}` );
      } catch (error) {
        this.logger.error(`Failed to send OTP email to ${user.email}:`, error);
      }
    }

    if (registerDto.phoneNumber) {
      user.phoneOtp = otp;
      user.phoneOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      try {
        // await this.sendPhoneOtp(registerDto.phoneNumber, otp, "registration");
        message += registerDto.email ? " and phone" : " to your phone";
        this.logger.log(`OTP sent to phone: ${registerDto.phoneNumber} and the otp is: ${otp}`);
      } catch (error) {
        this.logger.error(`Failed to send OTP to phone ${registerDto.phoneNumber}:`, error);
      }
    }

    await this.usersRepository.save(user);
    return { message: message + "." };
  }

  /**
   * Send OTP to user's phone (SMS or WhatsApp)
   */
  private async sendPhoneOtpToUser(user: User): Promise<void> {
    const otp = this.generateOtp();
    user.phoneOtp = otp;
    user.phoneOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    this.logger.log(`Login OTP email sent to ${user.phoneNumber} and the otp is: ${otp}`);

    await this.usersRepository.save(user);

    // await this.sendPhoneOtp(user.phoneNumber, otp, "verification");
  }

  /**
   * Send OTP via phone channel (SMS or WhatsApp)
   */
  // private async sendPhoneOtp(phoneNumber: string, otp: string, purpose: string): Promise<void> {
  //   const message = `Your verification code is: ${otp}. This code will expire in 10 minutes.`;

  //   try {
  //     // Try WhatsApp first if available, otherwise fall back to SMS
  //     // TODO: You might want to make this configurable based on user preference
  //     await this.whatsAppService.sendWhatsAppMessage(phoneNumber, message);
  //     this.logger.log(`WhatsApp OTP sent to ${phoneNumber}`);
  //   } catch (whatsappError) {
  //     this.logger.warn(`WhatsApp failed for ${phoneNumber}, falling back to SMS:`, whatsappError);

  //     // Fall back to SMS
  //     try {
  //       await this.smsService.sendSms(phoneNumber, message);
  //       this.logger.log(`SMS OTP sent to ${phoneNumber}`);
  //     } catch (smsError) {
  //       this.logger.error(`Both WhatsApp and SMS failed for ${phoneNumber}:`, smsError);
  //       throw new Error(`Failed to send OTP via any phone channel: ${smsError.message}`);
  //     }
  //   }
  // }

  /**
   * Generate random OTP
   */
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Generate JWT tokens
   */
  private async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = {
      sub: user.id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      userType: user.userType,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: "7d" });

    const authSession = this.authSessionRepository.create({
      user,
      refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await this.authSessionRepository.save(authSession);

    return { accessToken, refreshToken };
  }

  // ========== EXISTING METHODS (keep as is) ==========

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      return { message: "If this email exists, a reset code has been sent" };
    }

    const otp = this.generateOtp();
    user.resetOtp = otp;
    user.resetOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await this.usersRepository.save(user);

    try {
      await this.mailService.sendOtpEmail(user.email, {
        otp,
        userName: user.fullName,
        purpose: "password_reset",
      });
      this.logger.log(`Password reset OTP email sent to ${user.email} and the otp is: ${otp}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset OTP email to ${user.email}:`, error);
    }

    return { message: "If this email exists, a reset code has been sent" };
  }

  async resetPassword({
    token,
    newPassword,
  }: ResetPasswordDto): Promise<{ message: string }> {
    const user = await this.usersRepository.findOne({
      where: { resetOtp: token },
    });

    if (
      !user ||
      !user.resetOtpExpiresAt ||
      user.resetOtpExpiresAt < new Date()
    ) {
      throw new UnauthorizedException("Invalid or expired reset token");
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.resetOtp = null;
    user.resetOtpExpiresAt = null;
    await this.usersRepository.save(user);

    return { message: "Password reset successfully" };
  }

  async refreshToken(
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const session = await this.authSessionRepository.findOne({
        where: { refreshToken },
        relations: ["user"],
      });

      if (!session || session.revokedAt || session.expiresAt < new Date()) {
        throw new UnauthorizedException("Invalid refresh token");
      }

      session.revokedAt = new Date();
      await this.authSessionRepository.save(session);

      return this.generateTokens(session.user);
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  async logout(userId: number): Promise<{ message: string }> {
    await this.authSessionRepository.update(
      { user: { id: userId } },
      { revokedAt: new Date() }
    );
    return { message: "Logged out successfully" };
  }

  async updateProfile(
    userId: number,
    updateProfileDto: UpdateProfileDto
  ): Promise<User> {
    if (updateProfileDto.email) {
      const exists = await this.usersRepository.findOne({
        where: { email: updateProfileDto.email },
      });
      if (exists && exists.id !== userId) {
        throw new BadRequestException("Email already in use");
      }
    }

    await this.usersRepository.update(userId, updateProfileDto);
    return this.usersRepository.findOne({ where: { id: userId } });
  }

  async changePassword(
    userId: number,
    { currentPassword, newPassword }: ChangePasswordDto
  ): Promise<{ message: string }> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("User not found");
    }

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Current password is incorrect");

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await this.usersRepository.save(user);

    return { message: "Password changed successfully" };
  }

  async getProfile(userId: number): Promise<User> {
    return this.usersRepository.findOne({ where: { id: userId } });
  }

  async validateUser(payload: any): Promise<User> {
    return this.usersRepository.findOne({
      where: { id: payload.sub },
      select: [
        "id",
        "email",
        "phoneNumber",
        "userType",
        "verificationStatus",
        "isActive",
      ],
    });
  }
  async forgotPasswordByPhone(phoneNumber: string): Promise<{ message: string }> {
    const user = await this.usersRepository.findOne({ where: { phoneNumber } });

    // Always return same message for security
    if (!user) {
      return { message: "If this phone number exists, a reset code has been sent" };
    }

    const otp = this.generateOtp();
    user.resetOtp = otp;
    user.resetOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await this.usersRepository.save(user);

    // Send SMS/WhatsApp if you want, for now just log
    this.logger.log(`📱 Password reset OTP for ${user.phoneNumber}: ${otp}`);

    return { message: "If this phone number exists, a reset code has been sent" };
  }
  async resetPasswordByPhone({
    phoneNumber,
    otp,
    newPassword,
  }: ResetPasswordPhoneDto): Promise<{ message: string }> {
    const user = await this.usersRepository.findOne({ where: { phoneNumber } });
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    if (!user.resetOtp) {
      throw new UnauthorizedException("Reset code not generated");
    }
    console.log(user.resetOtp)
    console.log(otp)
    if (user.resetOtp !== otp) {
      throw new UnauthorizedException("Invalid reset code");
    }

    if (!user.resetOtpExpiresAt || user.resetOtpExpiresAt < new Date()) {
      throw new UnauthorizedException("Reset code expired");
    }
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.resetOtp = null;
    user.resetOtpExpiresAt = null;
    await this.usersRepository.save(user);

    return { message: "Password reset successfully" };
  }

}
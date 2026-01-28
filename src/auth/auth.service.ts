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

    // Normalize phone number (trim whitespace)
    const normalizedPhone = registerDto.phoneNumber.trim();
    
    this.logger.log(`[Phone Register] Normalized phone: "${normalizedPhone}" (original: "${registerDto.phoneNumber}")`);

    const existingUser = await this.usersRepository.findOne({
      where: { phoneNumber: normalizedPhone }
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
      phoneNumber: normalizedPhone,
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
    // Normalize phone number (trim whitespace)
    const normalizedPhone = phoneNumber.trim();
    
    this.logger.log(`[Send Phone OTP] Searching for user with phone: "${normalizedPhone}" (original: "${phoneNumber}")`);
    
    const user = await this.usersRepository.findOne({
      where: { phoneNumber: normalizedPhone }
    });
    
    this.logger.log(`[Send Phone OTP] User found: ${user ? `Yes (ID: ${user.id})` : 'No'}`);

    if (!user) {

      return { message: "If this phone number is registered, a verification code has been sent" };
    }

    await this.sendPhoneOtpToUser(user);

    return { message: "Verification code sent to your phone" };
  }


  async verifyPhoneOtp(
    verifyPhoneOtpDto: VerifyPhoneOtpDto
  ): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    // Normalize phone number (trim whitespace)
    const normalizedPhone = verifyPhoneOtpDto.phoneNumber ? verifyPhoneOtpDto.phoneNumber.trim() : null;
    
    // Log what we're searching for
    this.logger.log(`[Phone OTP] Searching for user...`);
    this.logger.log(`[Phone OTP] Phone: "${normalizedPhone}" (original: "${verifyPhoneOtpDto.phoneNumber}")`);
    
    let user = null;
    
    // If phone number is provided, search by phone
    if (normalizedPhone && normalizedPhone !== '') {
      // Use QueryBuilder to ensure OTP fields are loaded
      user = await this.usersRepository
        .createQueryBuilder('user')
        .addSelect('user.phoneOtp')
        .addSelect('user.phoneOtpExpiresAt')
        .addSelect('user.emailOtp')
        .addSelect('user.emailOtpExpiresAt')
        .where('user.phoneNumber = :phone', { phone: normalizedPhone })
        .getOne();
    } else {
      // If no phone number, try to find user by email OTP (in case they're using wrong endpoint)
      // Search for users with matching emailOtp
      this.logger.log(`[Phone OTP] No phone number provided, searching by email OTP...`);
      const normalizedOtp = String(verifyPhoneOtpDto.otp).trim();
      
      user = await this.usersRepository
        .createQueryBuilder('user')
        .addSelect('user.phoneOtp')
        .addSelect('user.phoneOtpExpiresAt')
        .addSelect('user.emailOtp')
        .addSelect('user.emailOtpExpiresAt')
        .where('user.emailOtp = :otp', { otp: normalizedOtp })
        .orWhere('CAST(user.emailOtp AS TEXT) = :otpStr', { otpStr: normalizedOtp })
        .getOne();
      
      if (user) {
        this.logger.log(`[Phone OTP] Found user by email OTP: ${user.email} (ID: ${user.id})`);
      }
    }
    
    this.logger.log(`[Phone OTP] User found: ${user ? `Yes (ID: ${user.id})` : 'No'}`);

    if (!user) {
      this.logger.error(`[Phone OTP] ❌ User not found!`);
      this.logger.error(`[Phone OTP] Searched for phone: "${normalizedPhone}"`);
      throw new NotFoundException("User not found");
    }

    // Determine which OTP to check: if no phone number provided, always check emailOtp
    const useEmailOtp = !normalizedPhone || normalizedPhone === '';
    const receivedOtpStr = String(verifyPhoneOtpDto.otp).trim();
    const receivedOtpInt = parseInt(receivedOtpStr, 10);
    
    let isOtpValid = false;
    let usedOtpField = '';
    
    if (useEmailOtp || (user.emailOtp && !user.phoneOtp)) {
      // Check email OTP
      const storedEmailOtpStr = user.emailOtp ? String(user.emailOtp).trim() : null;
      const storedEmailOtpInt = storedEmailOtpStr && !isNaN(parseInt(storedEmailOtpStr, 10)) ? parseInt(storedEmailOtpStr, 10) : null;
      const isEmailOtpExpired = user.emailOtpExpiresAt ? user.emailOtpExpiresAt <= new Date() : true;
      
      // Enhanced logging
      this.logger.log(`[Phone OTP] ========================================`);
      this.logger.log(`[Phone OTP] Checking EMAIL OTP (phone number not provided or user has emailOtp)`);
      this.logger.log(`[Phone OTP] User ID: ${user.id}`);
      this.logger.log(`[Phone OTP] User Email: ${user.email}`);
      this.logger.log(`[Phone OTP] Stored emailOtp (raw): "${user.emailOtp}" (type: ${typeof user.emailOtp}, null: ${user.emailOtp === null})`);
      this.logger.log(`[Phone OTP] Stored emailOtp (string): "${storedEmailOtpStr}" (int: ${storedEmailOtpInt})`);
      this.logger.log(`[Phone OTP] Received OTP (string): "${receivedOtpStr}" (int: ${receivedOtpInt})`);
      this.logger.log(`[Phone OTP] String Match: ${storedEmailOtpStr === receivedOtpStr}`);
      this.logger.log(`[Phone OTP] Integer Match: ${storedEmailOtpInt === receivedOtpInt}`);
      this.logger.log(`[Phone OTP] Expires At: ${user.emailOtpExpiresAt}, Current: ${new Date()}, Expired: ${isEmailOtpExpired}`);
      
      const hasStoredOtp = !!storedEmailOtpStr;
      const otpMatches = storedEmailOtpStr === receivedOtpStr || storedEmailOtpInt === receivedOtpInt;
      isOtpValid = hasStoredOtp && otpMatches && !isEmailOtpExpired;
      usedOtpField = 'emailOtp';
      
      this.logger.log(`[Phone OTP] Validation: hasStoredOtp=${hasStoredOtp}, otpMatches=${otpMatches}, !isExpired=${!isEmailOtpExpired}`);
      this.logger.log(`[Phone OTP] Final isOtpValid: ${isOtpValid}`);
      this.logger.log(`[Phone OTP] ========================================`);
    } else {
      // Check phone OTP
      const storedPhoneOtpStr = user.phoneOtp ? String(user.phoneOtp).trim() : null;
      const storedPhoneOtpInt = storedPhoneOtpStr && !isNaN(parseInt(storedPhoneOtpStr, 10)) ? parseInt(storedPhoneOtpStr, 10) : null;
      const isPhoneOtpExpired = user.phoneOtpExpiresAt ? user.phoneOtpExpiresAt <= new Date() : true;
      
      // Enhanced logging
      this.logger.log(`[Phone OTP] ========================================`);
      this.logger.log(`[Phone OTP] Phone: ${verifyPhoneOtpDto.phoneNumber}`);
      this.logger.log(`[Phone OTP] User ID: ${user.id}`);
      this.logger.log(`[Phone OTP] Stored phoneOtp (raw): "${user.phoneOtp}" (type: ${typeof user.phoneOtp}, null: ${user.phoneOtp === null})`);
      this.logger.log(`[Phone OTP] Stored phoneOtp (string): "${storedPhoneOtpStr}" (int: ${storedPhoneOtpInt})`);
      this.logger.log(`[Phone OTP] Received OTP (string): "${receivedOtpStr}" (int: ${receivedOtpInt})`);
      this.logger.log(`[Phone OTP] String Match: ${storedPhoneOtpStr === receivedOtpStr}`);
      this.logger.log(`[Phone OTP] Integer Match: ${storedPhoneOtpInt === receivedOtpInt}`);
      this.logger.log(`[Phone OTP] Expires At: ${user.phoneOtpExpiresAt}, Current: ${new Date()}, Expired: ${isPhoneOtpExpired}`);
      
      const hasStoredOtp = !!storedPhoneOtpStr;
      const otpMatches = storedPhoneOtpStr === receivedOtpStr || storedPhoneOtpInt === receivedOtpInt;
      isOtpValid = hasStoredOtp && otpMatches && !isPhoneOtpExpired;
      usedOtpField = 'phoneOtp';
      
      this.logger.log(`[Phone OTP] Validation: hasStoredOtp=${hasStoredOtp}, otpMatches=${otpMatches}, !isExpired=${!isPhoneOtpExpired}`);
      this.logger.log(`[Phone OTP] Final isOtpValid: ${isOtpValid}`);
      this.logger.log(`[Phone OTP] ========================================`);
    }
    
    if (!isOtpValid) {
      this.logger.warn(`[Phone OTP] Verification failed - Used field: ${usedOtpField}`);
      throw new UnauthorizedException("Invalid or expired OTP");
    }

    // Clear the used OTP
    if (usedOtpField === 'emailOtp') {
      user.emailOtp = null;
      user.emailOtpExpiresAt = null;
    } else {
      user.phoneOtp = null;
      user.phoneOtpExpiresAt = null;
    }

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

    this.logger.log(`[Phone OTP] ✅ Verification successful for user ID: ${user.id}, Email: ${user.email}`);
    
    return {
      ...tokens,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        email: user.email,
        fullName: user.fullName,
        userType: user.userType,
        verificationStatus: user.verificationStatus,
      }
    };
  }

  /**
   * Universal OTP verification that works for both email and phone
   */
  async verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<{ accessToken: string; refreshToken: string,user :User }> {
    let user: User;

    // Normalize inputs (trim and lowercase email)
    const normalizedEmail = verifyOtpDto.email ? verifyOtpDto.email.trim().toLowerCase() : null;
    const normalizedPhone = verifyOtpDto.phoneNumber ? verifyOtpDto.phoneNumber.trim() : null;

    // Log what we're searching for
    this.logger.log(`[OTP Verification] Searching for user...`);
    if (normalizedEmail) {
      this.logger.log(`[OTP Verification] Email: "${normalizedEmail}" (original: "${verifyOtpDto.email}")`);
    }
    if (normalizedPhone) {
      this.logger.log(`[OTP Verification] Phone: "${normalizedPhone}" (original: "${verifyOtpDto.phoneNumber}")`);
    }

    if (normalizedEmail) {
      // Use createQueryBuilder and addSelect to ensure OTP fields are loaded
      // Use LOWER() for case-insensitive comparison
      user = await this.usersRepository
        .createQueryBuilder('user')
        .addSelect('user.emailOtp')
        .addSelect('user.emailOtpExpiresAt')
        .addSelect('user.phoneOtp')
        .addSelect('user.phoneOtpExpiresAt')
        .where('LOWER(user.email) = LOWER(:email)', { email: normalizedEmail })
        .getOne();
      
      this.logger.log(`[OTP Verification] User found by email: ${user ? `Yes (ID: ${user.id})` : 'No'}`);
    } else if (normalizedPhone) {
      // Use createQueryBuilder and addSelect to ensure OTP fields are loaded
      user = await this.usersRepository
        .createQueryBuilder('user')
        .addSelect('user.emailOtp')
        .addSelect('user.emailOtpExpiresAt')
        .addSelect('user.phoneOtp')
        .addSelect('user.phoneOtpExpiresAt')
        .where('user.phoneNumber = :phone', { phone: normalizedPhone })
        .getOne();
      
      this.logger.log(`[OTP Verification] User found by phone: ${user ? `Yes (ID: ${user.id})` : 'No'}`);
    } else {
      throw new BadRequestException("Either email or phone number is required");
    }

    if (!user) {
      this.logger.error(`[OTP Verification] ❌ User not found!`);
      if (normalizedEmail) {
        this.logger.error(`[OTP Verification] Searched for email: "${normalizedEmail}"`);
      }
      if (normalizedPhone) {
        this.logger.error(`[OTP Verification] Searched for phone: "${normalizedPhone}"`);
      }
      throw new NotFoundException("User not found");
    }

    // Prepare received OTP for comparison
    const receivedOtpStr = String(verifyOtpDto.otp).trim();
    const receivedOtpInt = parseInt(receivedOtpStr, 10);
    
    let isOtpValid = false;
    let usedOtpField = '';
    
    // Check email OTP if email is provided
    if (verifyOtpDto.email) {
      const storedEmailOtpStr = user.emailOtp ? String(user.emailOtp).trim() : null;
      const storedEmailOtpInt = storedEmailOtpStr && !isNaN(parseInt(storedEmailOtpStr, 10)) ? parseInt(storedEmailOtpStr, 10) : null;
      const isEmailOtpExpired = user.emailOtpExpiresAt ? user.emailOtpExpiresAt <= new Date() : true;
      
      // Debug logging
      this.logger.log(`[OTP Verification] ========================================`);
      this.logger.log(`[OTP Verification] Email: ${verifyOtpDto.email}`);
      this.logger.log(`[OTP Verification] User ID: ${user.id}`);
      this.logger.log(`[OTP Verification] User object has emailOtp: ${'emailOtp' in user}`);
      this.logger.log(`[OTP Verification] Stored emailOtp (raw): "${user.emailOtp}" (type: ${typeof user.emailOtp}, null: ${user.emailOtp === null}, undefined: ${user.emailOtp === undefined})`);
      this.logger.log(`[OTP Verification] Stored emailOtp (string): "${storedEmailOtpStr}" (int: ${storedEmailOtpInt})`);
      this.logger.log(`[OTP Verification] Received OTP (raw): "${verifyOtpDto.otp}" (type: ${typeof verifyOtpDto.otp})`);
      this.logger.log(`[OTP Verification] Received OTP (string): "${receivedOtpStr}" (int: ${receivedOtpInt})`);
      this.logger.log(`[OTP Verification] String Match: ${storedEmailOtpStr === receivedOtpStr}`);
      this.logger.log(`[OTP Verification] Integer Match: ${storedEmailOtpInt === receivedOtpInt}`);
      this.logger.log(`[OTP Verification] Expires At: ${user.emailOtpExpiresAt}`);
      this.logger.log(`[OTP Verification] Current Time: ${new Date()}`);
      this.logger.log(`[OTP Verification] Is Expired: ${isEmailOtpExpired}`);
      this.logger.log(`[OTP Verification] storedEmailOtpStr exists: ${!!storedEmailOtpStr}`);
      this.logger.log(`[OTP Verification] OTP matches (string or int): ${storedEmailOtpStr === receivedOtpStr || storedEmailOtpInt === receivedOtpInt}`);
      this.logger.log(`[OTP Verification] Not expired: ${!isEmailOtpExpired}`);
      
      // Try both string and integer comparison
      const hasStoredOtp = !!storedEmailOtpStr;
      const otpMatches = storedEmailOtpStr === receivedOtpStr || storedEmailOtpInt === receivedOtpInt;
      
      isOtpValid = hasStoredOtp && otpMatches && !isEmailOtpExpired;
      usedOtpField = 'emailOtp';
      
      this.logger.log(`[OTP Verification] Final validation: hasStoredOtp=${hasStoredOtp}, otpMatches=${otpMatches}, !isExpired=${!isEmailOtpExpired}`);
      this.logger.log(`[OTP Verification] Final isOtpValid: ${isOtpValid}`);
      this.logger.log(`[OTP Verification] ========================================`);
    }
    // Check phone OTP if phone number is provided
    else if (verifyOtpDto.phoneNumber) {
      const storedPhoneOtpStr = user.phoneOtp ? String(user.phoneOtp).trim() : null;
      const storedPhoneOtpInt = storedPhoneOtpStr ? parseInt(storedPhoneOtpStr, 10) : null;
      const isPhoneOtpExpired = user.phoneOtpExpiresAt ? user.phoneOtpExpiresAt <= new Date() : true;
      
      // Debug logging
      this.logger.log(`[OTP Verification] Phone: ${verifyOtpDto.phoneNumber}`);
      this.logger.log(`[OTP Verification] Stored phoneOtp (raw): "${user.phoneOtp}" (type: ${typeof user.phoneOtp})`);
      this.logger.log(`[OTP Verification] Stored phoneOtp (string): "${storedPhoneOtpStr}" (int: ${storedPhoneOtpInt})`);
      this.logger.log(`[OTP Verification] Received OTP (string): "${receivedOtpStr}" (int: ${receivedOtpInt})`);
      this.logger.log(`[OTP Verification] String Match: ${storedPhoneOtpStr === receivedOtpStr}`);
      this.logger.log(`[OTP Verification] Integer Match: ${storedPhoneOtpInt === receivedOtpInt}`);
      this.logger.log(`[OTP Verification] Expires At: ${user.phoneOtpExpiresAt}, Current: ${new Date()}, Expired: ${isPhoneOtpExpired}`);
      
      // Try both string and integer comparison
      isOtpValid = storedPhoneOtpStr &&
        (storedPhoneOtpStr === receivedOtpStr || storedPhoneOtpInt === receivedOtpInt) &&
        !isPhoneOtpExpired;
      usedOtpField = 'phoneOtp';
    }

    if (!isOtpValid) {
      this.logger.warn(`[OTP Verification] Failed - Used field: ${usedOtpField}, Valid: ${isOtpValid}`);
      throw new UnauthorizedException("Invalid or expired OTP");
    }

    // Clear the used OTP
    if (usedOtpField === 'emailOtp') {
      user.emailOtp = null;
      user.emailOtpExpiresAt = null;
    } else if (usedOtpField === 'phoneOtp') {
      user.phoneOtp = null;
      user.phoneOtpExpiresAt = null;
    }

    user.verificationStatus = VerificationStatus.VERIFIED;
    user.verifiedAt = new Date();
    await this.usersRepository.save(user);

    // Send welcome email if user has email
    if (user.email) {
      try {
        // await this.mailService.sendWelcomeEmail(user.email, {
        //   userName: user.fullName,
        //   userType: UserType.CUSTOMER,
        // });
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
    this.logger.log(`[Login] Attempting login...`);
    this.logger.log(`[Login] Email: ${loginDto.email || 'not provided'}, Phone: ${loginDto.phoneNumber || 'not provided'}`);
    
    let user: User | null = null; // Explicitly type as User | null

    const qb = this.usersRepository.createQueryBuilder("user")
      .addSelect("user.passwordHash") // Explicitly select passwordHash
      
    if (loginDto.email) {
      // Normalize email (trim and lowercase)
      const normalizedEmail = loginDto.email.trim().toLowerCase();
      this.logger.log(`[Login] Searching by email: "${normalizedEmail}"`);
      user = await qb.where("LOWER(user.email) = LOWER(:email)", { email: normalizedEmail }).getOne();
    } else if (loginDto.phoneNumber) {
      // Normalize phone number (trim)
      const normalizedPhone = loginDto.phoneNumber.trim();
      this.logger.log(`[Login] Searching by phone: "${normalizedPhone}"`);
      user = await qb.where("user.phoneNumber = :phone", { phone: normalizedPhone }).getOne();
    } else {
      throw new BadRequestException("Either email or phone number is required");
    }

    this.logger.log(`[Login] User found: ${user ? `Yes (ID: ${user.id})` : 'No'}`);

    if (!user) {
      this.logger.warn(`[Login] ❌ User not found`);
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!user.passwordHash) {
      this.logger.warn(`[Login] ❌ User has no password hash (ID: ${user.id})`);
      throw new UnauthorizedException("Invalid credentials");
    }

    this.logger.log(`[Login] Comparing password...`);
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isPasswordValid) {
      this.logger.warn(`[Login] ❌ Password mismatch for user ID: ${user.id}`);
      throw new UnauthorizedException("Invalid credentials");
    }

    this.logger.log(`[Login] Password valid. Checking verification status: ${user.verificationStatus}`);
    if (user.verificationStatus !== VerificationStatus.VERIFIED) {
      this.logger.warn(`[Login] ❌ User not verified (ID: ${user.id}, Status: ${user.verificationStatus})`);
      throw new UnauthorizedException("Please verify your account before logging in");
    }

    if (user.isActive === false) {
      this.logger.warn(`[Login] ❌ User account deactivated (ID: ${user.id})`);
      throw new UnauthorizedException("Your account has been deactivated. Please contact support.");
    }

    this.logger.log(`[Login] ✅ Login successful for user ID: ${user.id}`);
    return { ...await this.generateTokens(user), user };
  }

  /**
   * Send login OTP via email
   */
  async sendEmailLoginOtp({ email }: EmailLoginDto): Promise<{ message: string }> {
    // Normalize email (trim and lowercase) for consistent lookup
    const normalizedEmail = email.trim().toLowerCase();
    
    this.logger.log(`[Email Login] Searching for user with email: "${normalizedEmail}" (original: "${email}")`);
    
    // Use QueryBuilder for case-insensitive email lookup
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = LOWER(:email)', { email: normalizedEmail })
      .getOne();
    
    this.logger.log(`[Email Login] User found: ${user ? `Yes (ID: ${user.id})` : 'No'}`);

    if (!user) {
      // For security, don't reveal if user exists
      return { message: "If this email is registered, a login code has been sent" };
    }

    const otp = this.generateOtp();
    // Ensure OTP is stored as string
    user.emailOtp = String(otp);
    user.emailOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await this.usersRepository.save(user);
    this.logger.log(`[OTP Storage] Stored email OTP: "${user.emailOtp}" (type: ${typeof user.emailOtp})`);

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
    // Normalize email (trim and lowercase)
    const normalizedEmail = email.trim().toLowerCase();
    
    this.logger.log(`[Email Login OTP] Searching for user with email: "${normalizedEmail}" (original: "${email}")`);
    
    // Use createQueryBuilder and addSelect to ensure OTP fields are loaded
    // Use LOWER() for case-insensitive comparison
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.emailOtp')
      .addSelect('user.emailOtpExpiresAt')
      .where('LOWER(user.email) = LOWER(:email)', { email: normalizedEmail })
      .getOne();
    
    this.logger.log(`[Email Login OTP] User found: ${user ? `Yes (ID: ${user.id})` : 'No'}`);

    const storedOtpStr = user?.emailOtp ? String(user.emailOtp).trim() : null;
    const storedOtpInt = storedOtpStr ? parseInt(storedOtpStr, 10) : null;
    const receivedOtpStr = String(otp).trim();
    const receivedOtpInt = parseInt(receivedOtpStr, 10);
    const isExpired = user?.emailOtpExpiresAt ? user.emailOtpExpiresAt < new Date() : true;
    
    // Debug logging
    this.logger.log(`[Email Login OTP] Email: ${email}`);
    this.logger.log(`[Email Login OTP] Stored OTP (raw): "${user?.emailOtp}" (type: ${typeof user?.emailOtp})`);
    this.logger.log(`[Email Login OTP] Stored OTP (string): "${storedOtpStr}" (int: ${storedOtpInt})`);
    this.logger.log(`[Email Login OTP] Received OTP (string): "${receivedOtpStr}" (int: ${receivedOtpInt})`);
    this.logger.log(`[Email Login OTP] String Match: ${storedOtpStr === receivedOtpStr}`);
    this.logger.log(`[Email Login OTP] Integer Match: ${storedOtpInt === receivedOtpInt}`);
    this.logger.log(`[Email Login OTP] Expires At: ${user?.emailOtpExpiresAt}, Current: ${new Date()}, Expired: ${isExpired}`);
    
    // Try both string and integer comparison
    const otpMatches = storedOtpStr && (storedOtpStr === receivedOtpStr || storedOtpInt === receivedOtpInt);
    
    if (
      !user ||
      !storedOtpStr ||
      !user.emailOtpExpiresAt || 
      !otpMatches ||
      isExpired
    ) {
      this.logger.warn(`[Email Login OTP] Verification failed - User exists: ${!!user}, Has OTP: ${!!storedOtpStr}, Match: ${otpMatches}, Expired: ${isExpired}`);
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
    // Normalize inputs for consistent lookup
    const normalizedEmail = email ? email.trim().toLowerCase() : null;
    const normalizedPhone = phoneNumber ? phoneNumber.trim() : null;

    if (!normalizedEmail && !normalizedPhone) return null;

    // Use QueryBuilder for case-insensitive email lookup
    const queryBuilder = this.usersRepository.createQueryBuilder('user');
    
    if (normalizedEmail && normalizedPhone) {
      queryBuilder.where('(LOWER(user.email) = LOWER(:email) OR user.phoneNumber = :phone)', {
        email: normalizedEmail,
        phone: normalizedPhone,
      });
    } else if (normalizedEmail) {
      queryBuilder.where('LOWER(user.email) = LOWER(:email)', { email: normalizedEmail });
    } else if (normalizedPhone) {
      queryBuilder.where('user.phoneNumber = :phone', { phone: normalizedPhone });
    }

    return await queryBuilder.getOne();
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

    // Normalize email (trim and lowercase) for consistent storage
    const normalizedEmail = registerDto.email ? registerDto.email.trim().toLowerCase() : null;
    const normalizedPhone = registerDto.phoneNumber ? registerDto.phoneNumber.trim() : null;

    this.logger.log(`[Registration] Creating user with email: "${normalizedEmail}" (original: "${registerDto.email}")`);

    const user = this.usersRepository.create({
      email: normalizedEmail,
      phoneNumber: normalizedPhone,
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
    // Ensure OTP is stored as string
    user.phoneOtp = String(otp);
    user.phoneOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    this.logger.log(`[OTP Storage] Stored phone OTP: "${user.phoneOtp}" (type: ${typeof user.phoneOtp})`);
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
    const user = await this.usersRepository.createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id: userId })
      .getOne();
      
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
    // Normalize phone number (trim whitespace)
    const normalizedPhone = phoneNumber.trim();
    
    this.logger.log(`[Forgot Password Phone] Searching for user with phone: "${normalizedPhone}" (original: "${phoneNumber}")`);
    
    const user = await this.usersRepository.findOne({ where: { phoneNumber: normalizedPhone } });
    
    this.logger.log(`[Forgot Password Phone] User found: ${user ? `Yes (ID: ${user.id})` : 'No'}`);

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
    // Normalize phone number (trim whitespace)
    const normalizedPhone = phoneNumber.trim();
    
    this.logger.log(`[Reset Password Phone] Searching for user with phone: "${normalizedPhone}" (original: "${phoneNumber}")`);
    
    // Use QueryBuilder to ensure OTP fields are loaded
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.resetOtp')
      .addSelect('user.resetOtpExpiresAt')
      .where('user.phoneNumber = :phone', { phone: normalizedPhone })
      .getOne();
    
    this.logger.log(`[Reset Password Phone] User found: ${user ? `Yes (ID: ${user.id})` : 'No'}`);
    
    if (!user) {
      this.logger.error(`[Reset Password Phone] ❌ User not found!`);
      this.logger.error(`[Reset Password Phone] Searched for phone: "${normalizedPhone}"`);
      throw new UnauthorizedException("User not found");
    }

    if (!user.resetOtp) {
      throw new UnauthorizedException("Reset code not generated");
    }
    // Convert to string and trim for comparison to avoid type/whitespace issues
    if (String(user.resetOtp).trim() !== String(otp).trim()) {
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
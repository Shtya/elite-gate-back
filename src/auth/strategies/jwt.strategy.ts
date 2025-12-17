
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private authService: AuthService) {
    const jwtSecret = process.env.JWT_SECRET || 'development-secret-key-change-in-production';

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });

    this.logger.log('✅ JWT Strategy initialized');
  }

  async validate(payload: any) {
    try {
      const user = await this.authService.validateUser(payload);
      if (!user) {
        this.logger.warn(`❌ User not found for token payload: ${JSON.stringify(payload)}`);
        throw new UnauthorizedException('User not found');
      }

      // Check if user is active
      if (user.isActive === false) {
        this.logger.warn(`❌ User ${user.id} is deactivated`);
        throw new UnauthorizedException('User account is deactivated');
      }

      this.logger.log(`✅ User ${user.id} authenticated successfully`);
      return user;
    } catch (error) {
      this.logger.error(`❌ JWT validation failed: ${error.message}`);
      throw new UnauthorizedException('Authentication failed');
    }
  }
}

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { EmailVerification } from './entities/email-verification.entity';
import { User } from '../users/user.entity';
import { EmailService } from '../email/email.service';

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);
  private readonly tokenExpirationHours = 24;

  constructor(
    @InjectRepository(EmailVerification)
    private emailVerificationRepository: Repository<EmailVerification>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate a secure verification token
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create and send a verification email
   */
  async sendVerificationEmail(userId: number): Promise<{ sent: boolean; message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.isEmailVerified) {
      return { sent: false, message: 'Email already verified' };
    }

    // Invalidate any existing tokens for this user
    await this.emailVerificationRepository.update(
      { userId, isUsed: false },
      { isUsed: true },
    );

    // Create new verification token
    const token = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.tokenExpirationHours);

    const verification = this.emailVerificationRepository.create({
      userId,
      token,
      expiresAt,
      isUsed: false,
    });

    await this.emailVerificationRepository.save(verification);

    // Send email
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3010');
    const emailSent = await this.emailService.sendVerificationEmail(
      user.email,
      token,
      frontendUrl,
    );

    if (emailSent) {
      this.logger.log(`Verification email sent to ${user.email}`);
      return { sent: true, message: 'Verification email sent' };
    } else {
      // Even if email not sent (e.g., SMTP not configured), return the token in dev
      if (process.env.NODE_ENV !== 'production') {
        this.logger.warn(`Email not configured. Verification token for ${user.email}: ${token}`);
        return {
          sent: false,
          message: 'Email service not configured. Check server logs for verification token.',
        };
      }
      return { sent: false, message: 'Failed to send verification email' };
    }
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    const verification = await this.emailVerificationRepository.findOne({
      where: {
        token,
        isUsed: false,
        expiresAt: MoreThan(new Date()),
      },
      relations: ['user'],
    });

    if (!verification) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Mark token as used
    verification.isUsed = true;
    await this.emailVerificationRepository.save(verification);

    // Mark user email as verified
    await this.userRepository.update(verification.userId, {
      isEmailVerified: true,
    });

    this.logger.log(`Email verified for user ${verification.userId}`);

    return { success: true, message: 'Email verified successfully' };
  }

  /**
   * Check if user's email is verified
   */
  async isEmailVerified(userId: number): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    return user?.isEmailVerified ?? false;
  }
}

import { Controller, Post, Get, Body, UseGuards, Res, Query } from '@nestjs/common';
import { Response } from 'express';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { EmailVerificationService } from './email-verification.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { WalletLoginDto } from './dto/wallet-login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { JWT_COOKIE_NAME } from './strategies/jwt.strategy';

// Cookie configuration
const COOKIE_OPTIONS = {
  httpOnly: true, // Prevents XSS attacks - cookie not accessible via JavaScript
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'lax' as const, // CSRF protection
  maxAge: 24 * 60 * 60 * 1000, // 1 day in milliseconds
  path: '/',
};

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  // Strict rate limiting: 5 attempts per minute for registration
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(registerDto);

    // Set HTTP-only cookie
    res.cookie(JWT_COOKIE_NAME, result.access_token, COOKIE_OPTIONS);

    // Return user data without token (token is in cookie)
    return { user: result.user };
  }

  // Very strict rate limiting: 5 attempts per minute for login (brute-force protection)
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto);

    // Set HTTP-only cookie
    res.cookie(JWT_COOKIE_NAME, result.access_token, COOKIE_OPTIONS);

    // Return user data without token (token is in cookie)
    return { user: result.user };
  }

  // Strict rate limiting: 5 attempts per minute for wallet login
  @Post('wallet-login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async walletLogin(
    @Body() walletLoginDto: WalletLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.walletLogin(walletLoginDto);

    // Set HTTP-only cookie
    res.cookie(JWT_COOKIE_NAME, result.access_token, COOKIE_OPTIONS);

    // Return user data without token (token is in cookie)
    return { user: result.user };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    // Clear the auth cookie
    res.clearCookie(JWT_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@CurrentUser('id') userId: number) {
    return this.authService.getProfile(userId);
  }

  /**
   * Send verification email to the authenticated user
   * Rate limited to 3 requests per minute to prevent abuse
   */
  @Post('send-verification')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async sendVerificationEmail(@CurrentUser('id') userId: number) {
    await this.emailVerificationService.sendVerificationEmail(userId);
    return { message: 'Email de vérification envoyé' };
  }

  /**
   * Verify email with token (public endpoint)
   * Rate limited to prevent brute-force attacks on tokens
   */
  @Post('verify-email')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async verifyEmail(@Body('token') token: string) {
    const result = await this.emailVerificationService.verifyEmail(token);
    return {
      success: result,
      message: result ? 'Email vérifié avec succès' : 'Token invalide ou expiré',
    };
  }

  /**
   * Check email verification status for authenticated user
   */
  @Get('verification-status')
  @UseGuards(JwtAuthGuard)
  async getVerificationStatus(@CurrentUser('id') userId: number) {
    const user = await this.authService.getProfile(userId);
    return {
      isVerified: user.isEmailVerified,
      email: user.email,
    };
  }
}



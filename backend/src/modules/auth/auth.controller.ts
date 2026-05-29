import { Controller, Post, Get, Body, UseGuards, Res, Query } from '@nestjs/common';
import { Response } from 'express';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { EmailVerificationService } from './email-verification.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { WalletLoginDto } from './dto/wallet-login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { JWT_COOKIE_NAME } from './strategies/jwt.strategy';

/*
 * Cookie configuration.
 *
 * Production deployment is cross-domain (front on timelock.app, API on
 * api.timelock.app). For the browser to send the JWT cookie to a different
 * origin, the cookie MUST be `SameSite=None` and `Secure` (HTTPS only).
 * Anything else and modern browsers silently drop the cookie on cross-site
 * fetches, breaking auth.
 *
 * In development the front and back are both on localhost (different ports,
 * but same site), so `SameSite=Lax` is sufficient and `Secure` would actually
 * prevent the cookie from being set without HTTPS.
 *
 * The `COOKIE_DOMAIN` env var is optional. Set it to e.g. `.timelock.app` if
 * you want the cookie to be shared between subdomains (front + api).
 */
const IS_PROD = process.env.NODE_ENV === 'production';

const COOKIE_OPTIONS = {
  httpOnly: true, // Prevents JS access — defense against XSS
  secure: IS_PROD, // HTTPS-only in production
  sameSite: (IS_PROD ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 24 * 60 * 60 * 1000, // 1 day
  path: '/',
  ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
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
    // `clearCookie` must mirror the attributes used when the cookie was set,
    // otherwise the browser keeps the original cookie in place.
    res.clearCookie(JWT_COOKIE_NAME, {
      httpOnly: COOKIE_OPTIONS.httpOnly,
      secure: COOKIE_OPTIONS.secure,
      sameSite: COOKIE_OPTIONS.sameSite,
      path: COOKIE_OPTIONS.path,
      ...(COOKIE_OPTIONS as any).domain ? { domain: (COOKIE_OPTIONS as any).domain } : {},
    });

    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@CurrentUser('id') userId: number) {
    return this.authService.getProfile(userId);
  }

  /**
   * Change the authenticated user's password (email/password accounts only).
   * Rate limited to slow down attempts to brute-force the current password.
   */
  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async changePassword(
    @CurrentUser('id') userId: number,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, dto);
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



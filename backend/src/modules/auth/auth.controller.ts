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
 * Configuration du cookie JWT.
 *
 * En production, le front (www.the21method.com) et l'API
 * (api.the21method.com) sont sur des sous-domaines différents. Pour que
 * le navigateur envoie le cookie sur des requêtes cross-origin, le cookie
 * DOIT être `SameSite=None` + `Secure` (HTTPS obligatoire). Sinon les
 * navigateurs modernes le suppriment silencieusement.
 *
 * En développement, front et back sont sur localhost (ports différents
 * mais même site) : `SameSite=Lax` suffit, et `Secure=true` empêcherait
 * carrément la pose du cookie en HTTP local.
 *
 * `COOKIE_DOMAIN` est optionnel : à régler par exemple sur
 * `.the21method.com` pour partager le cookie entre les sous-domaines.
 */
const IS_PROD = process.env.NODE_ENV === 'production';

const COOKIE_OPTIONS = {
  httpOnly: true, // Empêche tout accès via JS → protection contre le XSS.
  secure: IS_PROD, // HTTPS uniquement en production.
  sameSite: (IS_PROD ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 24 * 60 * 60 * 1000, // 1 jour.
  path: '/',
  ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
};

/**
 * Contrôleur d'authentification (`/auth`).
 *
 * Couvre : inscription, connexion email/mdp, connexion wallet,
 * déconnexion, lecture du profil, changement de mot de passe, et
 * vérification d'email (envoi du lien + consommation du token).
 *
 * Toutes les routes sont protégées par `ThrottlerGuard` pour limiter
 * les tentatives brute-force.
 */
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  // Rate limit serré : 5 inscriptions par minute par IP.
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(registerDto);

    // Pose du cookie HTTP-only contenant le JWT.
    res.cookie(JWT_COOKIE_NAME, result.access_token, COOKIE_OPTIONS);

    // On ne renvoie PAS le token dans le corps : il vit uniquement dans le cookie.
    return { user: result.user };
  }

  // Rate limit serré : 5 tentatives de login par minute (anti brute-force).
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto);
    res.cookie(JWT_COOKIE_NAME, result.access_token, COOKIE_OPTIONS);
    return { user: result.user };
  }

  // Rate limit serré : 5 tentatives de wallet-login par minute.
  @Post('wallet-login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async walletLogin(
    @Body() walletLoginDto: WalletLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.walletLogin(walletLoginDto);
    res.cookie(JWT_COOKIE_NAME, result.access_token, COOKIE_OPTIONS);
    return { user: result.user };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    // `clearCookie` doit reprendre EXACTEMENT les mêmes attributs que ceux
    // utilisés à la pose du cookie, sinon le navigateur conserve l'ancien.
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
   * Change le mot de passe de l'utilisateur connecté (comptes email/mdp
   * uniquement). Rate-limité pour ralentir une éventuelle attaque
   * brute-force sur le mot de passe actuel.
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
   * Envoie un email de vérification à l'utilisateur connecté.
   * Rate-limité à 3 requêtes par minute pour éviter le spam.
   */
  @Post('send-verification')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async sendVerificationEmail(@CurrentUser('id') userId: number) {
    await this.emailVerificationService.sendVerificationEmail(userId);
    return { message: 'Email de vérification envoyé' };
  }

  /**
   * Consomme un token de vérification d'email (route publique appelée
   * via le lien envoyé dans le mail). Rate-limité pour empêcher le
   * brute-force du token.
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

  /** Renvoie l'état de vérification d'email de l'utilisateur connecté. */
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

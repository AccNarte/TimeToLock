import { Injectable, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';

export interface JwtPayload {
  sub: number | string; // Stocké comme chaîne dans le JWT, mais on le repasse en number.
  email: string;
}

/** Nom du cookie HTTP-only où vit le JWT. */
export const JWT_COOKIE_NAME = 'timelock_auth';

/**
 * Extrait le JWT depuis le cookie HttpOnly en priorité, et retombe sur
 * l'en-tête `Authorization: Bearer` en fallback (utile pour les tests
 * API depuis Postman ou les anciens clients).
 */
const extractJwtFromCookieOrHeader = (req: Request): string | null => {
  // Méthode principale : cookie HttpOnly (à l'abri du JS, donc du XSS).
  if (req.cookies && req.cookies[JWT_COOKIE_NAME]) {
    return req.cookies[JWT_COOKIE_NAME];
  }

  // Fallback : en-tête Authorization Bearer.
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
};

/**
 * Stratégie passport-jwt utilisée par `JwtAuthGuard`.
 *
 * À chaque requête authentifiée, on :
 *   1. extrait le JWT (cookie ou Authorization),
 *   2. décode le payload (sub = id utilisateur),
 *   3. recharge l'utilisateur en base pour vérifier qu'il existe toujours
 *      et qu'il n'a pas été suspendu (point clé : un ban bannit la
 *      session active immédiatement, pas seulement à la prochaine
 *      connexion).
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: extractJwtFromCookieOrHeader,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret'),
    });
  }

  async validate(payload: JwtPayload) {
    const userId = typeof payload.sub === 'string' ? parseInt(payload.sub, 10) : payload.sub;
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    // Les comptes suspendus (soft-delete) sont refusés à chaque requête,
    // ce qui coupe immédiatement une session déjà ouverte au moment du ban.
    if (user.status === 'banned') {
      throw new ForbiddenException('Account banned');
    }
    return { id: user.id, email: user.email };
  }
}

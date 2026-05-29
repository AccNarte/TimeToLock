import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { WalletsService } from '../wallets/wallets.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { WalletLoginDto } from './dto/wallet-login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from '../audit/audit.constants';
import { ethers } from 'ethers';

/**
 * Service d'authentification : inscription, connexion email/mdp,
 * connexion par signature wallet, lecture de profil, changement de
 * mot de passe.
 *
 * Toutes les opérations sensibles sont journalisées dans `audit_logs`
 * via `AuditService`.
 */
@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private walletsService: WalletsService,
    private jwtService: JwtService,
    private auditService: AuditService,
  ) {}

  /** Inscription email/mdp : crée le compte, journalise, renvoie le JWT. */
  async register(registerDto: RegisterDto) {
    const user = await this.usersService.create(registerDto);
    await this.auditService.log({
      action: AUDIT_ACTIONS.USER_REGISTERED,
      entityType: AUDIT_ENTITIES.USER,
      entityId: user.id,
      userId: user.id,
      metadata: { email: user.email },
    });
    const payload = { sub: user.id, email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user.id, email: user.email },
    };
  }

  /**
   * Connexion email/mdp.
   *
   * Étapes :
   *   1. `validateUser` vérifie réellement le mot de passe (bcrypt ou
   *      legacy plaintext via `verifyPassword`).
   *   2. Refus si le compte est suspendu (soft-delete).
   *   3. Journalisation de la connexion.
   *   4. Signature et renvoi du JWT.
   */
  async login(loginDto: LoginDto) {
    const user = await this.usersService.validateUser(
      loginDto.email,
      loginDto.password,
    );
    if (user.status === 'banned') {
      throw new UnauthorizedException('Ce compte a été suspendu.');
    }
    await this.auditService.log({
      action: AUDIT_ACTIONS.USER_LOGIN,
      entityType: AUDIT_ENTITIES.USER,
      entityId: user.id,
      userId: user.id,
    });
    const payload = { sub: user.id, email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user.id, email: user.email },
    };
  }

  async getProfile(userId: number) {
    return this.usersService.findById(userId);
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    return this.usersService.changePassword(
      userId,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  /**
   * Connexion (ou inscription implicite) par signature wallet.
   *
   * Le front demande à l'utilisateur de signer un message contenant son
   * adresse et un timestamp. Le backend :
   *   1. Recouvre l'adresse depuis la signature (`ethers.verifyMessage`)
   *      et vérifie qu'elle correspond à l'adresse annoncée.
   *   2. Cherche le wallet en base : si trouvé → connecte l'utilisateur
   *      associé ; sinon → crée un nouveau compte avec un email
   *      auto-généré `wallet_<adresse>@timelock.local` et lie le wallet.
   *   3. Refuse les comptes suspendus.
   *   4. Journalise l'événement et renvoie le JWT.
   */
  async walletLogin(walletLoginDto: WalletLoginDto) {
    const { address, signature, message } = walletLoginDto;

    try {
      // Recouvrement de l'adresse à partir de la signature.
      const recoveredAddress = ethers.verifyMessage(message, signature);

      // Normalisation lowercase pour les comparaisons (les adresses
      // Ethereum sont insensibles à la casse en pratique).
      const normalizedAddress = address.toLowerCase();
      const normalizedRecovered = recoveredAddress.toLowerCase();

      if (normalizedAddress !== normalizedRecovered) {
        throw new UnauthorizedException('Invalid signature');
      }

      // Recherche du wallet en base.
      const existingWallet = await this.walletsService.findByAddress(normalizedAddress);

      let user = null;

      if (existingWallet) {
        // Wallet déjà lié à un compte → on récupère l'utilisateur associé.
        user = await this.usersService.findById(existingWallet.userId);
        if (!user) {
          throw new UnauthorizedException('User not found for wallet');
        }
        if (user.status === 'banned') {
          throw new UnauthorizedException('Ce compte a été suspendu.');
        }
      } else {
        // Premier login de ce wallet → création implicite du compte.
        user = await this.usersService.create({
          email: `wallet_${normalizedAddress}@timelock.local`,
          password: '', // Compte wallet : pas de mot de passe.
        });

        // Et lien du wallet au nouveau compte.
        await this.walletsService.linkExternal(user.id, {
          address: normalizedAddress,
          provider: 'metamask',
        });
      }

      await this.auditService.log({
        action: AUDIT_ACTIONS.WALLET_LOGIN,
        entityType: AUDIT_ENTITIES.USER,
        entityId: user.id,
        userId: user.id,
        userWalletId: existingWallet?.id ?? null,
        metadata: { address: normalizedAddress, newAccount: !existingWallet },
      });

      // Signature et renvoi du JWT.
      const payload = { sub: user.id, email: user.email };
      return {
        access_token: this.jwtService.sign(payload),
        user: { id: user.id, email: user.email },
      };
    } catch (error) {
      // On laisse remonter les `UnauthorizedException` explicites (messages
      // utilisateur déjà français) et on masque le reste derrière un
      // message générique pour ne pas leaker la stack interne.
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid wallet authentication');
    }
  }
}

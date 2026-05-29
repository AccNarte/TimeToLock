import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { hashPassword, verifyPassword } from '../../common/utils/password.util';

/**
 * Service en charge de la persistance et de l'authentification des
 * utilisateurs (création, lookup, vérification de mot de passe,
 * changement de mot de passe).
 *
 * Toute la logique de hashage et de vérification est déléguée à
 * `password.util.ts`, qui gère à la fois bcrypt et la compatibilité
 * descendante avec les anciens comptes en plaintext.
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  /**
   * Crée un nouvel utilisateur.
   * - Refuse si l'email est déjà pris (`ConflictException`).
   * - Hash le mot de passe avec bcrypt si renseigné.
   * - Les inscriptions par wallet passent un mot de passe vide : on ne
   *   hash rien dans ce cas, le compte ne peut pas se connecter par
   *   mot de passe (uniquement par signature wallet).
   */
  async create(data: { email: string; password: string }): Promise<User> {
    const existingUser = await this.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictException('Un compte avec cet email existe déjà');
    }

    const passwordHash = data.password ? await hashPassword(data.password) : '';

    const user = this.usersRepository.create({
      email: data.email,
      passwordHash,
    });
    return this.usersRepository.save(user);
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  /**
   * Vérifie les identifiants email + mot de passe au login.
   *
   * Message d'erreur générique (« Email ou mot de passe incorrect ») :
   * on ne révèle jamais si l'erreur vient de l'email ou du mot de passe,
   * pour empêcher l'énumération des comptes par essais successifs.
   */
  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }
    return user;
  }

  /**
   * Change le mot de passe d'un compte email/mdp.
   *
   * Sécurité :
   *  - Vérifie le mot de passe actuel avant tout changement.
   *  - Refuse les comptes wallet (qui n'ont pas de mot de passe).
   *  - Refuse un nouveau mot de passe identique à l'ancien.
   *  - Stocke le nouveau mot de passe hashé en bcrypt (les comptes
   *    legacy en plaintext sont implicitement upgradés à ce moment).
   */
  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: true }> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const isWalletAccount =
      user.email?.toLowerCase().endsWith('@timelock.local') || !user.passwordHash;
    if (isWalletAccount) {
      throw new BadRequestException(
        "Les comptes connectés par wallet n'ont pas de mot de passe à changer.",
      );
    }

    const currentOk = await verifyPassword(currentPassword, user.passwordHash);
    if (!currentOk) {
      throw new UnauthorizedException('Mot de passe actuel incorrect');
    }

    // Refus du no-op (attrape aussi le cas legacy plaintext == nouveau mdp).
    const sameAsCurrent = await verifyPassword(newPassword, user.passwordHash);
    if (sameAsCurrent) {
      throw new BadRequestException(
        "Le nouveau mot de passe doit être différent de l'ancien.",
      );
    }

    user.passwordHash = await hashPassword(newPassword);
    await this.usersRepository.save(user);
    return { success: true };
  }
}

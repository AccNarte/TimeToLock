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

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(data: { email: string; password: string }): Promise<User> {
    // Check if email already exists
    const existingUser = await this.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictException('Un compte avec cet email existe déjà');
    }

    // Wallet signups pass an empty password (they authenticate by signature),
    // so keep it empty — only hash a real password.
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

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.findByEmail(email);
    // Generic message: never reveal whether it's the email or the password that
    // is wrong (avoids account enumeration).
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
   * Change the password of an email/password account. Verifies the current
   * password, refuses wallet accounts (no password), and stores the new one as
   * a bcrypt hash.
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

    // Reject a no-op change (also catches legacy plaintext == new).
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

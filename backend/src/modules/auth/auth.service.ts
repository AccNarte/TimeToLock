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

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private walletsService: WalletsService,
    private jwtService: JwtService,
    private auditService: AuditService,
  ) {}

  async register(registerDto: RegisterDto) {
    // Stub: Create user and return token
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

  async login(loginDto: LoginDto) {
    // Stub: Validate user and return token
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
    // Stub: Return user profile
    return this.usersService.findById(userId);
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    return this.usersService.changePassword(
      userId,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  async walletLogin(walletLoginDto: WalletLoginDto) {
    const { address, signature, message } = walletLoginDto;

    try {
      // Verify the signature
      const recoveredAddress = ethers.verifyMessage(message, signature);
      
      // Normalize addresses to lowercase for comparison
      const normalizedAddress = address.toLowerCase();
      const normalizedRecovered = recoveredAddress.toLowerCase();

      if (normalizedAddress !== normalizedRecovered) {
        throw new UnauthorizedException('Invalid signature');
      }

      // Find wallet by address
      const existingWallet = await this.walletsService.findByAddress(normalizedAddress);
      
      let user = null;
      
      if (existingWallet) {
        // Wallet exists, get the associated user
        user = await this.usersService.findById(existingWallet.userId);
        if (!user) {
          throw new UnauthorizedException('User not found for wallet');
        }
        if (user.status === 'banned') {
          throw new UnauthorizedException('Ce compte a été suspendu.');
        }
      } else {
        // Create new user for wallet
        user = await this.usersService.create({
          email: `wallet_${normalizedAddress}@timelock.local`,
          password: '', // No password for wallet login
        });
        
        // Link the wallet to the user
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

      // Generate JWT token
      const payload = { sub: user.id, email: user.email };
      return {
        access_token: this.jwtService.sign(payload),
        user: { id: user.id, email: user.email },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid wallet authentication');
    }
  }
}



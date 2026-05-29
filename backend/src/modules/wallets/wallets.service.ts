import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ethers } from 'ethers';
import { Wallet } from './wallet.entity';
import { CreateInternalWalletDto } from './dto/create-internal-wallet.dto';
import { LinkExternalWalletDto } from './dto/link-external-wallet.dto';
import { CreateEmbeddedWalletDto } from './dto/create-embedded-wallet.dto';
import { EncryptionService } from '../../common/services/encryption.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet)
    private walletsRepository: Repository<Wallet>,
    private encryptionService: EncryptionService,
    private usersService: UsersService,
  ) {}

  async createInternal(
    userId: number,
    dto: CreateInternalWalletDto,
  ): Promise<{ wallet: Wallet; mnemonic: string }> {
    // Get user to generate encryption password
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate wallet with ethers.js
    const wallet = ethers.Wallet.createRandom();
    const mnemonic = wallet.mnemonic?.phrase || '';
    const privateKey = wallet.privateKey;
    const address = wallet.address.toLowerCase();

    // Generate encryption password based on user data
    const encryptionPassword = this.encryptionService.generateEncryptionPassword(
      userId,
      user.email || `user_${userId}`,
    );

    // Encrypt private key
    const encryptedPrivateKey = this.encryptionService.encrypt(
      privateKey,
      encryptionPassword,
    );

    // Encrypt mnemonic
    const encryptedMnemonic = this.encryptionService.encrypt(
      mnemonic,
      encryptionPassword,
    );

    // Store encrypted data (combine salt, iv, tag in a single string for simplicity)
    // Format: encrypted:salt:iv:tag
    const privateKeyData = `${encryptedPrivateKey.encrypted}:${encryptedPrivateKey.salt}:${encryptedPrivateKey.iv}:${encryptedPrivateKey.tag}`;
    const mnemonicData = `${encryptedMnemonic.encrypted}:${encryptedMnemonic.salt}:${encryptedMnemonic.iv}:${encryptedMnemonic.tag}`;

    // Create wallet entity
    const walletEntity = this.walletsRepository.create({
      userId,
      type: 'internal',
      address,
      provider: dto.provider || 'ethers',
      encryptedPrivateKey: privateKeyData,
      encryptedMnemonic: mnemonicData,
      salt: encryptedPrivateKey.salt, // Store primary salt
    });

    const savedWallet = await this.walletsRepository.save(walletEntity);

    // Return wallet and mnemonic (mnemonic should be shown only once to user)
    return {
      wallet: savedWallet,
      mnemonic, // Return plain mnemonic for one-time display
    };
  }

  async linkExternal(
    userId: number,
    dto: LinkExternalWalletDto,
  ): Promise<Wallet> {
    // Stub: Link external wallet
    const wallet = this.walletsRepository.create({
      userId,
      type: 'external',
      address: dto.address,
      provider: dto.provider,
    });
    return this.walletsRepository.save(wallet);
  }

  async findAllByUser(userId: number): Promise<Wallet[]> {
    // Stub: Get all wallets for user
    return this.walletsRepository.find({ where: { userId } });
  }

  async findById(id: number): Promise<Wallet | null> {
    // Stub: Find wallet by ID
    return this.walletsRepository.findOne({ where: { id } });
  }

  async findByAddress(address: string): Promise<Wallet | null> {
    // Find wallet by address (case-insensitive)
    return this.walletsRepository.findOne({
      where: { address: address.toLowerCase() },
    });
  }

  /**
   * Create an embedded wallet with client-side encrypted data
   * The backend never sees the plaintext private key - true self-custody
   */
  async createEmbedded(
    userId: number,
    dto: CreateEmbeddedWalletDto,
  ): Promise<Wallet> {
    // Check if wallet with this address already exists
    const existing = await this.findByAddress(dto.address);
    if (existing) {
      throw new ConflictException('Un wallet avec cette adresse existe déjà');
    }

    // Create wallet entity with client-encrypted data
    const walletEntity = this.walletsRepository.create({
      userId,
      type: 'internal',
      address: dto.address.toLowerCase(),
      provider: 'embedded',
      encryptedPrivateKey: dto.encryptedPrivateKey,
      encryptedMnemonic: dto.encryptedMnemonic,
      salt: dto.salt,
    });

    return this.walletsRepository.save(walletEntity);
  }

  /**
   * Get embedded wallet data for client-side decryption
   */
  async getEmbeddedWalletData(
    userId: number,
    walletId: number,
  ): Promise<{ encryptedPrivateKey: string; encryptedMnemonic: string; salt: string } | null> {
    const wallet = await this.walletsRepository.findOne({
      where: { id: walletId, userId, type: 'internal' },
    });

    if (!wallet || !wallet.encryptedPrivateKey) {
      return null;
    }

    return {
      encryptedPrivateKey: wallet.encryptedPrivateKey,
      encryptedMnemonic: wallet.encryptedMnemonic || '',
      salt: wallet.salt || '',
    };
  }

  /**
   * Check if user has an embedded wallet
   */
  async hasEmbeddedWallet(userId: number): Promise<boolean> {
    const count = await this.walletsRepository.count({
      where: { userId, type: 'internal' },
    });
    return count > 0;
  }
}



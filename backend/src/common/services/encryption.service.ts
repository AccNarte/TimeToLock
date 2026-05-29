import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly saltLength = 32; // 256 bits
  private readonly tagLength = 16; // 128 bits
  private readonly walletEncryptionSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.walletEncryptionSecret = this.configService.get<string>(
      'security.walletEncryptionSecret',
      'default-secret-change-in-production'
    );

    // Warn if using default secret
    if (this.walletEncryptionSecret.includes('default-secret')) {
      this.logger.warn(
        'WARNING: Using default wallet encryption secret. ' +
        'Set WALLET_ENCRYPTION_SECRET in production!'
      );
    }
  }

  /**
   * Derive encryption key from password using PBKDF2
   */
  private deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(password, salt, 100000, this.keyLength, 'sha256');
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  encrypt(data: string, password: string): { encrypted: string; salt: string; iv: string; tag: string } {
    // Generate random salt and IV
    const salt = crypto.randomBytes(this.saltLength);
    const iv = crypto.randomBytes(this.ivLength);

    // Derive key from password
    const key = this.deriveKey(password, salt);

    // Create cipher
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    // Encrypt data
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get authentication tag
    const tag = cipher.getAuthTag();

    return {
      encrypted,
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
    };
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  decrypt(
    encrypted: string,
    password: string,
    salt: string,
    iv: string,
    tag: string,
  ): string {
    // Convert hex strings to buffers
    const saltBuffer = Buffer.from(salt, 'hex');
    const ivBuffer = Buffer.from(iv, 'hex');
    const tagBuffer = Buffer.from(tag, 'hex');

    // Derive key from password
    const key = this.deriveKey(password, saltBuffer);

    // Create decipher
    const decipher = crypto.createDecipheriv(this.algorithm, key, ivBuffer);
    decipher.setAuthTag(tagBuffer);

    // Decrypt data
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Generate a random password for wallet encryption
   * This should be combined with user-specific data for better security
   */
  generateEncryptionPassword(userId: number, userEmail: string): string {
    const data = `${userId}-${userEmail}-${this.walletEncryptionSecret}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}








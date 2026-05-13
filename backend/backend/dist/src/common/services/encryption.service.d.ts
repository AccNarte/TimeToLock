import { ConfigService } from '@nestjs/config';
export declare class EncryptionService {
    private readonly configService;
    private readonly logger;
    private readonly algorithm;
    private readonly keyLength;
    private readonly ivLength;
    private readonly saltLength;
    private readonly tagLength;
    private readonly walletEncryptionSecret;
    constructor(configService: ConfigService);
    private deriveKey;
    encrypt(data: string, password: string): {
        encrypted: string;
        salt: string;
        iv: string;
        tag: string;
    };
    decrypt(encrypted: string, password: string, salt: string, iv: string, tag: string): string;
    generateEncryptionPassword(userId: number, userEmail: string): string;
}

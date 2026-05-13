import { WalletsService } from './wallets.service';
import { CreateInternalWalletDto } from './dto/create-internal-wallet.dto';
import { LinkExternalWalletDto } from './dto/link-external-wallet.dto';
import { CreateEmbeddedWalletDto } from './dto/create-embedded-wallet.dto';
export declare class WalletsController {
    private readonly walletsService;
    constructor(walletsService: WalletsService);
    createInternal(userId: number, dto: CreateInternalWalletDto): Promise<{
        wallet: {
            id: number;
            userId: number;
            type: string;
            address: string;
            provider: string;
            createdAt: Date;
            updatedAt: Date;
        };
        mnemonic: string;
        message: string;
    }>;
    linkExternal(userId: number, dto: LinkExternalWalletDto): Promise<import("./wallet.entity").Wallet>;
    findAll(userId: number): Promise<import("./wallet.entity").Wallet[]>;
    createEmbedded(userId: number, dto: CreateEmbeddedWalletDto): Promise<{
        wallet: {
            id: number;
            userId: number;
            type: string;
            address: string;
            provider: string;
            createdAt: Date;
            updatedAt: Date;
        };
        message: string;
    }>;
    getEncryptedData(userId: number, walletId: number): Promise<{
        encryptedPrivateKey: string;
        encryptedMnemonic: string;
        salt: string;
    }>;
    hasEmbedded(userId: number): Promise<{
        hasEmbedded: boolean;
    }>;
}

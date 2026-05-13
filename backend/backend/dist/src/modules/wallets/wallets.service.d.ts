import { Repository } from 'typeorm';
import { Wallet } from './wallet.entity';
import { CreateInternalWalletDto } from './dto/create-internal-wallet.dto';
import { LinkExternalWalletDto } from './dto/link-external-wallet.dto';
import { CreateEmbeddedWalletDto } from './dto/create-embedded-wallet.dto';
import { EncryptionService } from '../../common/services/encryption.service';
import { UsersService } from '../users/users.service';
export declare class WalletsService {
    private walletsRepository;
    private encryptionService;
    private usersService;
    constructor(walletsRepository: Repository<Wallet>, encryptionService: EncryptionService, usersService: UsersService);
    createInternal(userId: number, dto: CreateInternalWalletDto): Promise<{
        wallet: Wallet;
        mnemonic: string;
    }>;
    linkExternal(userId: number, dto: LinkExternalWalletDto): Promise<Wallet>;
    findAllByUser(userId: number): Promise<Wallet[]>;
    findById(id: number): Promise<Wallet | null>;
    findByAddress(address: string): Promise<Wallet | null>;
    createEmbedded(userId: number, dto: CreateEmbeddedWalletDto): Promise<Wallet>;
    getEmbeddedWalletData(userId: number, walletId: number): Promise<{
        encryptedPrivateKey: string;
        encryptedMnemonic: string;
        salt: string;
    } | null>;
    hasEmbeddedWallet(userId: number): Promise<boolean>;
}

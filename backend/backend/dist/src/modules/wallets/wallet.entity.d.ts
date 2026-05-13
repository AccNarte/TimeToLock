import { User } from '../users/user.entity';
import { CryptoLock } from '../timelock-crypto/crypto-lock.entity';
export type WalletType = 'external' | 'internal';
export declare class Wallet {
    id: number;
    userId: number;
    type: string;
    address: string;
    provider: string;
    encryptedPrivateKey: string;
    encryptedMnemonic: string;
    salt: string;
    createdAt: Date;
    updatedAt: Date;
    user: User;
    cryptoLocks: CryptoLock[];
}

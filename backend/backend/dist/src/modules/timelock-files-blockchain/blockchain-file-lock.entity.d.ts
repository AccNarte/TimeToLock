import { User } from '../users/user.entity';
import { Wallet } from '../wallets/wallet.entity';
export type BlockchainFileLockStatus = 'LOCKED' | 'UNLOCKABLE' | 'UNLOCKED';
export declare class BlockchainFileLock {
    id: number;
    userId: number;
    walletId: number;
    title: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    ipfsHash: string;
    lockedTxHash: string;
    lockContractAddress: string;
    chainId: number;
    unlockAt: Date;
    unlockedAt: Date | null;
    status: BlockchainFileLockStatus;
    createdAt: Date;
    updatedAt: Date;
    user: User;
    wallet: Wallet;
}

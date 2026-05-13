import { Wallet } from '../wallets/wallet.entity';
import { TokenContract } from '../tokens/token-contract.entity';
export type CryptoLockStatus = 'LOCKED' | 'UNLOCKABLE' | 'WITHDRAWN';
export declare class CryptoLock {
    id: number;
    userWalletId: number;
    tokenContractId: number;
    amountWei: string;
    unlockAt: Date;
    lockedTxHash: string;
    lockContractAddress: string;
    withdrawTxHash: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    wallet: Wallet;
    tokenContract: TokenContract;
}

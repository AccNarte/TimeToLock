import { Web3Service } from './web3.service';
import { ContractService } from './contract.service';
export interface PreparedTransaction {
    to: string;
    data: string;
    gasLimit: bigint;
    gasPrice: bigint;
    value?: bigint;
}
export interface LockStatus {
    owner: string;
    token: string;
    amount: bigint;
    unlockTime: bigint;
    withdrawn: boolean;
    status: 'LOCKED' | 'UNLOCKABLE' | 'WITHDRAWN';
}
export declare class TimelockContractService {
    private readonly web3Service;
    private readonly contractService;
    private readonly logger;
    constructor(web3Service: Web3Service, contractService: ContractService);
    prepareCreateLock(chainId: number, tokenAddress: string, amountWei: string, unlockAt: Date): Promise<PreparedTransaction>;
    createLockWithInternalWallet(privateKey: string, chainId: number, tokenAddress: string, amountWei: string, unlockAt: Date): Promise<{
        txHash: string;
        lockAddress?: string;
    }>;
    parseLockAddressFromReceipt(txHash: string, chainId: number): Promise<string | null>;
    withdrawFromLock(privateKey: string, lockAddress: string, chainId: number): Promise<string>;
    getLockStatus(lockAddress: string, chainId: number): Promise<LockStatus>;
    getUserLocks(userAddress: string, chainId: number): Promise<string[]>;
}

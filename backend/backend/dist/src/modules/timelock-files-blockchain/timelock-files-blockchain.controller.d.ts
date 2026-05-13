import { TimelockFilesBlockchainService } from './timelock-files-blockchain.service';
import { CreateBlockchainFileLockDto, SyncStatusDto } from './dto';
export declare class TimelockFilesBlockchainController {
    private readonly timelockFilesBlockchainService;
    constructor(timelockFilesBlockchainService: TimelockFilesBlockchainService);
    create(userId: number, dto: CreateBlockchainFileLockDto): Promise<import("./blockchain-file-lock.entity").BlockchainFileLock>;
    findAll(userId: number): Promise<import("./blockchain-file-lock.entity").BlockchainFileLock[]>;
    getStats(userId: number): Promise<{
        total: number;
        locked: number;
        unlockable: number;
        unlocked: number;
        totalSizeBytes: number;
    }>;
    findOne(userId: number, id: number): Promise<import("./blockchain-file-lock.entity").BlockchainFileLock>;
    getIpfsUrl(userId: number, id: number): Promise<{
        url: string;
    }>;
    markAsUnlocked(userId: number, id: number): Promise<import("./blockchain-file-lock.entity").BlockchainFileLock>;
    syncStatus(userId: number, id: number, dto: SyncStatusDto): Promise<import("./blockchain-file-lock.entity").BlockchainFileLock>;
    delete(userId: number, id: number): Promise<void>;
}

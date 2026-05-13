import { Repository } from 'typeorm';
import { BlockchainFileLock } from './blockchain-file-lock.entity';
import { CreateBlockchainFileLockDto } from './dto/create-blockchain-file-lock.dto';
import { IpfsService } from '../ipfs/ipfs.service';
export declare class TimelockFilesBlockchainService {
    private readonly fileLockRepository;
    private readonly ipfsService;
    private readonly logger;
    constructor(fileLockRepository: Repository<BlockchainFileLock>, ipfsService: IpfsService);
    create(userId: number, dto: CreateBlockchainFileLockDto): Promise<BlockchainFileLock>;
    findAllByUser(userId: number): Promise<BlockchainFileLock[]>;
    findById(id: number, userId: number): Promise<BlockchainFileLock | null>;
    getIpfsUrl(id: number, userId: number): Promise<string>;
    markAsUnlocked(id: number, userId: number): Promise<BlockchainFileLock>;
    syncStatus(id: number, userId: number): Promise<BlockchainFileLock>;
    getUserStats(userId: number): Promise<{
        total: number;
        locked: number;
        unlockable: number;
        unlocked: number;
        totalSizeBytes: number;
    }>;
    delete(id: number, userId: number): Promise<void>;
}

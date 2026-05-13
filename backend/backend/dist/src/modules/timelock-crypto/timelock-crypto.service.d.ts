import { Repository } from 'typeorm';
import { CryptoLock } from './crypto-lock.entity';
import { CreateCryptoLockDto } from './dto/create-crypto-lock.dto';
import { SaveLockFromFrontendDto } from './dto/save-lock-from-frontend.dto';
import { TimelockContractService } from '../blockchain/services/timelock-contract.service';
export declare class TimelockCryptoService {
    private cryptoLockRepository;
    private readonly timelockContractService;
    private readonly logger;
    constructor(cryptoLockRepository: Repository<CryptoLock>, timelockContractService: TimelockContractService);
    create(dto: CreateCryptoLockDto): Promise<CryptoLock>;
    saveLockFromFrontend(dto: SaveLockFromFrontendDto): Promise<CryptoLock>;
    findAllByWallet(walletId: number): Promise<CryptoLock[]>;
    findById(id: number): Promise<CryptoLock | null>;
    findAllByUser(userId: number): Promise<any[]>;
    syncLockStatus(lockId: number, chainId: number): Promise<CryptoLock>;
    markAsWithdrawn(lockId: number, txHash: string, userId: number): Promise<CryptoLock>;
}

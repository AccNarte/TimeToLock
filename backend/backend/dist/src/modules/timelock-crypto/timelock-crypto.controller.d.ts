import { TimelockCryptoService } from './timelock-crypto.service';
import { CreateCryptoLockDto } from './dto/create-crypto-lock.dto';
import { SaveLockFromFrontendDto } from './dto/save-lock-from-frontend.dto';
import { MarkWithdrawnDto } from './dto/mark-withdrawn.dto';
export declare class TimelockCryptoController {
    private readonly timelockCryptoService;
    constructor(timelockCryptoService: TimelockCryptoService);
    lock(dto: CreateCryptoLockDto): Promise<import("./crypto-lock.entity").CryptoLock>;
    saveLockFromFrontend(dto: SaveLockFromFrontendDto): Promise<import("./crypto-lock.entity").CryptoLock>;
    findAll(userId: number): Promise<any[]>;
    findOne(id: string): Promise<import("./crypto-lock.entity").CryptoLock>;
    syncStatus(id: string, chainId: number): Promise<import("./crypto-lock.entity").CryptoLock>;
    markWithdrawn(id: string, dto: MarkWithdrawnDto, userId: number): Promise<import("./crypto-lock.entity").CryptoLock>;
}

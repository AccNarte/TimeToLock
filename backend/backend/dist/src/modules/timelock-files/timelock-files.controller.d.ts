import { TimelockFilesService } from './timelock-files.service';
import { CreateFileLockDto } from './dto/create-file-lock.dto';
export declare class TimelockFilesController {
    private readonly timelockFilesService;
    constructor(timelockFilesService: TimelockFilesService);
    create(userId: number, dto: CreateFileLockDto): Promise<import("./file-lock.entity").FileLock>;
    findAll(userId: number): Promise<import("./file-lock.entity").FileLock[]>;
    findOne(userId: number, id: string): Promise<import("./file-lock.entity").FileLock>;
    getEncryptedData(userId: number, id: string): Promise<{
        ciphertext: string;
        iv: string;
        salt: string;
        authTag: string;
        hashChecksum: string;
        filename: string;
        mimeType: string;
    }>;
    markUnlocked(userId: number, id: string): Promise<import("./file-lock.entity").FileLock>;
}

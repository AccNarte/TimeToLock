import { Repository } from 'typeorm';
import { FileLock } from './file-lock.entity';
import { File } from '../files/file.entity';
import { CreateFileLockDto } from './dto/create-file-lock.dto';
export declare class TimelockFilesService {
    private fileLockRepository;
    private fileRepository;
    constructor(fileLockRepository: Repository<FileLock>, fileRepository: Repository<File>);
    create(userId: number, dto: CreateFileLockDto): Promise<FileLock>;
    findAllByUser(userId: number): Promise<FileLock[]>;
    findById(id: number, userId: number): Promise<FileLock | null>;
    getEncryptedFileData(id: number, userId: number): Promise<{
        ciphertext: string;
        iv: string;
        salt: string;
        authTag: string;
        hashChecksum: string;
        filename: string;
        mimeType: string;
    }>;
    markAsUnlocked(id: number, userId: number): Promise<FileLock>;
}

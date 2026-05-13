import { FileLock } from '../timelock-files/file-lock.entity';
export declare class File {
    id: number;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: Date;
    fileLocks: FileLock[];
}

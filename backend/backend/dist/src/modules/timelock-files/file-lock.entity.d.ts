import { User } from '../users/user.entity';
import { File } from '../files/file.entity';
export type FileLockStatus = 'LOCKED' | 'UNLOCKABLE' | 'UNLOCKED';
export declare class FileLock {
    id: number;
    userId: number;
    fileId: number;
    title: string;
    ciphertext: string;
    iv: string;
    salt: string;
    authTag: string;
    hashChecksum: string;
    unlockAt: Date;
    unlockedAt: Date;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    user: User;
    file: File;
}

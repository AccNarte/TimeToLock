export declare class CreateFileLockDto {
    title?: string;
    filename: string;
    mimeType?: string;
    sizeBytes?: number;
    ciphertext: string;
    iv: string;
    salt: string;
    authTag: string;
    hashChecksum?: string;
    unlockAt: string;
}

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileLock } from './file-lock.entity';
import { File } from '../files/file.entity';
import { CreateFileLockDto } from './dto/create-file-lock.dto';

@Injectable()
export class TimelockFilesService {
  constructor(
    @InjectRepository(FileLock)
    private fileLockRepository: Repository<FileLock>,
    @InjectRepository(File)
    private fileRepository: Repository<File>,
  ) {}

  async create(userId: number, dto: CreateFileLockDto): Promise<FileLock> {
    // First create the file record
    const file = this.fileRepository.create({
      filename: dto.filename,
      mimeType: dto.mimeType || 'application/octet-stream',
      sizeBytes: dto.sizeBytes,
    });
    const savedFile = await this.fileRepository.save(file);

    // Then create the file lock with reference to the file
    const fileLock = this.fileLockRepository.create({
      userId,
      fileId: savedFile.id,
      title: dto.title || dto.filename,
      ciphertext: dto.ciphertext,
      iv: dto.iv,
      salt: dto.salt,
      authTag: dto.authTag,
      hashChecksum: dto.hashChecksum,
      unlockAt: new Date(dto.unlockAt),
      status: 'LOCKED',
    });
    return this.fileLockRepository.save(fileLock);
  }

  async findAllByUser(userId: number): Promise<FileLock[]> {
    const files = await this.fileLockRepository.find({
      where: { userId },
      relations: ['file'],
      order: { createdAt: 'DESC' },
    });

    // Sync status based on unlock time
    const now = new Date();
    for (const fileLock of files) {
      const shouldBeUnlockable = fileLock.unlockAt <= now && fileLock.status === 'LOCKED';
      if (shouldBeUnlockable) {
        fileLock.status = 'UNLOCKABLE';
        await this.fileLockRepository.save(fileLock);
      }
    }

    return files;
  }

  async findById(id: number, userId: number): Promise<FileLock | null> {
    const fileLock = await this.fileLockRepository.findOne({
      where: { id, userId },
      relations: ['file'],
    });

    if (fileLock) {
      // Sync status
      const now = new Date();
      if (fileLock.unlockAt <= now && fileLock.status === 'LOCKED') {
        fileLock.status = 'UNLOCKABLE';
        await this.fileLockRepository.save(fileLock);
      }
    }

    return fileLock;
  }

  /**
   * Get encrypted file data for decryption (only if unlockable or unlocked)
   */
  async getEncryptedFileData(id: number, userId: number): Promise<{
    ciphertext: string;
    iv: string;
    salt: string;
    authTag: string;
    hashChecksum: string;
    filename: string;
    mimeType: string;
  }> {
    const fileLock = await this.findById(id, userId);

    if (!fileLock) {
      throw new NotFoundException('File lock not found');
    }

    // Check if file is unlockable
    const now = new Date();
    if (fileLock.unlockAt > now) {
      throw new ForbiddenException('File is still locked');
    }

    return {
      ciphertext: fileLock.ciphertext,
      iv: fileLock.iv,
      salt: fileLock.salt,
      authTag: fileLock.authTag,
      hashChecksum: fileLock.hashChecksum,
      filename: fileLock.file?.filename || 'file',
      mimeType: fileLock.file?.mimeType || 'application/octet-stream',
    };
  }

  /**
   * Mark file as unlocked after successful decryption
   */
  async markAsUnlocked(id: number, userId: number): Promise<FileLock> {
    const fileLock = await this.findById(id, userId);

    if (!fileLock) {
      throw new NotFoundException('File lock not found');
    }

    fileLock.status = 'UNLOCKED';
    fileLock.unlockedAt = new Date();

    return this.fileLockRepository.save(fileLock);
  }
}



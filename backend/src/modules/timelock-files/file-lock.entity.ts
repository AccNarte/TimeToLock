import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';
import { File } from '../files/file.entity';

export type FileLockStatus = 'LOCKED' | 'UNLOCKABLE' | 'UNLOCKED';

@Entity('file_locks')
@Index('idx_filelocks_user', ['userId'])
@Index('idx_filelocks_file', ['fileId'])
export class FileLock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer', name: 'user_id' })
  userId: number;

  @Column({ type: 'integer', name: 'file_id' })
  fileId: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string;

  @Column({ type: 'text' })
  ciphertext: string;

  @Column({ type: 'varchar', length: 255 })
  iv: string;

  @Column({ type: 'varchar', length: 255 })
  salt: string;

  @Column({ type: 'varchar', length: 255, name: 'auth_tag' })
  authTag: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'hash_checksum' })
  hashChecksum: string;

  @Column({ type: 'timestamp', name: 'unlock_at' })
  unlockAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'unlocked_at' })
  unlockedAt: Date;

  @Column({ type: 'varchar', length: 50, default: 'LOCKED' })
  status: string; // 'LOCKED' | 'UNLOCKABLE' | 'UNLOCKED'

  @CreateDateColumn({ type: 'timestamp', default: () => 'NOW()', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'NOW()', name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.fileLocks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => File, (file) => file.fileLocks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'file_id' })
  file: File;
}



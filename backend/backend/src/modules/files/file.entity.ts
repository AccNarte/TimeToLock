import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { FileLock } from '../timelock-files/file-lock.entity';

@Entity('files')
export class File {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  filename: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'mime_type' })
  mimeType: string;

  @Column({ type: 'integer', nullable: true, name: 'size_bytes' })
  sizeBytes: number;

  @CreateDateColumn({ type: 'timestamp', default: () => 'NOW()', name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => FileLock, (fileLock) => fileLock.file)
  fileLocks: FileLock[];
}


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
import { Wallet } from '../wallets/wallet.entity';

export type BlockchainFileLockStatus = 'LOCKED' | 'UNLOCKABLE' | 'UNLOCKED';

@Entity('blockchain_file_locks')
@Index('idx_blockchain_filelocks_user', ['userId'])
@Index('idx_blockchain_filelocks_wallet', ['walletId'])
@Index('idx_blockchain_filelocks_contract', ['lockContractAddress'])
@Index('idx_blockchain_filelocks_ipfs', ['ipfsHash'])
export class BlockchainFileLock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer', name: 'user_id' })
  userId: number;

  @Column({ type: 'integer', name: 'wallet_id' })
  walletId: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string;

  @Column({ type: 'varchar', length: 255 })
  filename: string;

  @Column({ type: 'varchar', length: 100, name: 'mime_type', default: 'application/octet-stream' })
  mimeType: string;

  @Column({ type: 'bigint', name: 'size_bytes' })
  sizeBytes: number;

  @Column({ type: 'varchar', length: 100, name: 'ipfs_hash' })
  ipfsHash: string;

  @Column({ type: 'varchar', length: 100, name: 'locked_tx_hash' })
  lockedTxHash: string;

  @Column({ type: 'varchar', length: 100, name: 'lock_contract_address' })
  lockContractAddress: string;

  @Column({ type: 'integer', name: 'chain_id' })
  chainId: number;

  @Column({ type: 'timestamp', name: 'unlock_at' })
  unlockAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'unlocked_at' })
  unlockedAt: Date | null;

  @Column({ type: 'varchar', length: 50, default: 'LOCKED' })
  status: BlockchainFileLockStatus;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Wallet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;
}

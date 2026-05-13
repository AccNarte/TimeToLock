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
import { Wallet } from '../wallets/wallet.entity';
import { TokenContract } from '../tokens/token-contract.entity';

export type CryptoLockStatus = 'LOCKED' | 'UNLOCKABLE' | 'WITHDRAWN';

@Entity('crypto_locks')
@Index('idx_cryptolocks_wallet', ['userWalletId'])
@Index('idx_cryptolocks_token', ['tokenContractId'])
export class CryptoLock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer', name: 'user_wallet_id' })
  userWalletId: number;

  @Column({ type: 'integer', name: 'token_contract_id' })
  tokenContractId: number;

  @Column({ type: 'numeric', precision: 78, scale: 0, name: 'amount_wei' })
  amountWei: string;

  @Column({ type: 'timestamp', name: 'unlock_at' })
  unlockAt: Date;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'locked_tx_hash' })
  lockedTxHash: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'lock_contract_address' })
  lockContractAddress: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'withdraw_tx_hash' })
  withdrawTxHash: string;

  @Column({ type: 'varchar', length: 50, default: 'LOCKED' })
  status: string; // 'LOCKED' | 'UNLOCKABLE' | 'WITHDRAWN'

  @CreateDateColumn({ type: 'timestamp', default: () => 'NOW()', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'NOW()', name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Wallet, (wallet) => wallet.cryptoLocks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_wallet_id' })
  wallet: Wallet;

  @ManyToOne(() => TokenContract, (tokenContract) => tokenContract.cryptoLocks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'token_contract_id' })
  tokenContract: TokenContract;
}



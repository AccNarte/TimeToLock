import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';
import { CryptoLock } from '../timelock-crypto/crypto-lock.entity';

export type WalletType = 'external' | 'internal';

@Entity('user_wallets')
@Index('idx_wallets_user', ['userId'])
export class Wallet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer', name: 'user_id' })
  userId: number;

  @Column({ type: 'varchar', length: 50 })
  type: string; // 'external' | 'internal'

  @Column({ type: 'varchar', length: 255, unique: true })
  address: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  provider: string;

  @Column({ type: 'text', nullable: true, name: 'encrypted_private_key' })
  encryptedPrivateKey: string;

  @Column({ type: 'text', nullable: true, name: 'encrypted_mnemonic' })
  encryptedMnemonic: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  salt: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'NOW()', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'NOW()', name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.wallets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => CryptoLock, (cryptoLock) => cryptoLock.wallet)
  cryptoLocks: CryptoLock[];
}



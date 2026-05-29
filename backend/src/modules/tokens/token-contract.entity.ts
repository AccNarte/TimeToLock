import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
  Unique,
} from 'typeorm';
import { Token } from './token.entity';
import { CryptoNetwork } from '../crypto-networks/crypto-network.entity';
import { CryptoLock } from '../timelock-crypto/crypto-lock.entity';

@Entity('token_contracts')
@Index('idx_token_contracts_token', ['tokenId'])
@Index('idx_token_contracts_network', ['networkId'])
@Unique(['tokenId', 'networkId'])
export class TokenContract {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer', name: 'token_id' })
  tokenId: number;

  @Column({ type: 'integer', name: 'network_id' })
  networkId: number;

  @Column({ type: 'varchar', length: 255, name: 'contract_address' })
  contractAddress: string;

  @ManyToOne(() => Token, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'token_id' })
  token: Token;

  @ManyToOne(() => CryptoNetwork, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'network_id' })
  network: CryptoNetwork;

  @OneToMany(() => CryptoLock, (cryptoLock) => cryptoLock.tokenContract)
  cryptoLocks: CryptoLock[];
}










import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimelockCryptoController } from './timelock-crypto.controller';
import { TimelockCryptoService } from './timelock-crypto.service';
import { CryptoLock } from './crypto-lock.entity';
import { TokenContract } from '../tokens/token-contract.entity';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CryptoLock, TokenContract]),
    BlockchainModule,
    AuditModule,
  ],
  controllers: [TimelockCryptoController],
  providers: [TimelockCryptoService],
  exports: [TimelockCryptoService],
})
export class TimelockCryptoModule {}

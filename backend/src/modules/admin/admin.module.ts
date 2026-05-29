import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../users/user.entity';
import { CryptoLock } from '../timelock-crypto/crypto-lock.entity';
import { BlockchainFileLock } from '../timelock-files-blockchain/blockchain-file-lock.entity';
import { FileLock } from '../timelock-files/file-lock.entity';
import { Wallet } from '../wallets/wallet.entity';
import { Role } from '../roles/role.entity';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      CryptoLock,
      BlockchainFileLock,
      FileLock,
      Wallet,
      Role,
    ]),
    AuditModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}

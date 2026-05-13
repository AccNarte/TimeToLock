import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockchainFileLock } from './blockchain-file-lock.entity';
import { TimelockFilesBlockchainService } from './timelock-files-blockchain.service';
import { TimelockFilesBlockchainController } from './timelock-files-blockchain.controller';
import { IpfsModule } from '../ipfs/ipfs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BlockchainFileLock]),
    IpfsModule,
  ],
  controllers: [TimelockFilesBlockchainController],
  providers: [TimelockFilesBlockchainService],
  exports: [TimelockFilesBlockchainService],
})
export class TimelockFilesBlockchainModule {}

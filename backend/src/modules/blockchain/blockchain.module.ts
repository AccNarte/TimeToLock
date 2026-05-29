import { Module } from '@nestjs/common';
import { Web3Service } from './services/web3.service';
import { ContractService } from './services/contract.service';
import { TimelockContractService } from './services/timelock-contract.service';
import { FactoryDeploymentsModule } from '../factory-deployments/factory-deployments.module';

@Module({
  imports: [FactoryDeploymentsModule],
  providers: [Web3Service, ContractService, TimelockContractService],
  exports: [Web3Service, ContractService, TimelockContractService],
})
export class BlockchainModule {}

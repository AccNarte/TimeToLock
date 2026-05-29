import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import { Web3Service } from './web3.service';
import { FactoryDeploymentsService } from '../../factory-deployments/factory-deployments.service';

@Injectable()
export class ContractService {
  private readonly logger = new Logger(ContractService.name);
  private abis: Map<string, any[]> = new Map();

  constructor(
    private readonly web3Service: Web3Service,
    private readonly factoryDeployments: FactoryDeploymentsService,
  ) {
    // Load ABIs on startup
    this.loadAbis();
  }

  /**
   * Load all ABIs from the abis directory
   */
  private loadAbis() {
    // Try multiple possible paths
    const possiblePaths = [
      path.join(__dirname, '..', 'abis'),
      path.join(__dirname, '..', '..', 'blockchain', 'abis'),
      path.join(process.cwd(), 'dist', 'modules', 'blockchain', 'abis'),
    ];

    this.logger.log(`Looking for ABIs, __dirname: ${__dirname}`);

    let abisDir: string | null = null;
    for (const p of possiblePaths) {
      this.logger.log(`Checking path: ${p}`);
      if (fs.existsSync(p)) {
        abisDir = p;
        this.logger.log(`Found ABIs directory at: ${abisDir}`);
        break;
      }
    }

    if (!abisDir) {
      this.logger.warn(`ABIs directory not found in any of: ${possiblePaths.join(', ')}`);
      return;
    }

    const files = fs.readdirSync(abisDir);

    for (const file of files) {
      if (file.endsWith('.json')) {
        const contractName = file.replace('.json', '');
        const abiPath = path.join(abisDir, file);

        try {
          const abiContent = fs.readFileSync(abiPath, 'utf8');
          const abi = JSON.parse(abiContent);
          this.abis.set(contractName, abi);
          this.logger.log(`Loaded ABI for ${contractName}`);
        } catch (error) {
          this.logger.error(`Failed to load ABI ${file}: ${error.message}`);
        }
      }
    }
  }

  /**
   * Get ABI for a contract
   */
  getAbi(contractName: string): any[] {
    const abi = this.abis.get(contractName);
    if (!abi) {
      throw new Error(`ABI not found for contract: ${contractName}`);
    }
    return abi;
  }

  /**
   * Get TimelockFactory contract instance
   */
  getTimelockFactory(
    chainId: number,
    signer?: ethers.Signer,
  ): ethers.Contract {
    const factoryAddress = this.factoryDeployments.getCurrentOrThrow(chainId, 'crypto_timelock');
    const abi = this.getAbi('TimelockFactory');

    const providerOrSigner =
      signer || this.web3Service.getProvider(chainId);

    return new ethers.Contract(factoryAddress, abi, providerOrSigner);
  }

  /**
   * Get TimelockVault contract instance
   */
  getTimelockVault(
    vaultAddress: string,
    chainId: number,
    signer?: ethers.Signer,
  ): ethers.Contract {
    const abi = this.getAbi('TimelockVault');

    const providerOrSigner =
      signer || this.web3Service.getProvider(chainId);

    return new ethers.Contract(vaultAddress, abi, providerOrSigner);
  }

  /**
   * Get ERC20 token contract instance
   */
  getERC20Contract(
    tokenAddress: string,
    chainId: number,
    signer?: ethers.Signer,
  ): ethers.Contract {
    const abi = this.getAbi('ERC20');

    const providerOrSigner =
      signer || this.web3Service.getProvider(chainId);

    return new ethers.Contract(tokenAddress, abi, providerOrSigner);
  }

  /**
   * Get factory address for a chain
   */
  getFactoryAddress(chainId: number): string {
    return this.factoryDeployments.getCurrentOrThrow(chainId, 'crypto_timelock');
  }

  /**
   * Parse event logs from a transaction receipt
   */
  parseEventLogs(
    receipt: ethers.TransactionReceipt,
    contractInterface: ethers.Interface,
    eventName: string,
  ): ethers.LogDescription[] {
    const parsedLogs: ethers.LogDescription[] = [];

    for (const log of receipt.logs) {
      try {
        const parsed = contractInterface.parseLog({
          topics: [...log.topics],
          data: log.data,
        });

        if (parsed && parsed.name === eventName) {
          parsedLogs.push(parsed);
        }
      } catch (error) {
        // Skip logs that don't match
        continue;
      }
    }

    return parsedLogs;
  }
}

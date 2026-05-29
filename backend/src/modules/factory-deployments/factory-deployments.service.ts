import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FactoryDeployment } from './factory-deployment.entity';

export type ContractType = 'crypto_timelock' | 'file_lock';

interface RegisterParams {
  chainId: number;
  contractType?: ContractType;
  address: string;
  txHash?: string | null;
}

/**
 * Holds the active factory address per (chainId, contractType). Keeps an
 * in-memory cache hydrated from the DB so callers (e.g. ContractService) stay
 * synchronous. Cache is refreshed whenever a new deployment is registered.
 */
@Injectable()
export class FactoryDeploymentsService implements OnModuleInit {
  private readonly logger = new Logger(FactoryDeploymentsService.name);
  private cache = new Map<string, string>();

  constructor(
    @InjectRepository(FactoryDeployment)
    private readonly repo: Repository<FactoryDeployment>,
  ) {}

  async onModuleInit() {
    await this.hydrateCache();
  }

  private key(chainId: number, contractType: ContractType): string {
    return `${chainId}:${contractType}`;
  }

  /** Env-var fallback so existing deployments configured via .env keep working. */
  private envFallback(chainId: number, contractType: ContractType): string | null {
    if (contractType === 'crypto_timelock') {
      if (chainId === 137) return process.env.FACTORY_ADDRESS_POLYGON || null;
      if (chainId === 80002) return process.env.FACTORY_ADDRESS_AMOY || null;
      if (chainId === 31337) return process.env.FACTORY_ADDRESS_LOCAL || null;
    }
    if (contractType === 'file_lock') {
      if (chainId === 137) return process.env.FILE_LOCK_FACTORY_POLYGON || null;
      if (chainId === 80002) return process.env.FILE_LOCK_FACTORY_AMOY || null;
    }
    return null;
  }

  async hydrateCache(): Promise<void> {
    const rows = await this.repo.find({ where: { isActive: true } });
    this.cache.clear();
    for (const row of rows) {
      this.cache.set(
        this.key(row.chainId, row.contractType as ContractType),
        row.address,
      );
    }
    this.logger.log(`Loaded ${rows.length} active factory address(es) from DB`);
  }

  getCurrent(
    chainId: number,
    contractType: ContractType = 'crypto_timelock',
  ): string | null {
    return this.cache.get(this.key(chainId, contractType))
      ?? this.envFallback(chainId, contractType);
  }

  /**
   * Throws if no factory is registered for the chain. Mirrors the old
   * `getFactoryAddress` behaviour so call-sites don't have to change.
   */
  getCurrentOrThrow(
    chainId: number,
    contractType: ContractType = 'crypto_timelock',
  ): string {
    const address = this.getCurrent(chainId, contractType);
    if (!address) {
      throw new Error(
        `Factory address not configured for chain ${chainId} (${contractType}). Deploy and register it first.`,
      );
    }
    return address;
  }

  async register(userId: number, params: RegisterParams): Promise<FactoryDeployment> {
    const contractType = params.contractType ?? 'crypto_timelock';

    // Demote previous active entry for this (chainId, contractType) so we keep
    // a history but only one active row at a time.
    await this.repo.update(
      { chainId: params.chainId, contractType, isActive: true },
      { isActive: false },
    );

    const created = this.repo.create({
      chainId: params.chainId,
      contractType,
      address: params.address,
      txHash: params.txHash ?? null,
      deployedByUserId: userId,
      isActive: true,
    });
    const saved = await this.repo.save(created);
    this.cache.set(this.key(params.chainId, contractType), params.address);
    this.logger.log(
      `Registered factory ${params.address} for chain ${params.chainId} (${contractType}) by user ${userId}`,
    );
    return saved;
  }

  async list(): Promise<FactoryDeployment[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }
}

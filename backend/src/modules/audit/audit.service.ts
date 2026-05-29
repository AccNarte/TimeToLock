import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
import { AuditLog } from './audit.entity';
import { Action } from './action.entity';
import { EntityType } from './entity-type.entity';
import { ListAuditDto } from './dto/list-audit.dto';

export interface AuditLogDto {
  id: number;
  action: string | null;
  entityType: string | null;
  entityId: number;
  userId: number | null;
  userEmail: string | null;
  userWalletId: number | null;
  walletAddress: string | null;
  metadataJson: Record<string, any> | null;
  createdAt: Date;
}

export interface PaginatedAudit {
  items: AuditLogDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  // Name → id caches so we don't hit the lookup tables on every write.
  private readonly actionCache = new Map<string, number>();
  private readonly entityTypeCache = new Map<string, number>();

  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    @InjectRepository(Action)
    private actionRepository: Repository<Action>,
    @InjectRepository(EntityType)
    private entityTypeRepository: Repository<EntityType>,
  ) {}

  /** Find (or create) the lookup row for `name`, returning its id. Cached. */
  private async resolveId<T extends ObjectLiteral & { id: number }>(
    name: string,
    repo: Repository<T>,
    cache: Map<string, number>,
  ): Promise<number> {
    const cached = cache.get(name);
    if (cached) return cached;

    let row = await repo.findOne({ where: { name } as any });
    if (!row) {
      try {
        const entity = repo.create({ name } as any) as unknown as T;
        row = await repo.save(entity);
      } catch {
        // Another concurrent insert won the unique race — re-read.
        row = await repo.findOne({ where: { name } as any });
      }
    }
    if (!row) throw new Error(`Could not resolve audit lookup "${name}"`);
    cache.set(name, row.id);
    return row.id;
  }

  /**
   * Record an audited event. **Never throws** — an audit failure must not break
   * the business action that triggered it (logged to the Nest logger instead).
   */
  async log(params: {
    action: string;
    entityType: string;
    entityId: number;
    userId?: number | null;
    userWalletId?: number | null;
    metadata?: Record<string, any> | null;
  }): Promise<void> {
    try {
      const [actionId, entityTypeId] = await Promise.all([
        this.resolveId(params.action, this.actionRepository, this.actionCache),
        this.resolveId(params.entityType, this.entityTypeRepository, this.entityTypeCache),
      ]);

      const entry = this.auditLogRepository.create({
        userId: params.userId ?? null,
        userWalletId: params.userWalletId ?? null,
        entityTypeId,
        entityId: params.entityId,
        actionId,
        metadataJson: params.metadata ?? null,
      });
      await this.auditLogRepository.save(entry);
    } catch (e: any) {
      this.logger.error(`Audit log failed (${params.action}): ${e?.message}`);
    }
  }

  private toDto(row: AuditLog): AuditLogDto {
    return {
      id: row.id,
      action: row.action?.name ?? null,
      entityType: row.entityType?.name ?? null,
      entityId: row.entityId,
      userId: row.userId ?? null,
      userEmail: row.user?.email ?? null,
      userWalletId: row.userWalletId ?? null,
      walletAddress: row.wallet?.address ?? null,
      metadataJson: (row.metadataJson as Record<string, any>) ?? null,
      createdAt: row.createdAt,
    };
  }

  /** Recent activity for one user (dashboard). Friendly DTOs, newest first. */
  async findAllByUser(userId: number): Promise<AuditLogDto[]> {
    const rows = await this.auditLogRepository.find({
      where: { userId },
      relations: ['action', 'entityType', 'wallet'],
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return rows.map((r) => this.toDto(r));
  }

  /** Paginated + filtered audit log for the admin panel. */
  async findPaginated(dto: ListAuditDto): Promise<PaginatedAudit> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;

    const qb = this.auditLogRepository
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.action', 'action')
      .leftJoinAndSelect('a.entityType', 'entityType')
      .leftJoinAndSelect('a.user', 'user')
      .leftJoinAndSelect('a.wallet', 'wallet');

    if (dto.action) qb.andWhere('action.name = :action', { action: dto.action });
    if (dto.entityType) qb.andWhere('entityType.name = :etype', { etype: dto.entityType });
    if (dto.userId) qb.andWhere('a.userId = :uid', { uid: dto.userId });

    qb.orderBy('a.createdAt', dto.order ?? 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, total] = await qb.getManyAndCount();

    return {
      items: rows.map((r) => this.toDto(r)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }
}

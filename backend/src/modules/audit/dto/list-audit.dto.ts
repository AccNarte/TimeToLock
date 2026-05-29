import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * Paramètres de requête du listing des logs d'audit côté admin
 * (pagination + filtres). Validé et transformé par le `ValidationPipe`
 * global configuré dans `main.ts` (`whitelist: true`, `transform: true`).
 */
export class ListAuditDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  /** Filtre par nom d'action (ex. USER_LOGIN, CRYPTO_LOCK_CREATED). */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  action?: string;

  /** Filtre par type d'entité (USER, CRYPTO_LOCK, FILE_LOCK). */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  entityType?: string;

  /** Filtre par identifiant de l'utilisateur à l'origine de l'action. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  order: 'ASC' | 'DESC' = 'DESC';
}

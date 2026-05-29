import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/** Query parameters for the admin audit-log listing (paginated + filtered). */
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

  /** Filter by action name (e.g. USER_LOGIN). */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  action?: string;

  /** Filter by entity type (USER, CRYPTO_LOCK, FILE_LOCK). */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  entityType?: string;

  /** Filter by the acting user's id. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  order: 'ASC' | 'DESC' = 'DESC';
}

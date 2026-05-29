import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Query parameters for the advanced user listing: pagination, full-text search,
 * multi-criteria filtering and whitelisted sorting. Backed by the global
 * ValidationPipe ({ transform: true, whitelist: true }), so query strings are
 * coerced to the right types and unknown keys are stripped.
 */
export class ListUsersDto {
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

  /** Free-text search on the email column (case-insensitive, partial match). */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  q?: string;

  /** Filter by role name (e.g. 'admin', 'user'). */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  role?: string;

  /** Account status filter. */
  @IsOptional()
  @IsIn(['active', 'banned', 'all'])
  status: 'active' | 'banned' | 'all' = 'all';

  /** Auth method filter (wallet accounts use the @timelock.local suffix). */
  @IsOptional()
  @IsIn(['wallet', 'password', 'all'])
  auth: 'wallet' | 'password' | 'all' = 'all';

  /** Email-verification filter. */
  @IsOptional()
  @IsIn(['true', 'false', 'all'])
  verified: 'true' | 'false' | 'all' = 'all';

  /** Whitelisted sort column. */
  @IsOptional()
  @IsIn(['id', 'email', 'createdAt', 'status'])
  sort: 'id' | 'email' | 'createdAt' | 'status' = 'createdAt';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  order: 'ASC' | 'DESC' = 'DESC';
}

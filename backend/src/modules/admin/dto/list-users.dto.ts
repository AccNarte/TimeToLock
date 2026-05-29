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
 * Paramètres de requête du listing utilisateurs côté admin : pagination,
 * recherche plein-texte, filtres multi-critères et tri sur colonnes
 * whitelistées.
 *
 * Validé et coercé par le `ValidationPipe` global de l'application
 * (`whitelist: true, transform: true`) : les query strings sont
 * automatiquement converties au bon type et les clés inconnues sont
 * supprimées.
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

  /** Recherche plein-texte sur la colonne email (ILIKE, partiel). */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  q?: string;

  /** Filtre par nom de rôle (ex. 'admin', 'user'). */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  role?: string;

  /** Filtre par statut du compte. */
  @IsOptional()
  @IsIn(['active', 'banned', 'all'])
  status: 'active' | 'banned' | 'all' = 'all';

  /**
   * Filtre par méthode d'authentification. Les comptes wallet ont un
   * email auto-généré au format `wallet_<adresse>@timelock.local` —
   * c'est ce suffixe qui sert de discriminant.
   */
  @IsOptional()
  @IsIn(['wallet', 'password', 'all'])
  auth: 'wallet' | 'password' | 'all' = 'all';

  /** Filtre par état de vérification de l'email. */
  @IsOptional()
  @IsIn(['true', 'false', 'all'])
  verified: 'true' | 'false' | 'all' = 'all';

  /** Colonne de tri (whitelistée pour éviter l'injection). */
  @IsOptional()
  @IsIn(['id', 'email', 'createdAt', 'status'])
  sort: 'id' | 'email' | 'createdAt' | 'status' = 'createdAt';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  order: 'ASC' | 'DESC' = 'DESC';
}

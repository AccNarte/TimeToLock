import { IsString, MinLength, MaxLength } from 'class-validator';

/**
 * Payload du changement de mot de passe par l'utilisateur lui-même.
 * Le contrôle d'identité repose sur la connaissance du mot de passe actuel
 * (jamais sur un token séparé) — pas de reset par email mis en place ici.
 */
export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword: string;
}

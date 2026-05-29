import * as bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 10;

/**
 * Indique si la valeur stockée est déjà un hash bcrypt.
 * Les hashs bcrypt commencent par `$2a$`, `$2b$` ou `$2y$`.
 * Sert à distinguer un mot de passe déjà hashé d'un ancien mot de passe
 * stocké en clair (compatibilité avec l'historique avant la mise en place
 * du hashage).
 */
function isBcryptHash(stored: string | null | undefined): boolean {
  return !!stored && /^\$2[aby]\$/.test(stored);
}

/**
 * Hash d'un mot de passe en clair avec bcrypt (10 rounds).
 * Utilisé à l'inscription et lors de chaque changement de mot de passe.
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

/**
 * Vérifie un mot de passe en clair contre la valeur stockée en base.
 *
 * Compatible avec deux formats :
 *  - **bcrypt** : nouveaux comptes + tout mot de passe modifié depuis la
 *    mise en place du hashage → comparaison via `bcrypt.compare`.
 *  - **plaintext (historique)** : anciens comptes créés avant le hashage
 *    → comparaison directe.
 *
 * Cette compatibilité descendante permet de ne casser aucun login existant.
 * Un mot de passe « legacy » sera automatiquement re-hashé la prochaine
 * fois que l'utilisateur le changera.
 */
export async function verifyPassword(
  plain: string,
  stored: string | null | undefined,
): Promise<boolean> {
  if (!stored || !plain) return false;
  if (isBcryptHash(stored)) {
    return bcrypt.compare(plain, stored);
  }
  // Comparaison plaintext pour la compatibilité avec l'historique.
  return plain === stored;
}

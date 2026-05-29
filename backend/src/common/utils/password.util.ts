import * as bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 10;

/** True when the stored value is already a bcrypt hash (vs. legacy plaintext). */
function isBcryptHash(stored: string | null | undefined): boolean {
  return !!stored && /^\$2[aby]\$/.test(stored);
}

/** Hash a plaintext password for storage. */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

/**
 * Verify a plaintext password against the stored value.
 *
 * Supports both bcrypt hashes (new accounts and any password set/changed after
 * this was introduced) AND legacy plaintext (accounts created before hashing
 * existed), so no existing login breaks. Legacy plaintext is transparently
 * upgraded to a hash the next time the password is changed.
 */
export async function verifyPassword(
  plain: string,
  stored: string | null | undefined,
): Promise<boolean> {
  if (!stored || !plain) return false;
  if (isBcryptHash(stored)) {
    return bcrypt.compare(plain, stored);
  }
  // Legacy plaintext comparison.
  return plain === stored;
}

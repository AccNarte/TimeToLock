// Helpers to derive a deterministic encryption secret from a signature made
// with the user's reference (external) wallet. This lets wallet-login users —
// who have no account password — encrypt/decrypt their embedded wallet
// without a server-stored secret.

const KEY_DERIVATION_VERSION = 1;

/**
 * Build the message the user signs to derive their embedded-wallet secret.
 * Tied to user id + version so the signature is unique per account and we can
 * rotate it later by bumping the version.
 */
export function buildKeyDerivationMessage(userId: string | number): string {
  return [
    'TimeLock embedded wallet key derivation',
    `User: ${userId}`,
    `Version: ${KEY_DERIVATION_VERSION}`,
    '',
    'Sign this message to unlock or create your TimeLock embedded wallet.',
    'This signature stays in your wallet — TimeLock never sees it.',
  ].join('\n');
}

/**
 * Detect whether a user signed up via wallet (auto-generated email) or with
 * a real email/password pair.
 */
export function isWalletLoginUser(email: string | null | undefined): boolean {
  if (!email) return true;
  return email.includes('@timelock.local') || email.startsWith('wallet_');
}

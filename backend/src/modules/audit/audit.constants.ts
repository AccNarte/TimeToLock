/**
 * Canonical names stored in the `actions` / `entity_types` lookup tables.
 * Using constants avoids typos and keeps the values consistent across the app.
 * AuditService resolves these names to FK ids (creating the row if missing).
 */
export const AUDIT_ACTIONS = {
  USER_REGISTERED: 'USER_REGISTERED',
  USER_LOGIN: 'USER_LOGIN',
  WALLET_LOGIN: 'WALLET_LOGIN',
  USER_BANNED: 'USER_BANNED',
  USER_RESTORED: 'USER_RESTORED',
  ROLE_CHANGED: 'ROLE_CHANGED',
  EMAIL_CHANGED: 'EMAIL_CHANGED',
  PASSWORD_RESET: 'PASSWORD_RESET',
  USER_DELETED: 'USER_DELETED',
  CRYPTO_LOCK_CREATED: 'CRYPTO_LOCK_CREATED',
  CRYPTO_LOCK_WITHDRAWN: 'CRYPTO_LOCK_WITHDRAWN',
  FILE_LOCK_CREATED: 'FILE_LOCK_CREATED',
} as const;

export const AUDIT_ENTITIES = {
  USER: 'USER',
  CRYPTO_LOCK: 'CRYPTO_LOCK',
  FILE_LOCK: 'FILE_LOCK',
} as const;

export type AuditActionName = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
export type AuditEntityName = (typeof AUDIT_ENTITIES)[keyof typeof AUDIT_ENTITIES];

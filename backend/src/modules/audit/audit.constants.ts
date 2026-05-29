/**
 * Noms canoniques stockés dans les tables de référence `actions` et
 * `entity_types` (catalogues du module d'audit).
 *
 * L'utilisation de constantes évite les fautes de frappe (un `USER_LOGINN`
 * créerait silencieusement une nouvelle ligne dans `actions`) et garantit
 * la cohérence des libellés entre tous les producteurs d'événements
 * (auth, admin, locks…).
 *
 * `AuditService.log()` résout dynamiquement ces noms en identifiants de
 * FK (et crée la ligne du catalogue si elle n'existe pas encore).
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

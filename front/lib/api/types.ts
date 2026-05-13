// API Response types matching backend DTOs and entities

// Auth
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface WalletLoginRequest {
  address: string;
  signature: string;
  message: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

// User
export interface User {
  id: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
}

// Wallet
export type WalletType = 'external' | 'internal';

export interface Wallet {
  id: string;
  userId: string;
  type: WalletType;
  address: string;
  provider?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInternalWalletRequest {
  provider?: string;
}

export interface CreateWalletResponse {
  wallet: Wallet;
  mnemonic: string; // Only returned once when wallet is created
  message: string;
}

export interface LinkExternalWalletRequest {
  address: string;
  provider?: string;
}

// File Lock
export type FileLockStatus = 'locked' | 'unlockable' | 'unlocked';

export interface FileLock {
  id: string;
  userId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  unlockAt: string;
  unlockedAt?: string;
  status: FileLockStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFileLockRequest {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  ciphertext: string;
  iv: string;
  salt: string;
  authTag: string;
  hashChecksum: string;
  unlockAt: string;
}

// Crypto Lock
export type CryptoLockStatus = 'locked' | 'unlockable' | 'withdrawn';

export interface CryptoLock {
  id: string;
  userWalletId: string;
  chainName: string;
  chainId?: number;
  tokenSymbol: string;
  tokenDecimals?: number;
  tokenAddress?: string;
  lockContractAddress: string;
  amountWei: string;
  amountFormatted?: string;
  unlockAt: string;
  lockedTxHash?: string;
  withdrawTxHash?: string;
  status: CryptoLockStatus;
  createdAt: string;
  updatedAt: string;
  wallet?: Wallet;
}

export interface CreateCryptoLockRequest {
  walletId: string;
  chainName: string;
  tokenSymbol: string;
  tokenAddress?: string;
  lockContractAddress: string;
  amountWei: string;
  unlockAt: string;
}

// Audit Log
export interface AuditLog {
  id: string;
  userId: string;
  userWalletId?: string;
  entityType: string;
  entityId: string;
  action: string;
  metadataJson?: Record<string, unknown>;
  createdAt: string;
}

// API Error
export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}



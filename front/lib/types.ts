// Enums
export type LockStatus = "Locked" | "Unlockable" | "Unlocked";
export type WalletType = "Externe" | "Interne";
export type TokenType = "MATIC" | "USDC" | "ETH" | "BTC";
export type ContractStatus = "Active" | "Pending" | "Completed" | "Failed";

// Props types
export interface DashboardStatsProps {
  lockedDocuments: number;
  lockedFunds: number;
  connectedWallets: number;
  recentActions: RecentAction[];
}

export interface WalletItemProps {
  id: string;
  type: WalletType;
  address: string;
  createdAt: Date;
  status: string;
}

export interface FileItemProps {
  id: string;
  name: string;
  size: number;
  unlockDate: Date;
  status: LockStatus;
  downloadUrl?: string;
}

export interface CryptoLockProps {
  id: string;
  token: TokenType;
  amount: number;
  unlockDate: Date;
  contractStatus: ContractStatus;
  canWithdraw: boolean;
}

export interface RecentAction {
  id: string;
  type: 'file' | 'crypto' | 'wallet';
  description: string;
  timestamp: Date;
}
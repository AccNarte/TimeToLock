import apiClient from '../client';

export interface BlockchainFileLock {
  id: string;
  userId: number;
  walletId: number;
  title: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  ipfsHash: string;
  lockedTxHash: string;
  lockContractAddress: string;
  chainId: number;
  unlockAt: string;
  unlockedAt: string | null;
  status: 'LOCKED' | 'UNLOCKABLE' | 'UNLOCKED';
  createdAt: string;
  updatedAt: string;
  wallet?: {
    id: number;
    address: string;
    type: string;
  };
}

export interface CreateBlockchainFileLockRequest {
  walletId: number;
  title?: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  ipfsHash: string;
  txHash: string;
  lockContractAddress: string;
  chainId: number;
  unlockAt: string;
}

export interface BlockchainFileLockStats {
  total: number;
  locked: number;
  unlockable: number;
  unlocked: number;
  totalSizeBytes: number;
}

export const blockchainFilesService = {
  /**
   * Get all blockchain file locks for the current user
   */
  async getAll(): Promise<BlockchainFileLock[]> {
    const response = await apiClient.get<BlockchainFileLock[]>('/timelock-files-blockchain');
    return response.data;
  },

  /**
   * Get a specific blockchain file lock by ID
   */
  async getById(id: string): Promise<BlockchainFileLock> {
    const response = await apiClient.get<BlockchainFileLock>(`/timelock-files-blockchain/${id}`);
    return response.data;
  },

  /**
   * Create a new blockchain file lock record
   * Called after the frontend has created the lock on blockchain and uploaded to IPFS
   */
  async create(data: CreateBlockchainFileLockRequest): Promise<BlockchainFileLock> {
    const response = await apiClient.post<BlockchainFileLock>('/timelock-files-blockchain', data);
    return response.data;
  },

  /**
   * Get the IPFS gateway URL for downloading the encrypted file
   * Only returns if the file is unlockable (unlock time has passed)
   */
  async getIpfsUrl(id: string): Promise<{ url: string }> {
    const response = await apiClient.get<{ url: string }>(`/timelock-files-blockchain/${id}/ipfs-url`);
    return response.data;
  },

  /**
   * Mark a file lock as unlocked
   * Called after the user has successfully retrieved the key from the blockchain
   */
  async markAsUnlocked(id: string): Promise<BlockchainFileLock> {
    const response = await apiClient.post<BlockchainFileLock>(`/timelock-files-blockchain/${id}/unlock`);
    return response.data;
  },

  /**
   * Sync the status of a file lock based on blockchain time
   */
  async syncStatus(id: string): Promise<BlockchainFileLock> {
    const response = await apiClient.post<BlockchainFileLock>(`/timelock-files-blockchain/${id}/sync`);
    return response.data;
  },

  /**
   * Get statistics for the current user's file locks
   */
  async getStats(): Promise<BlockchainFileLockStats> {
    const response = await apiClient.get<BlockchainFileLockStats>('/timelock-files-blockchain/stats');
    return response.data;
  },

  /**
   * Permanently destroy a file lock: unpins from IPFS (so even admins
   * can no longer recover the file) and deletes the DB row.
   * Returns `{ unpinned: false }` if Pinata refused — the file may still
   * linger on Pinata until manual cleanup, though the DB row is gone.
   */
  async delete(id: string): Promise<{ unpinned: boolean }> {
    const response = await apiClient.delete<{ unpinned: boolean }>(
      `/timelock-files-blockchain/${id}`,
    );
    return response.data;
  },
};

import { apiClient } from './client';

export interface SaveLockFromFrontendDto {
  walletId: number;
  tokenContractId: number;
  amountWei: string;
  unlockAt: string;
  txHash: string;
  lockContractAddress: string;
  chainId: number;
}

export interface MarkWithdrawnDto {
  txHash: string;
  chainId: number;
}

export const cryptoLocksService = {
  /**
   * Save a lock created from the frontend
   */
  async saveLockFromFrontend(data: SaveLockFromFrontendDto) {
    const response = await apiClient.post('/timelock-crypto/save-from-frontend', data);
    return response.data;
  },

  /**
   * Get all locks for the current user
   */
  async getAllLocks() {
    const response = await apiClient.get('/timelock-crypto');
    return response.data;
  },

  /**
   * Get a specific lock by ID
   */
  async getLockById(id: number) {
    const response = await apiClient.get(`/timelock-crypto/${id}`);
    return response.data;
  },

  /**
   * Sync lock status from blockchain
   */
  async syncLockStatus(id: number, chainId: number) {
    const response = await apiClient.post(`/timelock-crypto/${id}/sync`, { chainId });
    return response.data;
  },

  /**
   * Mark a lock as withdrawn after successful blockchain transaction
   */
  async markAsWithdrawn(id: number, data: MarkWithdrawnDto) {
    const response = await apiClient.post(`/timelock-crypto/${id}/withdraw`, data);
    return response.data;
  },
};

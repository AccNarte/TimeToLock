import apiClient from '../client';
import { CryptoLock, CreateCryptoLockRequest } from '../types';

export const cryptoService = {
  async getAll(): Promise<CryptoLock[]> {
    const response = await apiClient.get<CryptoLock[]>('/timelock-crypto');
    return response.data;
  },

  async getById(id: string): Promise<CryptoLock> {
    const response = await apiClient.get<CryptoLock>(`/timelock-crypto/${id}`);
    return response.data;
  },

  async lock(data: CreateCryptoLockRequest): Promise<CryptoLock> {
    const response = await apiClient.post<CryptoLock>('/timelock-crypto/lock', data);
    return response.data;
  },
};



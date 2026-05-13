import apiClient from '../client';
import { FileLock, CreateFileLockRequest } from '../types';

export interface EncryptedFileData {
  ciphertext: string;
  iv: string;
  salt: string;
  authTag: string;
  hashChecksum: string;
  filename: string;
  mimeType: string;
}

export const filesService = {
  async getAll(): Promise<FileLock[]> {
    const response = await apiClient.get<FileLock[]>('/timelock-files');
    return response.data;
  },

  async getById(id: string): Promise<FileLock> {
    const response = await apiClient.get<FileLock>(`/timelock-files/${id}`);
    return response.data;
  },

  async create(data: CreateFileLockRequest): Promise<FileLock> {
    const response = await apiClient.post<FileLock>('/timelock-files/create', data);
    return response.data;
  },

  /**
   * Get encrypted file data for decryption
   */
  async getEncryptedData(id: string): Promise<EncryptedFileData> {
    const response = await apiClient.get<EncryptedFileData>(`/timelock-files/${id}/decrypt`);
    return response.data;
  },

  /**
   * Mark file as unlocked after decryption
   */
  async markUnlocked(id: string): Promise<FileLock> {
    const response = await apiClient.post<FileLock>(`/timelock-files/${id}/unlock`);
    return response.data;
  },
};



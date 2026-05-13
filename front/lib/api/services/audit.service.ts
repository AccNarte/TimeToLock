import apiClient from '../client';
import { AuditLog } from '../types';

export const auditService = {
  async getAll(): Promise<AuditLog[]> {
    const response = await apiClient.get<AuditLog[]>('/audit');
    return response.data;
  },
};



import apiClient from '../client';

export interface AdminStats {
  users: {
    total: number;
    active: number;
    banned: number;
    passwordAuth: number;
    walletAuth: number;
    passwordAuthPercent: number;
    walletAuthPercent: number;
    verifiedEmail: number;
    newThisWeek: number;
    newThisMonth: number;
  };
  cryptoLocks: {
    total: number;
    locked: number;
    unlockable: number;
    withdrawn: number;
  };
  fileLocks: {
    total: number;
    locked: number;
    unlockable: number;
    unlocked: number;
    totalSizeBytes: number;
  };
  filesClassic: {
    total: number;
    locked: number;
    unlockable: number;
    unlocked: number;
  };
  wallets: {
    total: number;
    internal: number;
    external: number;
  };
}

export interface UserListItem {
  id: number;
  email: string | null;
  loginMethod: string;
  isEmailVerified: boolean;
  status: 'active' | 'banned';
  bannedAt: string | null;
  roleName: string | null;
  walletsCount: number;
  cryptoLocksCount: number;
  fileLocksCount: number;
  createdAt: string;
}

export interface PaginatedUsers {
  items: UserListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListUsersParams {
  page?: number;
  limit?: number;
  q?: string;
  role?: string;
  status?: 'active' | 'banned' | 'all';
  auth?: 'wallet' | 'password' | 'all';
  verified?: 'true' | 'false' | 'all';
  sort?: 'id' | 'email' | 'createdAt' | 'status';
  order?: 'ASC' | 'DESC';
}

export interface Role {
  id: number;
  name: string;
  description: string | null;
}

export interface AuditLogItem {
  id: number;
  action: string | null;
  entityType: string | null;
  entityId: number;
  userId: number | null;
  userEmail: string | null;
  userWalletId: number | null;
  walletAddress: string | null;
  metadataJson: Record<string, any> | null;
  createdAt: string;
}

export interface PaginatedAudit {
  items: AuditLogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListAuditParams {
  page?: number;
  limit?: number;
  action?: string;
  entityType?: string;
  userId?: number;
  order?: 'ASC' | 'DESC';
}

export const adminService = {
  async checkAccess(): Promise<{ isAdmin: boolean }> {
    try {
      const response = await apiClient.get<{ isAdmin: boolean }>('/admin/check-access');
      return response.data;
    } catch {
      return { isAdmin: false };
    }
  },

  async getStats(): Promise<AdminStats> {
    const response = await apiClient.get<AdminStats>('/admin/stats');
    return response.data;
  },

  async getUsers(params: ListUsersParams = {}): Promise<PaginatedUsers> {
    const response = await apiClient.get<PaginatedUsers>('/admin/users', { params });
    return response.data;
  },

  async banUser(
    userId: number,
    reason: string | undefined,
    challenge: { password?: string; signature?: string; message?: string },
  ): Promise<UserListItem> {
    const response = await apiClient.post<UserListItem>(`/admin/users/${userId}/ban`, {
      reason,
      ...challenge,
    });
    return response.data;
  },

  async restoreUser(userId: number): Promise<UserListItem> {
    const response = await apiClient.post<UserListItem>(`/admin/users/${userId}/restore`);
    return response.data;
  },

  /** Download the filtered user set as a CSV file (triggers a browser save). */
  async exportUsersCsv(params: ListUsersParams = {}): Promise<void> {
    const response = await apiClient.get('/admin/users/export', {
      params,
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  async getUserDetails(userId: number): Promise<any> {
    const response = await apiClient.get(`/admin/users/${userId}`);
    return response.data;
  },

  async setUserRole(
    userId: number,
    roleName: string,
    challenge: { password?: string; signature?: string; message?: string },
  ): Promise<any> {
    const response = await apiClient.put(`/admin/users/${userId}/role`, {
      roleName,
      ...challenge,
    });
    return response.data;
  },

  async getChallengeMethod(): Promise<{
    method: 'wallet' | 'password';
    walletAddress: string | null;
  }> {
    const response = await apiClient.get<{
      method: 'wallet' | 'password';
      walletAddress: string | null;
    }>('/admin/challenge-method');
    return response.data;
  },

  async deleteUser(
    userId: number,
    challenge: { password?: string; signature?: string; message?: string },
  ): Promise<{ deleted: true }> {
    const response = await apiClient.delete<{ deleted: true }>(`/admin/users/${userId}`, {
      data: challenge,
    });
    return response.data;
  },

  async setUserEmail(userId: number, email: string): Promise<any> {
    const response = await apiClient.put(`/admin/users/${userId}/email`, { email });
    return response.data;
  },

  async setUserPassword(
    userId: number,
    newPassword: string,
    challenge: { password?: string; signature?: string; message?: string },
  ): Promise<{ success: boolean }> {
    const response = await apiClient.put<{ success: boolean }>(
      `/admin/users/${userId}/password`,
      { newPassword, ...challenge },
    );
    return response.data;
  },

  async getRoles(): Promise<Role[]> {
    const response = await apiClient.get<Role[]>('/admin/roles');
    return response.data;
  },

  async getAuditLogs(params: ListAuditParams = {}): Promise<PaginatedAudit> {
    const response = await apiClient.get<PaginatedAudit>('/admin/audit', { params });
    return response.data;
  },
};

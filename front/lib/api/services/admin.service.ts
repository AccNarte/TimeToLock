import apiClient from '../client';

export interface AdminStats {
  users: {
    total: number;
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
  roleName: string | null;
  walletsCount: number;
  cryptoLocksCount: number;
  fileLocksCount: number;
  createdAt: string;
}

export interface Role {
  id: number;
  name: string;
  description: string | null;
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

  async getUsers(): Promise<UserListItem[]> {
    const response = await apiClient.get<UserListItem[]>('/admin/users');
    return response.data;
  },

  async getUserDetails(userId: number): Promise<any> {
    const response = await apiClient.get(`/admin/users/${userId}`);
    return response.data;
  },

  async setUserRole(userId: number, roleName: string): Promise<any> {
    const response = await apiClient.put(`/admin/users/${userId}/role`, { roleName });
    return response.data;
  },

  async getRoles(): Promise<Role[]> {
    const response = await apiClient.get<Role[]>('/admin/roles');
    return response.data;
  },
};

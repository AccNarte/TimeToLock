"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  adminService,
  AdminStats,
  UserListItem,
  Role,
  ListUsersParams,
  AuditLogItem,
  ListAuditParams,
} from '@/lib/api/services/admin.service';

export function useAdminAccess() {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const result = await adminService.checkAccess();
        setIsAdmin(result.isAdmin);
      } catch {
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkAccess();
  }, []);

  return { isAdmin, isLoading };
}

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await adminService.getStats();
      setStats(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des statistiques');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, isLoading, error, refetch: fetchStats };
}

const DEFAULT_PARAMS: ListUsersParams = {
  page: 1,
  limit: 10,
  q: '',
  role: '',
  status: 'all',
  auth: 'all',
  verified: 'all',
  sort: 'createdAt',
  order: 'DESC',
};

export function useAdminUsers() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [params, setParamsState] = useState<ListUsersParams>(DEFAULT_PARAMS);

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Strip empty strings so we don't send blank role/q filters.
      const clean: ListUsersParams = { ...params };
      if (!clean.q) delete clean.q;
      if (!clean.role) delete clean.role;
      const data = await adminService.getUsers(clean);
      setUsers(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des utilisateurs');
    } finally {
      setIsLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  /** Merge new params; any change other than `page` resets back to page 1. */
  const setParams = useCallback((patch: Partial<ListUsersParams>) => {
    setParamsState((prev) => {
      const next = { ...prev, ...patch };
      if (!('page' in patch)) next.page = 1;
      return next;
    });
  }, []);

  const setUserRole = async (
    userId: number,
    roleName: string,
    challenge: { password?: string; signature?: string; message?: string },
  ) => {
    try {
      await adminService.setUserRole(userId, roleName, challenge);
      await fetchUsers();
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Erreur lors de la modification du role');
    }
  };

  const setUserEmail = async (userId: number, email: string) => {
    try {
      await adminService.setUserEmail(userId, email);
      await fetchUsers();
    } catch (err: any) {
      throw new Error(err.response?.data?.message || "Erreur lors de la modification de l'email");
    }
  };

  const deleteUser = async (
    userId: number,
    challenge: { password?: string; signature?: string; message?: string },
  ) => {
    try {
      await adminService.deleteUser(userId, challenge);
      await fetchUsers();
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const setUserPassword = async (
    userId: number,
    newPassword: string,
    challenge: { password?: string; signature?: string; message?: string },
  ) => {
    try {
      await adminService.setUserPassword(userId, newPassword, challenge);
    } catch (err: any) {
      throw new Error(
        err.response?.data?.message || 'Erreur lors du changement de mot de passe',
      );
    }
  };

  const banUser = async (
    userId: number,
    reason: string | undefined,
    challenge: { password?: string; signature?: string; message?: string },
  ) => {
    try {
      await adminService.banUser(userId, reason, challenge);
      await fetchUsers();
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Erreur lors du bannissement');
    }
  };

  const restoreUser = async (userId: number) => {
    try {
      await adminService.restoreUser(userId);
      await fetchUsers();
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Erreur lors de la restauration');
    }
  };

  const exportCsv = async () => {
    const clean: ListUsersParams = { ...params };
    delete clean.page;
    delete clean.limit;
    if (!clean.q) delete clean.q;
    if (!clean.role) delete clean.role;
    await adminService.exportUsersCsv(clean);
  };

  return {
    users,
    total,
    totalPages,
    isLoading,
    error,
    params,
    setParams,
    refetch: fetchUsers,
    setUserRole,
    setUserEmail,
    setUserPassword,
    deleteUser,
    banUser,
    restoreUser,
    exportCsv,
  };
}

const DEFAULT_AUDIT_PARAMS: ListAuditParams = {
  page: 1,
  limit: 15,
  action: '',
  entityType: '',
  order: 'DESC',
};

export function useAdminAudit() {
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [params, setParamsState] = useState<ListAuditParams>(DEFAULT_AUDIT_PARAMS);

  const fetchLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      const clean: ListAuditParams = { ...params };
      if (!clean.action) delete clean.action;
      if (!clean.entityType) delete clean.entityType;
      const data = await adminService.getAuditLogs(clean);
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      /* silencieux — l'audit est secondaire */
    } finally {
      setIsLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const setParams = useCallback((patch: Partial<ListAuditParams>) => {
    setParamsState((prev) => {
      const next = { ...prev, ...patch };
      if (!('page' in patch)) next.page = 1;
      return next;
    });
  }, []);

  return { items, total, totalPages, isLoading, params, setParams, refetch: fetchLogs };
}

export function useAdminRoles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const data = await adminService.getRoles();
        setRoles(data);
      } catch {
        // Ignore error
      } finally {
        setIsLoading(false);
      }
    };
    fetchRoles();
  }, []);

  return { roles, isLoading };
}

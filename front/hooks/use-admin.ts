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

/**
 * Hook léger qui vérifie si l'utilisateur courant a accès au panel
 * admin. Utilisé par la sidebar (pour afficher/cacher le menu admin)
 * et par la page admin elle-même (redirection si non admin).
 */
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

/** Hook de chargement des statistiques globales du panel admin. */
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

/** Paramètres par défaut du listing utilisateurs (page 1, 10 par page, tri création desc). */
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

/**
 * Hook orchestrant le CRUD avancé sur les utilisateurs côté admin.
 *
 * Gère :
 *  - l'état des paramètres de recherche/filtrage/tri/pagination,
 *  - le rechargement automatique de la liste quand les params changent,
 *  - les actions de mutation (rôle, email, mdp, ban, restore, delete),
 *  - l'export CSV.
 */
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
      // On enlève les filtres vides pour ne pas polluer la query string.
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

  /**
   * Merge des nouveaux paramètres. Tout changement autre que `page`
   * remet le numéro de page à 1 (sinon on resterait sur une page qui
   * peut ne plus exister après filtrage).
   */
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

  /**
   * Lance le téléchargement CSV. On reprend les filtres courants (mais
   * on enlève `page`/`limit` : l'export retourne *toutes* les lignes
   * correspondantes).
   */
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

/** Paramètres par défaut du journal d'audit (page 1, 15 par page, DESC). */
const DEFAULT_AUDIT_PARAMS: ListAuditParams = {
  page: 1,
  limit: 15,
  action: '',
  entityType: '',
  order: 'DESC',
};

/**
 * Hook de consultation du journal d'audit côté admin.
 * Même pattern que `useAdminUsers` : état des params, rechargement
 * automatique sur changement, setter qui réinitialise la pagination
 * quand un filtre change.
 */
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
      /* silencieux — l'audit est secondaire, on ne casse pas la page admin */
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

/** Hook léger qui charge la liste des rôles (pour le select du panel admin). */
export function useAdminRoles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const data = await adminService.getRoles();
        setRoles(data);
      } catch {
        // On ignore l'erreur : si les rôles ne chargent pas, le panel
        // affiche juste le placeholder, pas de raison de casser la page.
      } finally {
        setIsLoading(false);
      }
    };
    fetchRoles();
  }, []);

  return { roles, isLoading };
}

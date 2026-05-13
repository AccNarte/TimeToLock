"use client";

import { useState, useEffect, useCallback } from 'react';
import { adminService, AdminStats, UserListItem, Role } from '@/lib/api/services/admin.service';

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

export function useAdminUsers() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await adminService.getUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des utilisateurs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const setUserRole = async (userId: number, roleName: string) => {
    try {
      await adminService.setUserRole(userId, roleName);
      await fetchUsers();
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Erreur lors de la modification du role');
    }
  };

  return { users, isLoading, error, refetch: fetchUsers, setUserRole };
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

"use client";

import { useQuery } from '@tanstack/react-query';
import { auditService, AuditLog } from '@/lib/api';

const AUDIT_QUERY_KEY = ['audit'];

export function useAudit() {
  const { data: logs = [], isLoading, error } = useQuery({
    queryKey: AUDIT_QUERY_KEY,
    queryFn: () => auditService.getAll(),
    staleTime: 1 * 60 * 1000, // 1 minute - audit logs change more frequently
  });

  return {
    logs,
    isLoading,
    error: error ? 'Erreur lors du chargement des logs d\'audit' : null,
  };
}

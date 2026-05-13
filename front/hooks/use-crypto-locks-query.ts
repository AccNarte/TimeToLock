"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cryptoService, CryptoLock, CreateCryptoLockRequest } from '@/lib/api';

const CRYPTO_LOCKS_QUERY_KEY = ['crypto-locks'];

export function useCryptoLocks() {
  const queryClient = useQueryClient();

  const { data: locks = [], isLoading, error } = useQuery({
    queryKey: CRYPTO_LOCKS_QUERY_KEY,
    queryFn: () => cryptoService.getAll(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const createLockMutation = useMutation({
    mutationFn: (data: CreateCryptoLockRequest) => cryptoService.lock(data),
    onSuccess: (lock) => {
      queryClient.setQueryData<CryptoLock[]>(CRYPTO_LOCKS_QUERY_KEY, (old = []) => [...old, lock]);
    },
  });

  const getLock = async (id: string) => {
    return await cryptoService.getById(id);
  };

  return {
    locks,
    isLoading,
    error: error ? 'Erreur lors du chargement des verrous crypto' : null,
    refetch: () => queryClient.invalidateQueries({ queryKey: CRYPTO_LOCKS_QUERY_KEY }),
    createLock: createLockMutation.mutateAsync,
    getLock,
  };
}

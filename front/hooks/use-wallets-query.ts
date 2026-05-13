"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { walletsService, Wallet, CreateInternalWalletRequest, LinkExternalWalletRequest } from '@/lib/api';

const WALLETS_QUERY_KEY = ['wallets'];

export function useWallets() {
  const queryClient = useQueryClient();

  const { data: wallets = [], isLoading, error } = useQuery({
    queryKey: WALLETS_QUERY_KEY,
    queryFn: () => walletsService.getAll(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const createInternalMutation = useMutation({
    mutationFn: (data: CreateInternalWalletRequest) => walletsService.createInternal(data),
    onSuccess: (response) => {
      queryClient.setQueryData<Wallet[]>(WALLETS_QUERY_KEY, (old = []) => [...old, response.wallet]);
    },
  });

  const linkExternalMutation = useMutation({
    mutationFn: (data: LinkExternalWalletRequest) => walletsService.linkExternal(data),
    onSuccess: (wallet) => {
      queryClient.setQueryData<Wallet[]>(WALLETS_QUERY_KEY, (old = []) => [...old, wallet]);
    },
  });

  return {
    wallets,
    isLoading,
    error: error ? 'Erreur lors du chargement des wallets' : null,
    refetch: () => queryClient.invalidateQueries({ queryKey: WALLETS_QUERY_KEY }),
    createInternal: createInternalMutation.mutateAsync,
    linkExternal: linkExternalMutation.mutateAsync,
  };
}

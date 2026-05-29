"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { walletsService, Wallet, CreateInternalWalletRequest, LinkExternalWalletRequest } from '@/lib/api';
import { generateEncryptedWallet } from '@/lib/embedded-wallet';

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

  // Embedded flow: encrypt client-side with a caller-provided secret (account
  // password OR a signature from the user's reference wallet — see
  // `buildKeyDerivationMessage`). Backend never sees the plaintext key.
  const createEmbeddedMutation = useMutation({
    mutationFn: async (secret: string) => {
      const { walletData, mnemonic } = await generateEncryptedWallet(secret);
      const response = await walletsService.createEmbedded(walletData);
      return { wallet: response.wallet, mnemonic };
    },
    onSuccess: ({ wallet }) => {
      queryClient.setQueryData<Wallet[]>(WALLETS_QUERY_KEY, (old = []) => [...old, wallet]);
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
    createEmbedded: createEmbeddedMutation.mutateAsync,
    linkExternal: linkExternalMutation.mutateAsync,
  };
}

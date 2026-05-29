'use client';

import { useQuery } from '@tanstack/react-query';
import { factoryService, FactoryContractType } from '@/lib/api/services/factory.service';

/**
 * Fetches the active factory address for a given chain from the backend
 * (which reads from the `factory_deployments` table, populated by the deploy
 * page). Cached for 5 minutes — factories are deployed once and don't churn.
 *
 * Returns `undefined` while loading; `null` if no factory is registered yet.
 */
export function useFactoryAddress(
  chainId: number,
  contractType: FactoryContractType = 'crypto_timelock',
) {
  const query = useQuery({
    queryKey: ['factory-address', chainId, contractType],
    queryFn: () => factoryService.getCurrent(chainId, contractType),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return {
    address: (query.data?.address ?? null) as `0x${string}` | null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

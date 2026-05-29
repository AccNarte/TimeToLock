import apiClient from '../client';

export type FactoryContractType = 'crypto_timelock' | 'file_lock';

export interface FactoryDeployment {
  id: number;
  chainId: number;
  contractType: FactoryContractType;
  address: string;
  txHash: string | null;
  deployedByUserId: number | null;
  isActive: boolean;
  createdAt: string;
}

export interface CurrentFactoryResponse {
  chainId: number;
  contractType: FactoryContractType;
  address: string | null;
}

export interface RegisterFactoryRequest {
  chainId: number;
  contractType?: FactoryContractType;
  address: string;
  txHash?: string;
}

export const factoryService = {
  async getCurrent(
    chainId: number,
    contractType: FactoryContractType = 'crypto_timelock',
  ): Promise<CurrentFactoryResponse> {
    const response = await apiClient.get<CurrentFactoryResponse>('/factory/current', {
      params: { chainId, contractType },
    });
    return response.data;
  },

  async register(data: RegisterFactoryRequest): Promise<FactoryDeployment> {
    const response = await apiClient.post<FactoryDeployment>('/factory', data);
    return response.data;
  },

  async list(): Promise<FactoryDeployment[]> {
    const response = await apiClient.get<FactoryDeployment[]>('/factory');
    return response.data;
  },
};

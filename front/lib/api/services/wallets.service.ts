import apiClient from '../client';
import {
  Wallet,
  CreateInternalWalletRequest,
  LinkExternalWalletRequest,
  CreateWalletResponse,
} from '../types';

export interface CreateEmbeddedWalletRequest {
  address: string;
  encryptedPrivateKey: string;
  encryptedMnemonic: string;
  salt: string;
}

export interface EmbeddedWalletData {
  encryptedPrivateKey: string;
  encryptedMnemonic: string;
  salt: string;
}

export const walletsService = {
  async getAll(): Promise<Wallet[]> {
    const response = await apiClient.get<Wallet[]>('/wallets');
    return response.data;
  },

  async createInternal(data: CreateInternalWalletRequest): Promise<CreateWalletResponse> {
    const response = await apiClient.post<CreateWalletResponse>('/wallets/create-internal', data);
    return response.data;
  },

  async linkExternal(data: LinkExternalWalletRequest): Promise<Wallet> {
    const response = await apiClient.post<Wallet>('/wallets/link-external', data);
    return response.data;
  },

  /**
   * Create an embedded wallet with client-side encrypted data
   */
  async createEmbedded(data: CreateEmbeddedWalletRequest): Promise<{ wallet: Wallet; message: string }> {
    const response = await apiClient.post<{ wallet: Wallet; message: string }>('/wallets/create-embedded', data);
    return response.data;
  },

  /**
   * Get encrypted wallet data for decryption
   */
  async getEncryptedData(walletId: number): Promise<EmbeddedWalletData> {
    const response = await apiClient.get<EmbeddedWalletData>(`/wallets/${walletId}/encrypted-data`);
    return response.data;
  },

  /**
   * Check if user has an embedded wallet
   */
  async hasEmbedded(): Promise<boolean> {
    const response = await apiClient.get<{ hasEmbedded: boolean }>('/wallets/has-embedded');
    return response.data.hasEmbedded;
  },
};



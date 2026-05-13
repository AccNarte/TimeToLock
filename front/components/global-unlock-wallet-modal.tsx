"use client";

import { useState } from 'react';
import { useEmbeddedWallet } from '@/contexts/embedded-wallet-context';
import { UnlockWalletModal } from './unlock-wallet-modal';

export function GlobalUnlockWalletModal() {
  const {
    isPasswordModalOpen,
    pendingWalletAddress,
    onPasswordSubmit,
    onPasswordCancel,
  } = useEmbeddedWallet();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await onPasswordSubmit(password);
      // Success - modal will close automatically
    } catch (err: any) {
      setError(err.message || 'Mot de passe incorrect');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setError(null);
    setIsLoading(false);
    onPasswordCancel();
  };

  return (
    <UnlockWalletModal
      isOpen={isPasswordModalOpen}
      walletAddress={pendingWalletAddress}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      isLoading={isLoading}
      error={error}
    />
  );
}

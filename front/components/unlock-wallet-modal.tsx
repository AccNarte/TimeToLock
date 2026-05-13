"use client";

import { useState } from 'react';
import { Lock, Loader2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface UnlockWalletModalProps {
  isOpen: boolean;
  walletAddress: string | null;
  onSubmit: (password: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export function UnlockWalletModal({
  isOpen,
  walletAddress,
  onSubmit,
  onCancel,
  isLoading = false,
  error = null,
}: UnlockWalletModalProps) {
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!password) {
      setLocalError('Veuillez entrer votre mot de passe');
      return;
    }

    onSubmit(password);
  };

  const handleClose = () => {
    setPassword('');
    setLocalError(null);
    onCancel();
  };

  const displayError = error || localError;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md bg-dark-blue-lighter border-glass-border">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-cyan-neon/10 border border-cyan-neon/30 flex items-center justify-center">
              <Lock className="w-7 h-7 text-cyan-neon" />
            </div>
          </div>
          <DialogTitle className="text-xl text-white text-center">
            Déverrouiller votre wallet
          </DialogTitle>
          <DialogDescription className="text-text-secondary text-center">
            Entrez votre mot de passe pour signer la transaction
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Wallet address */}
          {walletAddress && (
            <div className="p-3 rounded-lg bg-glass-surface border border-glass-border">
              <p className="text-xs text-text-muted mb-1">Wallet</p>
              <p className="text-sm text-cyan-neon font-mono">
                {walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}
              </p>
            </div>
          )}

          {displayError && (
            <div className="p-3 rounded-lg bg-error/20 border border-error/30 flex gap-2 items-center">
              <AlertTriangle className="w-4 h-4 text-error flex-shrink-0" />
              <p className="text-sm text-error">{displayError}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="unlock-password" className="text-text-secondary">
              Mot de passe
            </Label>
            <Input
              id="unlock-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              autoFocus
              className="bg-dark-blue border-glass-border text-white placeholder:text-text-muted"
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 border-glass-border text-text-secondary hover:text-white"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !password}
              className="flex-1 glass-button"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Déverrouillage...
                </>
              ) : (
                'Déverrouiller'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

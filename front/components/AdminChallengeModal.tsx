'use client';

import { useEffect, useState } from 'react';
import { useSignMessage } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { Loader2, ShieldAlert, Wallet as WalletIcon, KeyRound } from 'lucide-react';
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
import { adminService } from '@/lib/api/services/admin.service';

export interface AdminChallenge {
  password?: string;
  signature?: string;
  message?: string;
}

interface AdminChallengeModalProps {
  open: boolean;
  /** Human-readable description of what the admin is about to do. */
  actionLabel: string;
  /** Stable identifier (e.g. "role-change-7-admin") used inside the signed message for traceability. */
  actionContext: string;
  /** Optional extra UI (e.g. a reason field) shown above the auth challenge. */
  extraContent?: React.ReactNode;
  onCancel: () => void;
  onConfirm: (challenge: AdminChallenge) => Promise<void>;
}

export function AdminChallengeModal({
  open,
  actionLabel,
  actionContext,
  extraContent,
  onCancel,
  onConfirm,
}: AdminChallengeModalProps) {
  const [authMethod, setAuthMethod] = useState<'wallet' | 'password' | null>(null);
  const [expectedAddress, setExpectedAddress] = useState<string | null>(null);
  const [methodLoading, setMethodLoading] = useState(false);
  const [methodError, setMethodError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { signMessageAsync } = useSignMessage();
  const { address: connectedAddress, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  // Fetch the acting admin's auth method when the modal opens.
  useEffect(() => {
    if (!open) return;
    setAuthMethod(null);
    setExpectedAddress(null);
    setMethodError(null);
    setPassword('');
    setSubmitError(null);
    setMethodLoading(true);

    adminService
      .getChallengeMethod()
      .then((res) => {
        setAuthMethod(res.method);
        setExpectedAddress(res.walletAddress);
      })
      .catch((err: any) => {
        setMethodError(err?.response?.data?.message || err?.message || 'Erreur inconnue');
      })
      .finally(() => setMethodLoading(false));
  }, [open]);

  const handleClose = () => {
    if (isSubmitting) return;
    onCancel();
  };

  const submitWithChallenge = async (challenge: AdminChallenge) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onConfirm(challenge);
    } catch (err: any) {
      setSubmitError(err?.message || 'Erreur lors de la confirmation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    await submitWithChallenge({ password });
  };

  const handleSignSubmit = async () => {
    if (!isConnected || !connectedAddress) {
      openConnectModal?.();
      setSubmitError('Connecte d\'abord ton wallet de référence.');
      return;
    }
    if (
      expectedAddress &&
      connectedAddress.toLowerCase() !== expectedAddress.toLowerCase()
    ) {
      setSubmitError(
        `Le wallet connecté ne correspond pas à ton wallet admin (${expectedAddress.slice(0, 6)}...${expectedAddress.slice(-4)}).`,
      );
      return;
    }

    const message = [
      'TimeLock admin action',
      `Action: ${actionContext}`,
      `Timestamp: ${Date.now()}`,
    ].join('\n');

    try {
      const signature = await signMessageAsync({ message });
      await submitWithChallenge({ signature, message });
    } catch (err: any) {
      setSubmitError(err?.shortMessage || err?.message || 'Signature refusée');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md bg-dark-blue-lighter border-warning/40">
        <DialogHeader>
          <DialogTitle className="text-xl text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-warning" />
            Confirmation requise
          </DialogTitle>
          <DialogDescription className="text-text-secondary">
            {actionLabel}
          </DialogDescription>
        </DialogHeader>

        {extraContent && <div className="mt-1">{extraContent}</div>}

        {methodLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-cyan-neon animate-spin" />
          </div>
        ) : methodError ? (
          <div className="p-3 rounded-lg bg-error/20 border border-error/30 text-error text-sm">
            {methodError}
          </div>
        ) : authMethod === 'password' ? (
          <form onSubmit={handlePasswordSubmit} className="space-y-4 mt-2">
            <div className="p-3 rounded-lg bg-glass-surface border border-glass-border text-sm text-text-secondary">
              <p className="flex items-center gap-2 text-white font-medium mb-1">
                <KeyRound className="w-4 h-4 text-cyan-neon" />
                Mot de passe de ton compte admin
              </p>
              <p className="text-xs">
                Pour vérifier que c'est bien toi, retape ton mot de passe.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-challenge-password" className="text-text-secondary">
                Mot de passe
              </Label>
              <Input
                id="admin-challenge-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                disabled={isSubmitting}
                className="bg-dark-blue border-glass-border text-white"
                placeholder="••••••••"
              />
            </div>

            {submitError && (
              <div className="p-3 rounded-lg bg-error/20 border border-error/30 text-error text-sm">
                {submitError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1 border-glass-border text-text-secondary hover:text-white"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !password}
                className="flex-1 glass-button"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Vérification...
                  </>
                ) : (
                  'Confirmer'
                )}
              </Button>
            </div>
          </form>
        ) : authMethod === 'wallet' ? (
          <div className="space-y-4 mt-2">
            <div className="p-3 rounded-lg bg-glass-surface border border-glass-border text-sm text-text-secondary">
              <p className="flex items-center gap-2 text-white font-medium mb-1">
                <WalletIcon className="w-4 h-4 text-cyan-neon" />
                Signature avec ton wallet admin
              </p>
              <p className="text-xs">
                Sign un court message avec ton wallet de référence pour valider cette action.
                Aucune transaction n'est envoyée on-chain — c'est gratuit.
              </p>
              {expectedAddress && (
                <p className="text-xs text-text-muted mt-2 font-mono">
                  Wallet attendu : {expectedAddress.slice(0, 8)}...{expectedAddress.slice(-6)}
                </p>
              )}
            </div>

            {submitError && (
              <div className="p-3 rounded-lg bg-error/20 border border-error/30 text-error text-sm">
                {submitError}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1 border-glass-border text-text-secondary hover:text-white"
              >
                Annuler
              </Button>
              <Button
                type="button"
                onClick={handleSignSubmit}
                disabled={isSubmitting}
                className="flex-1 glass-button"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signature...
                  </>
                ) : (
                  <>
                    <WalletIcon className="w-4 h-4 mr-2" />
                    Signer
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

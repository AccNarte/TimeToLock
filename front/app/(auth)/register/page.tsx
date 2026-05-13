"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Clock, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { MnemonicModal } from '@/components/mnemonic-modal';
import { generateEncryptedWallet } from '@/lib/embedded-wallet';
import { walletsService } from '@/lib/api/services/wallets.service';
import dynamic from 'next/dynamic';

// Dynamically import MetaMaskButton to avoid SSR issues with wagmi hooks
const MetaMaskButton = dynamic(
  () => import('./MetaMaskButton').then((mod) => mod.MetaMaskButton),
  {
    ssr: false,
    loading: () => (
      <Button
        type="button"
        disabled
        className="w-full h-14 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-lg mb-6 shadow-lg hover:shadow-xl transition-all duration-300"
      >
        <Loader2 className="w-6 h-6 mr-3 animate-spin" />
        Chargement...
      </Button>
    ),
  }
);

export default function RegisterPage() {
  const { register, isLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [showMnemonicModal, setShowMnemonicModal] = useState(false);
  const [walletData, setWalletData] = useState<{
    mnemonic: string;
    address: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    try {
      // 1. Register the user (don't redirect yet - we need to show mnemonic)
      await register({ email, password }, { skipRedirect: true });

      // 2. Generate and encrypt wallet with user's password
      setIsCreatingWallet(true);
      const { walletData: encryptedData, mnemonic } = await generateEncryptedWallet(password);

      // 3. Save encrypted wallet to backend
      await walletsService.createEmbedded(encryptedData);

      // 4. Show mnemonic modal
      setWalletData({
        mnemonic,
        address: encryptedData.address,
      });
      setShowMnemonicModal(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error
        ? err.message
        : 'Erreur lors de la création du compte';
      setError(errorMessage);
    } finally {
      setIsCreatingWallet(false);
    }
  };

  const handleMnemonicConfirm = () => {
    setShowMnemonicModal(false);
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-bg p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="relative">
            <Lock className="w-10 h-10 text-cyan-neon" />
            <Clock className="w-6 h-6 text-cyan-neon absolute -bottom-1 -right-1" />
          </div>
          <h1 className="text-heading-2 text-white font-bold">TimeLock</h1>
        </div>

        {/* Register Card */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-heading-3 text-center text-white">
              Créer un compte
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* MetaMask Registration Button */}
            <MetaMaskButton
              onError={(errorMessage) => setError(errorMessage)}
              disabled={isLoading}
            />

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-glass-border" />
              </div>
              <div className="relative flex justify-center text-sm uppercase">
                <span className="bg-glass-surface px-3 text-text-muted">
                  Ou continuer avec email
                </span>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-error/20 border border-error/30 text-error text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-text-secondary">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-dark-blue-lighter border-glass-border text-white placeholder:text-text-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-text-secondary">
                  Mot de passe
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-dark-blue-lighter border-glass-border text-white placeholder:text-text-muted"
                />
                <p className="text-xs text-text-muted">Minimum 8 caractères</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-text-secondary">
                  Confirmer le mot de passe
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-dark-blue-lighter border-glass-border text-white placeholder:text-text-muted"
                />
              </div>

              <Button
                type="submit"
                className="w-full glass-button h-11 text-base font-semibold"
                disabled={isLoading || isCreatingWallet}
              >
                {isLoading || isCreatingWallet ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isCreatingWallet ? 'Création du wallet...' : 'Création du compte...'}
                  </>
                ) : (
                  'Créer mon compte'
                )}
              </Button>

              <div className="text-center">
                <Link
                  href="/login"
                  className="text-cyan-neon hover:text-cyan-light transition-colors text-sm"
                >
                  Se connecter
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Mnemonic Modal - shown after wallet creation */}
      {walletData && (
        <MnemonicModal
          isOpen={showMnemonicModal}
          mnemonic={walletData.mnemonic}
          walletAddress={walletData.address}
          onConfirm={handleMnemonicConfirm}
        />
      )}
    </div>
  );
}

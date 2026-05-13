"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Lock, Clock, Wallet, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
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
        <Wallet className="w-6 h-6 mr-3" />
        Chargement...
      </Button>
    ),
  }
);

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      await login({ email, password });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Email ou mot de passe incorrect';
      setError(errorMessage);
    }
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

        {/* Login Card */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-heading-3 text-center text-white">
              Se connecter
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* MetaMask Login Button */}
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
              </div>

              <Button
                type="submit"
                className="w-full glass-button h-11 text-base font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connexion...
                  </>
                ) : (
                  'Se connecter'
                )}
              </Button>

              <div className="text-center">
                <Link
                  href="/register"
                  className="text-cyan-neon hover:text-cyan-light transition-colors text-sm"
                >
                  Créer un compte
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

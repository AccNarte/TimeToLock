"use client";

import { useState } from 'react';
import { Key, Loader2, Eye, EyeOff, Copy, Check, AlertTriangle } from 'lucide-react';
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

interface ExportMnemonicDialogProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  onExport: (password: string) => Promise<string>;
}

export function ExportMnemonicDialog({
  isOpen,
  onClose,
  walletAddress,
  onExport,
}: ExportMnemonicDialogProps) {
  const [password, setPassword] = useState('');
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await onExport(password);
      setMnemonic(result);
    } catch (err) {
      setError('Mot de passe incorrect ou erreur de déchiffrement');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (mnemonic) {
      await navigator.clipboard.writeText(mnemonic);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setPassword('');
    setMnemonic(null);
    setError(null);
    setShowMnemonic(false);
    setCopied(false);
    onClose();
  };

  const words = mnemonic?.split(' ') || [];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-dark-blue-lighter border-glass-border">
        <DialogHeader>
          <DialogTitle className="text-xl text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-cyan-neon" />
            Exporter la phrase de récupération
          </DialogTitle>
          <DialogDescription className="text-text-secondary">
            Wallet: <span className="font-mono text-cyan-neon">{walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}</span>
          </DialogDescription>
        </DialogHeader>

        {!mnemonic ? (
          <form onSubmit={handleExport} className="space-y-4 mt-4">
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
              <p className="text-sm text-warning/80">
                Entrez votre mot de passe pour déchiffrer et afficher la phrase de récupération.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-error/20 border border-error/30 text-error text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="export-password" className="text-text-secondary">
                Mot de passe du compte
              </Label>
              <Input
                id="export-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="bg-dark-blue border-glass-border text-white placeholder:text-text-muted"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading || !password}
              className="w-full glass-button"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Déchiffrement...
                </>
              ) : (
                'Afficher la phrase'
              )}
            </Button>
          </form>
        ) : (
          <div className="space-y-4 mt-4">
            <div className="p-4 rounded-lg bg-glass-surface border border-glass-border">
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm text-text-secondary font-medium">Phrase de récupération (12 mots)</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowMnemonic(!showMnemonic)}
                    className="h-8 px-2 text-text-muted hover:text-white"
                  >
                    {showMnemonic ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="h-8 px-2 text-text-muted hover:text-white"
                  >
                    {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {words.map((word, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 rounded bg-dark-blue border border-glass-border"
                  >
                    <span className="text-xs text-text-muted w-4">{index + 1}.</span>
                    <span className={`text-sm font-mono ${showMnemonic ? 'text-white' : 'text-transparent bg-glass-border rounded select-none'}`}>
                      {showMnemonic ? word : '••••••'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-error/10 border border-error/30 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-error flex-shrink-0" />
              <p className="text-sm text-error/80">
                Ne partagez jamais cette phrase. Elle donne un accès total à votre wallet.
              </p>
            </div>

            <Button onClick={handleClose} className="w-full glass-button">
              Fermer
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

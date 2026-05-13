"use client";

import { useState } from 'react';
import { Copy, Check, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface MnemonicDisplayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mnemonic: string;
  walletAddress: string;
}

export function MnemonicDisplayDialog({
  open,
  onOpenChange,
  mnemonic,
  walletAddress,
}: MnemonicDisplayDialogProps) {
  const [copied, setCopied] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [hasConfirmed, setHasConfirmed] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(mnemonic);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleClose = () => {
    if (hasConfirmed) {
      onOpenChange(false);
      // Reset state when closing
      setIsVisible(false);
      setHasConfirmed(false);
      setCopied(false);
    }
  };

  const words = mnemonic.split(' ');

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="glass-card border-glass-border max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-heading-3 text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Phrase de récupération (Mnemonic)
          </DialogTitle>
          <DialogDescription className="text-text-secondary">
            ⚠️ Cette phrase ne sera affichée qu'une seule fois. Sauvegardez-la dans un endroit sûr.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Wallet Address */}
          <div className="p-4 rounded-lg bg-glass-surface/30 border border-glass-border">
            <p className="text-xs text-text-muted mb-1">Adresse du wallet</p>
            <p className="font-mono text-white text-sm break-all">{walletAddress}</p>
          </div>

          {/* Mnemonic Words */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Votre phrase de récupération</p>
              <div className="flex gap-2">
                <Button
                  onClick={() => setIsVisible(!isVisible)}
                  variant="outline"
                  size="sm"
                  className="glass-button"
                >
                  {isVisible ? (
                    <>
                      <EyeOff className="w-4 h-4 mr-2" />
                      Masquer
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Afficher
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  size="sm"
                  className="glass-button"
                  disabled={!isVisible}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2 text-success" />
                      Copié!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copier
                    </>
                  )}
                </Button>
              </div>
            </div>

            {isVisible ? (
              <div className="grid grid-cols-3 gap-2 p-4 rounded-lg bg-glass-surface/30 border border-glass-border">
                {words.map((word, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 rounded bg-dark-blue-lighter/50"
                  >
                    <Badge className="bg-cyan-neon/20 text-cyan-neon border-cyan-neon/30 text-xs w-6 h-6 flex items-center justify-center p-0">
                      {index + 1}
                    </Badge>
                    <span className="text-white font-mono text-sm">{word}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-lg bg-glass-surface/30 border border-glass-border text-center">
                <EyeOff className="w-12 h-12 text-text-muted mx-auto mb-4" />
                <p className="text-text-muted">
                  Cliquez sur "Afficher" pour révéler votre phrase de récupération
                </p>
              </div>
            )}
          </div>

          {/* Warning */}
          <div className="p-4 rounded-lg bg-warning/10 border border-warning/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm">
                <p className="text-warning font-semibold">Important :</p>
                <ul className="list-disc list-inside space-y-1 text-text-secondary">
                  <li>Ne partagez jamais cette phrase avec personne</li>
                  <li>Sauvegardez-la dans un endroit sûr et sécurisé</li>
                  <li>Vous en aurez besoin pour restaurer votre wallet</li>
                  <li>Cette phrase ne sera plus affichée après fermeture</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Confirmation Checkbox */}
          <div className="flex items-center gap-3 p-4 rounded-lg bg-glass-surface/30 border border-glass-border">
            <input
              type="checkbox"
              id="confirm-saved"
              checked={hasConfirmed}
              onChange={(e) => setHasConfirmed(e.target.checked)}
              className="w-5 h-5 rounded border-glass-border bg-dark-blue-lighter text-cyan-neon focus:ring-cyan-neon focus:ring-offset-0"
            />
            <label htmlFor="confirm-saved" className="text-sm text-text-secondary cursor-pointer">
              J'ai sauvegardé ma phrase de récupération dans un endroit sûr
            </label>
          </div>

          {/* Close Button */}
          <Button
            onClick={handleClose}
            disabled={!hasConfirmed}
            className="w-full glass-button"
          >
            J'ai sauvegardé ma phrase de récupération
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}








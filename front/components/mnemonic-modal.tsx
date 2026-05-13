"use client";

import { useState } from 'react';
import { AlertTriangle, Copy, Check, Eye, EyeOff, Shield } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface MnemonicModalProps {
  isOpen: boolean;
  mnemonic: string;
  walletAddress: string;
  onConfirm: () => void;
}

export function MnemonicModal({
  isOpen,
  mnemonic,
  walletAddress,
  onConfirm,
}: MnemonicModalProps) {
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const words = mnemonic.split(' ');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(mnemonic);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirm = () => {
    if (confirmed) {
      onConfirm();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg bg-dark-blue-lighter border-glass-border" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-cyan-neon/10 border border-cyan-neon/30 flex items-center justify-center">
              <Shield className="w-8 h-8 text-cyan-neon" />
            </div>
          </div>
          <DialogTitle className="text-xl text-white text-center">
            Votre Wallet a été créé !
          </DialogTitle>
          <DialogDescription className="text-text-secondary text-center">
            Sauvegardez votre phrase de récupération dans un endroit sûr.
            <br />
            <strong className="text-error">Elle ne sera plus jamais affichée.</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Wallet Address */}
          <div className="p-3 rounded-lg bg-glass-surface border border-glass-border">
            <p className="text-xs text-text-muted mb-1">Adresse du wallet</p>
            <p className="text-sm text-cyan-neon font-mono break-all">{walletAddress}</p>
          </div>

          {/* Warning */}
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="text-sm text-warning">
              <p className="font-semibold mb-1">Important</p>
              <ul className="list-disc list-inside space-y-1 text-warning/80">
                <li>Cette phrase permet de récupérer votre wallet</li>
                <li>Ne la partagez jamais avec personne</li>
                <li>TimeLock ne peut pas la récupérer si vous la perdez</li>
              </ul>
            </div>
          </div>

          {/* Mnemonic Grid */}
          <div className="relative">
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
                    {showMnemonic ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="h-8 px-2 text-text-muted hover:text-white"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-success" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
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
          </div>

          {/* Confirmation Checkbox */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-glass-surface border border-glass-border">
            <Checkbox
              id="confirm-backup"
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(checked === true)}
              className="mt-0.5"
            />
            <label
              htmlFor="confirm-backup"
              className="text-sm text-text-secondary cursor-pointer leading-relaxed"
            >
              J'ai sauvegardé ma phrase de récupération dans un endroit sûr et je comprends que TimeLock ne pourra pas la récupérer.
            </label>
          </div>

          {/* Confirm Button */}
          <Button
            onClick={handleConfirm}
            disabled={!confirmed}
            className="w-full glass-button h-11 text-base font-semibold"
          >
            Continuer vers le dashboard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useState } from 'react';
import { Download, FileLock2, ShieldCheck, CheckCircle2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  downloadCryptoRescueKit,
  type CryptoRescueKitData,
} from '@/lib/pdf/crypto-rescue-kit';

interface CryptoRescueKitModalProps {
  open: boolean;
  data: CryptoRescueKitData | null;
  onClose: () => void;
}

export function CryptoRescueKitModal({ open, data, onClose }: CryptoRescueKitModalProps) {
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = () => {
    if (!data) return;
    downloadCryptoRescueKit(data);
    setDownloaded(true);
  };

  const handleClose = () => {
    setDownloaded(false);
    onClose();
  };

  if (!data) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-lg bg-[var(--glass-surface)] border-[var(--glass-border)]">
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-7 h-7 rounded-md bg-[var(--cyan-neon)]/15 border border-[var(--cyan-neon)]/30 flex items-center justify-center">
              <FileLock2 className="w-3.5 h-3.5 text-[var(--cyan-light)]" strokeWidth={2} />
            </div>
            <p className="text-[10px] uppercase tracking-[0.16em] font-medium text-[var(--text-muted)]">
              Lock #{data.lockDbId} créé
            </p>
          </div>
          <DialogTitle className="text-[20px] font-semibold tracking-tight text-white">
            Garde une copie de récupération
          </DialogTitle>
          <DialogDescription className="text-[var(--text-secondary)] text-[13px] leading-relaxed">
            Tes fonds sont scellés on-chain et leur sort ne dépend pas de TimeLock. Mais
            si tu veux retirer sans repasser par notre site, il te faut quelques
            informations précises. Ce PDF les contient toutes.
          </DialogDescription>
        </DialogHeader>

        {/* Summary */}
        <div className="rounded-lg border border-[var(--glass-border)]/60 bg-[var(--background)]/30 p-3.5 mt-2 space-y-2.5">
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-[var(--text-muted)]">Montant</span>
            <span className="font-mono text-white font-medium">
              {data.amountFormatted} {data.tokenSymbol}
            </span>
          </div>
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-[var(--text-muted)]">Déverrouillage</span>
            <span className="text-white">
              {data.unlockAt.toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-[var(--text-muted)]">Vault</span>
            <span className="font-mono text-[var(--text-secondary)] text-[11px]">
              {data.vaultAddress.slice(0, 8)}…{data.vaultAddress.slice(-6)}
            </span>
          </div>
        </div>

        {/* What's inside */}
        <div className="mt-2 space-y-2">
          <p className="text-[11px] uppercase tracking-[0.14em] font-medium text-[var(--text-muted)]">
            Ce que contient le PDF
          </p>
          <ul className="space-y-1.5">
            {[
              'Adresse exacte du vault à interroger',
              'Méthode pas-à-pas via PolygonScan (sans terminal)',
              'Script ethers.js prêt à l\'emploi',
              'ABI minimal du contrat à copier-coller',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-[12.5px] text-[var(--text-secondary)]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success)] flex-shrink-0 mt-0.5" strokeWidth={2} />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Safety note */}
        <div className="mt-3 flex items-start gap-2.5 p-3 rounded-md bg-[var(--cyan-neon)]/[0.05] border border-[var(--cyan-neon)]/15">
          <ShieldCheck className="w-4 h-4 text-[var(--cyan-light)] flex-shrink-0 mt-0.5" strokeWidth={1.75} />
          <div>
            <p className="text-[12px] font-medium text-white mb-0.5">Ce PDF n'est pas un secret</p>
            <p className="text-[11.5px] text-[var(--text-secondary)] leading-relaxed">
              Sans ta clé privée wallet, personne ne peut retirer les fonds — même en
              possédant ce document. Tu peux l'imprimer, l'envoyer par email, le stocker
              sur un drive : aucun risque.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-3">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1"
          >
            {downloaded ? 'Fermer' : 'Plus tard'}
          </Button>
          <Button
            onClick={handleDownload}
            className="flex-1 glass-button"
          >
            {downloaded ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Téléchargé · re-télécharger
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Télécharger le PDF
              </>
            )}
          </Button>
        </div>

        {!downloaded && (
          <p className="text-[11px] text-[var(--text-muted)] text-center mt-1">
            Tu peux fermer sans télécharger — ton lock reste accessible depuis l'app.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

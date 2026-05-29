'use client';

import { useState } from 'react';
import { useSwitchChain } from 'wagmi';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SUPPORTED_CHAIN_ID } from '@/hooks/use-tokens';
import { toast } from 'sonner';

interface WrongNetworkPromptProps {
  variant?: 'banner' | 'compact';
  className?: string;
}

export function WrongNetworkPrompt({ variant = 'banner', className }: WrongNetworkPromptProps) {
  const { switchChain } = useSwitchChain();
  const [isSwitching, setIsSwitching] = useState(false);

  const handleSwitch = async () => {
    setIsSwitching(true);
    try {
      await switchChain({ chainId: SUPPORTED_CHAIN_ID });
    } catch (err: any) {
      toast.error(err?.shortMessage || err?.message || 'Impossible de basculer sur Polygon');
    } finally {
      setIsSwitching(false);
    }
  };

  if (variant === 'compact') {
    return (
      <Button
        onClick={handleSwitch}
        disabled={isSwitching}
        size="sm"
        className={`gap-2 bg-warning/20 text-warning border border-warning/30 hover:bg-warning/30 ${className ?? ''}`}
      >
        {isSwitching ? <Loader2 className="w-3 h-3 animate-spin" /> : <AlertTriangle className="w-3 h-3" />}
        Passer sur Polygon
      </Button>
    );
  }

  return (
    <div className={`p-3 rounded-lg bg-warning/10 border border-warning/30 ${className ?? ''}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-warning font-medium">Réseau non supporté</p>
          <p className="text-xs text-warning/80 mt-1">
            La beta TimeLock fonctionne uniquement sur Polygon. Bascule ton wallet pour continuer.
          </p>
        </div>
        <Button
          onClick={handleSwitch}
          disabled={isSwitching}
          size="sm"
          className="bg-warning text-dark-blue hover:bg-warning/90 font-semibold flex-shrink-0"
        >
          {isSwitching ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
              Bascule...
            </>
          ) : (
            'Passer sur Polygon'
          )}
        </Button>
      </div>
    </div>
  );
}

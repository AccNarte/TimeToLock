"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { useDeployFactory, type DeployableFactoryType } from '@/hooks/use-deploy-factory';
import { useQueryClient } from '@tanstack/react-query';
import { factoryService } from '@/lib/api/services/factory.service';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  Copy,
  ExternalLink,
  ArrowUpRight,
  Bitcoin,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const POLYGON_CHAIN_ID = 137;

const FACTORY_OPTIONS: Array<{
  value: DeployableFactoryType;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    value: 'crypto_timelock',
    label: 'TimelockFactory',
    description: 'Lock de MATIC ou tokens ERC-20. Requis pour la page /crypto.',
    icon: Bitcoin,
  },
  {
    value: 'file_lock',
    label: 'FileLockFactory',
    description: 'Lock de fichiers chiffrés + scellement de clé. Requis pour /files-blockchain.',
    icon: Shield,
  },
];

export default function DeployPage() {
  const { address, chainId, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const [selectedFactoryType, setSelectedFactoryType] = useState<DeployableFactoryType>('crypto_timelock');

  const {
    deploy,
    isPending,
    isConfirming,
    isConfirmed,
    deployedAddress,
    deployedType,
    hash,
    error,
    isDeploying,
  } = useDeployFactory();

  const queryClient = useQueryClient();
  const registrationRef = useRef<{ status: 'idle' | 'registering' | 'done' | 'error'; address?: string }>({ status: 'idle' });
  const [registrationStatus, setRegistrationStatus] = useState<'idle' | 'registering' | 'done' | 'error'>('idle');
  const [registrationError, setRegistrationError] = useState<string | null>(null);

  const runRegistration = useCallback(async (addr: string) => {
    if (!deployedType) {
      setRegistrationError('Type de factory inconnu — impossible d\'enregistrer.');
      setRegistrationStatus('error');
      return;
    }

    registrationRef.current = { status: 'registering', address: addr };
    setRegistrationStatus('registering');
    setRegistrationError(null);

    try {
      await factoryService.register({
        chainId: POLYGON_CHAIN_ID,
        contractType: deployedType,
        address: addr,
        txHash: hash ?? undefined,
      });
      registrationRef.current = { status: 'done', address: addr };
      setRegistrationStatus('done');
      queryClient.invalidateQueries({ queryKey: ['factory-address'] });
      toast.success(`Factory ${deployedType} enregistrée`);
    } catch (err: any) {
      registrationRef.current = { status: 'error', address: addr };
      setRegistrationStatus('error');
      const msg = err.response?.data?.message || err.message || 'Erreur inconnue';
      setRegistrationError(msg);
      toast.error(`Échec de l'enregistrement: ${msg}`);
    }
  }, [hash, queryClient, deployedType]);

  useEffect(() => {
    if (!isConfirmed || !deployedAddress) return;
    if (registrationRef.current.address === deployedAddress) return;
    runRegistration(deployedAddress);
  }, [isConfirmed, deployedAddress, runRegistration]);

  const retryRegistration = () => {
    if (deployedAddress) runRegistration(deployedAddress);
  };

  const handleDeploy = async () => {
    if (!isConnected) {
      toast.error('Connecte ton wallet');
      return;
    }

    if (chainId !== POLYGON_CHAIN_ID) {
      toast.info('Bascule vers Polygon…');
      try {
        await switchChain({ chainId: POLYGON_CHAIN_ID });
      } catch {
        toast.error('Impossible de basculer de réseau');
        return;
      }
    }

    registrationRef.current = { status: 'idle' };
    setRegistrationStatus('idle');
    setRegistrationError(null);

    try {
      await deploy(selectedFactoryType);
      toast.success('Transaction envoyée — en attente de confirmation');
    } catch (err: any) {
      console.error('Deploy error:', err);
      toast.error(err.message || 'Erreur lors du déploiement');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copié`);
  };

  const selectedLabel = FACTORY_OPTIONS.find(o => o.value === selectedFactoryType)?.label ?? '';

  // Timeline step component: clean indicator + label + optional content
  const Step = ({
    state,
    title,
    children,
  }: {
    state: 'idle' | 'active' | 'done' | 'error';
    title: string;
    children?: React.ReactNode;
  }) => (
    <div className="relative pl-8 pb-6 last:pb-0">
      {/* Vertical guideline */}
      <span className="absolute left-[10px] top-5 bottom-0 w-px bg-[var(--glass-border)]/60" />
      {/* Indicator */}
      <span
        className={[
          'absolute left-0 top-0.5 w-[21px] h-[21px] rounded-full flex items-center justify-center',
          state === 'done'
            ? 'bg-[var(--success)]/15 border border-[var(--success)]/40'
            : state === 'active'
            ? 'bg-[var(--cyan-neon)]/15 border border-[var(--cyan-neon)]/40'
            : state === 'error'
            ? 'bg-[var(--error)]/15 border border-[var(--error)]/40'
            : 'bg-[var(--glass-surface)] border border-[var(--glass-border)]',
        ].join(' ')}
      >
        {state === 'done' && <CheckCircle2 className="w-3 h-3 text-[var(--success)]" strokeWidth={2.5} />}
        {state === 'active' && <Loader2 className="w-3 h-3 text-[var(--cyan-light)] animate-spin" />}
        {state === 'error' && <AlertCircle className="w-3 h-3 text-[var(--error)]" strokeWidth={2.5} />}
        {state === 'idle' && <span className="w-1.5 h-1.5 rounded-full bg-[var(--glass-border)]" />}
      </span>

      <p className={[
        'text-[13px] font-medium leading-snug',
        state === 'idle' ? 'text-[var(--text-muted)]' : 'text-white',
      ].join(' ')}>
        {title}
      </p>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto">
      {/* ─── Header ─── */}
      <div className="mb-10 pb-6 border-b border-[var(--glass-border)]/60">
        <p className="text-[11px] uppercase tracking-[0.16em] font-medium text-[var(--text-muted)] mb-2">
          Administration
        </p>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Déploiement de factory</h1>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">
          Chaque factory n'est déployée qu'une seule fois sur Polygon mainnet. Son adresse
          est ensuite stockée en base et partagée par tous les utilisateurs.
        </p>
      </div>

      {/* ─── 1. Sélection ─── */}
      <section className="mb-10">
        <p className="text-[10px] uppercase tracking-[0.14em] font-medium text-[var(--text-muted)] mb-3">
          01 · Choix
        </p>
        <h2 className="text-base font-semibold text-white tracking-tight mb-4">
          Type de factory à déployer
        </h2>

        <div className="grid sm:grid-cols-2 gap-3">
          {FACTORY_OPTIONS.map((opt) => {
            const isSelected = selectedFactoryType === opt.value;
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => !isDeploying && setSelectedFactoryType(opt.value)}
                disabled={isDeploying}
                className={[
                  'group text-left p-4 rounded-lg border transition-colors',
                  isSelected
                    ? 'border-[var(--cyan-light)] bg-[var(--cyan-neon)]/[0.06]'
                    : 'border-[var(--glass-border)] bg-[var(--glass-surface)] hover:border-[var(--glass-border)] hover:bg-[var(--glass-surface)]/70',
                  isDeploying ? 'opacity-50 cursor-not-allowed' : '',
                ].join(' ')}
              >
                <div className="flex items-start gap-3">
                  <Icon
                    className={[
                      'w-4 h-4 mt-0.5 flex-shrink-0',
                      isSelected ? 'text-[var(--cyan-light)]' : 'text-[var(--text-muted)]',
                    ].join(' ')}
                    strokeWidth={1.75}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white text-[13px]">{opt.label}</span>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--cyan-light)]" />
                      )}
                    </div>
                    <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">{opt.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ─── 2. Pré-requis ─── */}
      <section className="mb-10">
        <p className="text-[10px] uppercase tracking-[0.14em] font-medium text-[var(--text-muted)] mb-3">
          02 · Pré-requis
        </p>
        <h2 className="text-base font-semibold text-white tracking-tight mb-4">État du wallet</h2>

        <div className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass-surface)] divide-y divide-[var(--glass-border)]/60">
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-[12px] text-[var(--text-muted)]">Connexion</span>
            <span className={[
              'text-[12px] font-medium flex items-center gap-1.5',
              isConnected ? 'text-[var(--success)]' : 'text-[var(--error)]',
            ].join(' ')}>
              <span className={[
                'w-1.5 h-1.5 rounded-full',
                isConnected ? 'bg-[var(--success)]' : 'bg-[var(--error)]',
              ].join(' ')} />
              {isConnected ? 'Connecté' : 'Non connecté'}
            </span>
          </div>

          {address && (
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-[12px] text-[var(--text-muted)]">Adresse</span>
              <span className="text-[12px] font-mono text-[var(--text-secondary)]">
                {address.slice(0, 6)}…{address.slice(-4)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-[12px] text-[var(--text-muted)]">Réseau</span>
            <span className={[
              'text-[12px] font-medium',
              chainId === POLYGON_CHAIN_ID ? 'text-[var(--success)]' : 'text-[var(--warning)]',
            ].join(' ')}>
              {chainId === POLYGON_CHAIN_ID ? 'Polygon Mainnet' : chainId ? `Chain ${chainId} — bascule requise` : '—'}
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-start gap-2.5 text-[12px] text-[var(--text-muted)]">
          <AlertCircle className="w-3.5 h-3.5 text-[var(--warning)] flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Prévois <span className="text-white font-medium">~0.5 MATIC</span> pour le gas.
            Coût réel ~0.03 à 0.10 MATIC selon la complexité du contrat.
          </p>
        </div>
      </section>

      {/* ─── 3. Action ─── */}
      <section className="mb-10">
        <p className="text-[10px] uppercase tracking-[0.14em] font-medium text-[var(--text-muted)] mb-3">
          03 · Déploiement
        </p>
        <h2 className="text-base font-semibold text-white tracking-tight mb-4">Signer et envoyer</h2>

        {!isConfirmed && (
          <Button
            onClick={handleDeploy}
            disabled={!isConnected || isDeploying}
            className="glass-button w-full h-11 text-sm"
          >
            {isDeploying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isPending ? 'Signature en cours…' : 'Confirmation en cours…'}
              </>
            ) : (
              <>Déployer {selectedLabel}</>
            )}
          </Button>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-[var(--error)]/40 bg-[var(--error)]/10 p-3 text-[12px] text-[var(--error)]">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium mb-0.5">Erreur</p>
                <p className="text-[var(--error)]/90 break-all">{error.message}</p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ─── 4. Progression ─── */}
      {hash && (
        <section className="mb-10">
          <p className="text-[10px] uppercase tracking-[0.14em] font-medium text-[var(--text-muted)] mb-3">
            04 · Progression
          </p>

          <div className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass-surface)] p-5">
            <Step
              state={hash && isConfirming ? 'active' : isConfirmed ? 'done' : 'idle'}
              title="Transaction envoyée"
            >
              <div className="flex items-center gap-2 group">
                <code className="text-[11px] font-mono text-[var(--text-secondary)] break-all flex-1">
                  {hash}
                </code>
                <button
                  onClick={() => copyToClipboard(hash, 'Hash')}
                  className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-white hover:bg-[var(--background)]/40 transition-colors"
                  title="Copier"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <a
                  href={`https://polygonscan.com/tx/${hash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-white hover:bg-[var(--background)]/40 transition-colors"
                  title="Voir sur PolygonScan"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </Step>

            <Step
              state={isConfirmed ? 'done' : isConfirming ? 'active' : 'idle'}
              title="Confirmation on-chain"
            >
              {isConfirmed && deployedAddress && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[var(--text-muted)]">Adresse du contrat :</span>
                  <code className="text-[11px] font-mono text-[var(--cyan-light)] break-all flex-1">
                    {deployedAddress}
                  </code>
                  <button
                    onClick={() => copyToClipboard(deployedAddress, 'Adresse')}
                    className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-white hover:bg-[var(--background)]/40 transition-colors"
                    title="Copier"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </Step>

            <Step
              state={
                registrationStatus === 'done'
                  ? 'done'
                  : registrationStatus === 'registering'
                  ? 'active'
                  : registrationStatus === 'error'
                  ? 'error'
                  : 'idle'
              }
              title={
                registrationStatus === 'done'
                  ? 'Enregistrée — disponible pour tous les utilisateurs'
                  : registrationStatus === 'registering'
                  ? 'Enregistrement en base…'
                  : registrationStatus === 'error'
                  ? 'Échec de l\'enregistrement en base'
                  : 'Enregistrement en base'
              }
            >
              {registrationStatus === 'error' && (
                <div className="space-y-2">
                  <p className="text-[12px] text-[var(--error)] break-words">
                    {registrationError ?? 'erreur inconnue'}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                    Si l'erreur dit <span className="text-white">Admin role required</span>, deviens
                    admin (édite <code className="text-[10.5px] px-1 py-px rounded bg-[var(--background)]/40 border border-[var(--glass-border)]/60 font-mono">backend/src/seed-admin.ts</code> avec ton adresse, puis <code className="text-[10.5px] px-1 py-px rounded bg-[var(--background)]/40 border border-[var(--glass-border)]/60 font-mono">npm run seed:admin</code>) avant de réessayer.
                  </p>
                  <Button
                    onClick={retryRegistration}
                    size="sm"
                    variant="outline"
                    className="border-[var(--error)]/40 text-[var(--error)] hover:bg-[var(--error)]/10 mt-1"
                  >
                    Réessayer l'enregistrement
                  </Button>
                </div>
              )}

              {registrationStatus === 'done' && deployedAddress && (
                <a
                  href={`https://polygonscan.com/address/${deployedAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[12px] text-[var(--cyan-light)] hover:text-[var(--cyan-neon)] transition-colors"
                >
                  Vérifier sur PolygonScan
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              )}
            </Step>
          </div>
        </section>
      )}

      {/* ─── About ─── */}
      <section className="mt-12 pt-6 border-t border-[var(--glass-border)]/60">
        <p className="text-[10px] uppercase tracking-[0.14em] font-medium text-[var(--text-muted)] mb-4">
          À propos
        </p>
        <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-5">
          <div>
            <dt className="text-[12px] font-semibold text-white mb-1">Pourquoi déployer depuis le front ?</dt>
            <dd className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
              Le backend ne reçoit jamais ta clé privée. Tu signes la transaction
              directement avec ton wallet.
            </dd>
          </div>
          <div>
            <dt className="text-[12px] font-semibold text-white mb-1">Faut-il redéployer pour chaque user ?</dt>
            <dd className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
              Non. Une seule factory sert tous les utilisateurs. Le pattern <span className="font-mono">factory + vault</span> crée
              un contrat dédié pour chaque lock individuel.
            </dd>
          </div>
          <div>
            <dt className="text-[12px] font-semibold text-white mb-1">Combien ça coûte ?</dt>
            <dd className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
              ~1.5M gas, soit 0.03 à 0.10 MATIC selon le prix du gas au moment du déploiement.
            </dd>
          </div>
          <div>
            <dt className="text-[12px] font-semibold text-white mb-1">Et si je redéploie une v2 ?</dt>
            <dd className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
              La nouvelle adresse remplace l'active dans la DB. L'ancienne reste en
              historique (<span className="font-mono">isActive = false</span>).
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  ArrowUpRight,
  Lock,
  LayoutDashboard,
  ShieldCheck,
  FileText,
  Bitcoin,
  Github,
  Twitter,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export default function LandingPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  // `authReady` gates the auth-dependent CTAs so the first paint doesn't show
  // "Connexion / Commencer" then flip to "Dashboard" a millisecond later.
  const authReady = !authLoading;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* ────────────────────────────────  NAV  ──────────────────────────────── */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-[var(--background)]/85 border-b border-[var(--glass-border)]/60">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 lg:px-8 h-14">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.svg" alt="" width={22} height={22} className="w-[22px] h-[22px]" />
            <span className="text-[15px] font-semibold tracking-tight">TimeLock</span>
            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-[var(--glass-surface)] text-[var(--text-muted)] border border-[var(--glass-border)]">
              beta
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-7 text-sm text-[var(--text-secondary)]">
            <a href="#product" className="hover:text-white transition-colors">Produit</a>
            <a href="#security" className="hover:text-white transition-colors">Sécurité</a>
            <a href="#how" className="hover:text-white transition-colors">Fonctionnement</a>
            <Link href="/explication" className="hover:text-white transition-colors">Explication</Link>
          </div>

          <div className="flex items-center gap-2">
            {authReady && isAuthenticated ? (
              <Link href="/dashboard">
                <Button size="sm" className="glass-button px-4 h-8 text-[13px] gap-1.5">
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  Dashboard
                </Button>
              </Link>
            ) : authReady ? (
              <>
                <Link href="/login" className="hidden sm:block">
                  <Button variant="ghost" size="sm" className="text-[var(--text-secondary)] hover:text-white">
                    Connexion
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="glass-button px-4 h-8 text-[13px]">
                    Commencer
                  </Button>
                </Link>
              </>
            ) : (
              // Skeleton-style placeholder pendant la vérif de session (~200ms)
              <span className="w-[88px] h-8 rounded-md bg-[var(--glass-surface)]/40 animate-pulse" aria-hidden />
            )}
          </div>
        </div>
      </nav>

      {/* ────────────────────────────────  HERO  ─────────────────────────────── */}
      <section className="px-6 lg:px-8 pt-20 pb-24 border-b border-[var(--glass-border)]/60">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          {/* Left — copy */}
          <div>
            <a
              href="https://polygon.technology"
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[var(--glass-surface)] border border-[var(--glass-border)] text-xs text-[var(--text-secondary)] hover:text-white transition-colors mb-7"
            >
              <Image src="/polygon-matic-logo.png" alt="" width={14} height={14} className="w-3.5 h-3.5" />
              <span>Déployé sur Polygon</span>
              <ArrowUpRight className="w-3 h-3 opacity-60 group-hover:opacity-100" />
            </a>

            <h1 className="text-[44px] lg:text-[56px] font-semibold leading-[1.05] tracking-[-0.03em] text-white">
              Scelle tes fichiers
              <br />
              et tes cryptos.
              <br />
              <span className="text-[var(--text-muted)]">Récupère-les plus tard.</span>
            </h1>

            <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-[var(--text-secondary)]">
              TimeLock chiffre tes données côté client, stocke le payload sur IPFS et scelle
              la clé de déchiffrement dans un smart contract Polygon. Personne — pas même
              nous — ne peut y accéder avant la date que tu as définie.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3 min-h-[40px]">
              {authReady && isAuthenticated ? (
                <Link href="/dashboard">
                  <Button className="glass-button h-10 px-5 text-sm">
                    <LayoutDashboard className="w-4 h-4" />
                    Ouvrir mon dashboard
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              ) : authReady ? (
                <>
                  <Link href="/register">
                    <Button className="glass-button h-10 px-5 text-sm">
                      Créer un compte
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button
                      variant="outline"
                      className="h-10 px-5 text-sm border-[var(--glass-border)] bg-transparent text-white hover:bg-[var(--glass-surface)]"
                    >
                      Se connecter
                    </Button>
                  </Link>
                </>
              ) : (
                <span className="w-[260px] h-10 rounded-md bg-[var(--glass-surface)]/40 animate-pulse" aria-hidden />
              )}
            </div>

            <p className="mt-6 text-xs text-[var(--text-muted)]">
              {authReady && isAuthenticated
                ? 'Tu es déjà connecté — tu peux accéder à ton espace directement.'
                : 'Connexion par wallet (MetaMask, Rabby) ou email/mot de passe.'}
            </p>
          </div>

          {/* Right — product card mockup */}
          <div className="relative">
            <div className="absolute -inset-x-6 -top-6 -bottom-6 bg-gradient-to-br from-[var(--cyan-neon)]/5 via-transparent to-transparent rounded-3xl pointer-events-none" />
            <div className="relative rounded-xl border border-[var(--glass-border)] bg-[var(--glass-surface)] overflow-hidden shadow-2xl shadow-black/40">
              {/* Mock window chrome */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--glass-border)]/80 bg-[var(--background)]/40">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--glass-border)]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--glass-border)]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--glass-border)]" />
                </div>
                <span className="text-[11px] font-mono text-[var(--text-muted)]">timelock.app/crypto</span>
                <span className="w-9" />
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] mb-1">
                      Active lock
                    </p>
                    <p className="text-base font-semibold text-white">Lock #047 — MATIC</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--warning)]/15 text-[var(--warning)] border border-[var(--warning)]/30">
                    LOCKED
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div>
                    <p className="text-[11px] text-[var(--text-muted)] mb-1">Montant</p>
                    <p className="text-xl font-semibold text-white font-mono">250.00</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[var(--text-muted)] mb-1">Déverrouillage</p>
                    <p className="text-sm font-medium text-white">14 nov. 2027</p>
                  </div>
                </div>

                <div className="rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)]/60 p-3.5">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                    Vault contract
                  </p>
                  <p className="text-[12px] font-mono text-[var(--text-secondary)] break-all">
                    0x9e4f…b2c1
                  </p>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--glass-border)]/60">
                    <ShieldCheck className="w-3.5 h-3.5 text-[var(--success)]" />
                    <p className="text-[11px] text-[var(--text-secondary)]">Audited factory · Permissionless</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────  METRICS  ───────────────────────────── */}
      <section className="px-6 lg:px-8 py-10 border-b border-[var(--glass-border)]/60">
        <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-y-6 gap-x-10">
          {[
            { value: 'AES-256', label: 'Chiffrement côté client' },
            { value: '~0.04 €', label: 'Frais moyens par lock' },
            { value: '< 5 s', label: 'Confirmation Polygon' },
            { value: '0 %', label: 'Commission TimeLock' },
          ].map((m) => (
            <div key={m.label} className="border-l border-[var(--glass-border)]/80 pl-4">
              <p className="text-2xl font-semibold tracking-tight text-white font-mono">{m.value}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">{m.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────────────────────────  PRODUCT  ───────────────────────────── */}
      <section id="product" className="px-6 lg:px-8 py-24 border-b border-[var(--glass-border)]/60">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-14">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--cyan-light)] font-medium mb-3">
              Produit
            </p>
            <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight text-white leading-tight">
              Deux primitives, une seule plateforme.
            </h2>
            <p className="text-[15px] text-[var(--text-secondary)] mt-4 leading-relaxed">
              Le même contrat-vault est utilisé pour les deux flux. Tu choisis si tu scelles
              un fichier ou une somme on-chain — le reste est partagé.
            </p>
          </div>

          {/* Bento — 1 large + 2 small */}
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Hero feature — files */}
            <div className="lg:col-span-2 lg:row-span-2 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-surface)] p-8 lg:p-10 relative overflow-hidden">
              <FileText className="w-7 h-7 text-[var(--cyan-light)] mb-6" strokeWidth={1.5} />
              <h3 className="text-2xl font-semibold tracking-tight text-white mb-3">
                Files Blockchain
              </h3>
              <p className="text-[15px] text-[var(--text-secondary)] mb-8 leading-relaxed max-w-md">
                Chiffrement AES-256-GCM exécuté dans le navigateur. Le fichier chiffré
                part sur IPFS via Pinata, la clé est dérivée d'une signature wallet et
                scellée dans un contrat-vault dédié.
              </p>

              <div className="space-y-3 max-w-md">
                {[
                  ['1', 'Chiffrement local', 'AES-256-GCM, PBKDF2'],
                  ['2', 'Upload IPFS', 'CID immuable, Pinata'],
                  ['3', 'Scellement on-chain', 'Vault dédié sur Polygon'],
                ].map(([n, title, sub]) => (
                  <div key={n} className="flex items-start gap-3.5">
                    <span className="flex-shrink-0 w-6 h-6 rounded-md bg-[var(--background)]/50 border border-[var(--glass-border)] text-[11px] font-mono text-[var(--text-muted)] flex items-center justify-center">
                      {n}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-white">{title}</p>
                      <p className="text-[12px] text-[var(--text-muted)]">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Crypto */}
            <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-surface)] p-6">
              <Bitcoin className="w-6 h-6 text-[var(--warning)] mb-4" strokeWidth={1.5} />
              <h3 className="text-lg font-semibold text-white mb-1.5">TimeLock Crypto</h3>
              <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                Verrouille MATIC ou n'importe quel ERC-20 dans un vault personnel.
                Retrait possible uniquement après l'échéance.
              </p>
            </div>

            {/* Self-custody */}
            <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-surface)] p-6">
              <ShieldCheck className="w-6 h-6 text-[var(--success)] mb-4" strokeWidth={1.5} />
              <h3 className="text-lg font-semibold text-white mb-1.5">Non-custodial</h3>
              <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                Les fonds n'entrent jamais sur nos serveurs. Chaque vault appartient
                exclusivement à son propriétaire.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────  HOW  ──────────────────────────────── */}
      <section id="how" className="px-6 lg:px-8 py-24 border-b border-[var(--glass-border)]/60">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[0.9fr_1.1fr] gap-14 items-start">
          <div className="lg:sticky lg:top-24">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--cyan-light)] font-medium mb-3">
              Fonctionnement
            </p>
            <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight text-white leading-tight">
              Du clic au vault, en quatre étapes.
            </h2>
            <p className="text-[15px] text-[var(--text-secondary)] mt-4 leading-relaxed">
              Aucune connaissance crypto requise. La complexité est cachée — sauf si tu
              veux la voir, auquel cas tout est sur Polygonscan.
            </p>
          </div>

          <ol className="space-y-1">
            {[
              {
                title: 'Authentification',
                desc: 'Sign-in via MetaMask, Rabby ou WalletConnect. Un compte email/mot de passe est aussi disponible.',
              },
              {
                title: 'Préparation',
                desc: 'Sélection du token ou du fichier, choix de la date d\'échéance, validation des paramètres.',
              },
              {
                title: 'Signature & verrouillage',
                desc: 'Une transaction sur Polygon crée un vault personnel. Pour les fichiers, la clé est dérivée d\'une signature off-chain et scellée dans le vault.',
              },
              {
                title: 'Retrait après échéance',
                desc: 'Une fois la date passée, le bouton "Récupérer" apparaît. Une signature, un retrait. C\'est tout.',
              },
            ].map((s, i, arr) => (
              <li
                key={s.title}
                className={`relative pl-10 py-5 ${i < arr.length - 1 ? 'border-b border-[var(--glass-border)]/60' : ''}`}
              >
                <span className="absolute left-0 top-5 w-7 h-7 rounded-md bg-[var(--background)]/40 border border-[var(--glass-border)] text-[12px] font-mono text-[var(--text-secondary)] flex items-center justify-center">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="text-base font-semibold text-white mb-1">{s.title}</h3>
                <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ─────────────────────────────  SECURITY  ────────────────────────────── */}
      <section id="security" className="px-6 lg:px-8 py-24 border-b border-[var(--glass-border)]/60">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-12">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--cyan-light)] font-medium mb-3">
              Sécurité
            </p>
            <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight text-white leading-tight">
              Trois couches, zéro confiance accordée.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-[var(--glass-border)] rounded-xl overflow-hidden border border-[var(--glass-border)]">
            {[
              {
                title: 'Crypto navigateur',
                tag: 'Client-side',
                body: 'AES-256-GCM avec un sel + IV aléatoire par fichier. Clé dérivée par PBKDF2 (100k itérations) à partir d\'une signature wallet ou du mot de passe utilisateur.',
              },
              {
                title: 'Stockage IPFS',
                tag: 'Pinata',
                body: 'Le fichier chiffré est pinné via Pinata, replicable sur n\'importe quel nœud IPFS. La destruction explicite déclenche un unpin et supprime l\'entrée DB.',
              },
              {
                title: 'Smart contracts',
                tag: 'Polygon',
                body: 'Pattern factory + vault. Chaque vault est un contrat isolé qui ne peut pas être déverrouillé avant son `unlockTime`. OpenZeppelin SafeERC20 et ReentrancyGuard.',
              },
            ].map((b) => (
              <div key={b.title} className="bg-[var(--glass-surface)] p-7">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded bg-[var(--background)]/60 border border-[var(--glass-border)] text-[var(--text-muted)]">
                    {b.tag}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{b.title}</h3>
                <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{b.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-surface)]/50 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-white">Contrats vérifiables on-chain</p>
              <p className="text-[12px] text-[var(--text-muted)]">
                Le code des contrats est public et reproductible depuis le dépôt.
              </p>
            </div>
            <a
              href="https://github.com/AccNarte/TimeToLock"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm text-white hover:text-[var(--cyan-light)] transition-colors"
            >
              Voir le code
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────  CTA  ─────────────────────────────── */}
      <section className="px-6 lg:px-8 py-24">
        <div className="max-w-3xl mx-auto text-center">
          <Lock className="w-7 h-7 text-[var(--cyan-light)] mx-auto mb-6" strokeWidth={1.5} />
          <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight text-white leading-tight">
            {authReady && isAuthenticated
              ? 'Bon retour. Continue là où tu en étais.'
              : 'Crée ton premier lock en une minute.'}
          </h2>
          <p className="text-[15px] text-[var(--text-secondary)] mt-4 max-w-lg mx-auto">
            {authReady && isAuthenticated
              ? 'Tu peux retourner à ton espace pour gérer tes locks, fichiers et wallets.'
              : 'Connecte ton wallet ou crée un compte. Aucune carte bancaire, aucune adresse email obligatoire.'}
          </p>
          <div className="mt-8 flex justify-center gap-3 min-h-[40px]">
            {authReady && isAuthenticated ? (
              <Link href="/dashboard">
                <Button className="glass-button h-10 px-6">
                  <LayoutDashboard className="w-4 h-4" />
                  Aller au dashboard
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            ) : authReady ? (
              <Link href="/register">
                <Button className="glass-button h-10 px-6">
                  Commencer
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            ) : (
              <span className="w-[180px] h-10 rounded-md bg-[var(--glass-surface)]/40 animate-pulse" aria-hidden />
            )}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────  FOOTER  ─────────────────────────────── */}
      <footer className="border-t border-[var(--glass-border)]/60 px-6 lg:px-8 py-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.svg" alt="" width={18} height={18} className="w-[18px] h-[18px] opacity-80" />
            <span className="text-sm font-medium text-[var(--text-secondary)]">TimeLock</span>
            <span className="text-xs text-[var(--text-muted)] ml-2">© 2026 — BTS SIO SLAM</span>
          </div>

          <div className="flex items-center gap-5 text-[12px] text-[var(--text-muted)]">
            <Link href="/explication" className="hover:text-white transition-colors">
              Comment ça marche
            </Link>
            <a href="https://polygon.technology" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Image src="/polygon-matic-logo.png" alt="" width={12} height={12} className="w-3 h-3 opacity-70" />
              Polygon Mainnet
            </a>
            <a href="https://github.com/AccNarte/TimeToLock" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Github className="w-3.5 h-3.5" />
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

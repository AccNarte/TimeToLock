'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import {
  Bitcoin,
  Shield,
  Lock,
  Unlock,
  Clock,
  KeyRound,
  Database,
  Boxes,
  Check,
  X,
  ArrowRight,
  ArrowDown,
  ArrowLeft,
  LayoutDashboard,
  Globe,
  Eye,
  ScrollText,
  PiggyBank,
  Users,
  Hourglass,
  Scale,
  Server,
  Network,
} from 'lucide-react';

/* ── Small presentational helpers ─────────────────────────────────────────── */

function Step({
  icon: Icon,
  title,
  desc,
  tone = 'default',
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  tone?: 'default' | 'accent' | 'success' | 'muted';
}) {
  const ring =
    tone === 'accent'
      ? 'border-[var(--cyan-light)]/40 bg-[var(--cyan-light)]/5'
      : tone === 'success'
      ? 'border-[var(--success)]/40 bg-[var(--success)]/5'
      : tone === 'muted'
      ? 'border-[var(--glass-border)] bg-[var(--glass-surface)]/40'
      : 'border-[var(--glass-border)] bg-[var(--glass-surface)]/70';
  const iconColor =
    tone === 'accent'
      ? 'text-[var(--cyan-light)]'
      : tone === 'success'
      ? 'text-[var(--success)]'
      : 'text-[var(--text-secondary)]';
  return (
    <div className={`flex-1 min-w-0 rounded-lg border p-4 ${ring}`}>
      <Icon className={`w-5 h-5 mb-2 ${iconColor}`} strokeWidth={1.75} />
      <p className="text-[13px] font-semibold text-white leading-tight">{title}</p>
      <p className="text-[12px] text-[var(--text-muted)] mt-1 leading-snug">{desc}</p>
    </div>
  );
}

function Connector() {
  return (
    <div className="flex items-center justify-center md:px-1 text-[var(--text-muted)]">
      <ArrowRight className="hidden md:block w-4 h-4" />
      <ArrowDown className="md:hidden w-4 h-4" />
    </div>
  );
}

function Flow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row md:items-stretch gap-2 md:gap-0">
      {children}
    </div>
  );
}

function Section({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="py-8 border-b border-[var(--glass-border)]/60 last:border-0">
      <div className="flex items-baseline gap-3 mb-5">
        <span className="text-[11px] font-mono text-[var(--text-muted)]">{n}</span>
        <h2 className="text-lg font-semibold text-white tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function ExplicationPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const authReady = !authLoading;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Public nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-[var(--background)]/85 border-b border-[var(--glass-border)]/60">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-6 h-14">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.svg" alt="" width={22} height={22} className="w-[22px] h-[22px]" />
            <span className="text-[15px] font-semibold tracking-tight text-white">TimeLock</span>
          </Link>
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
            ) : null}
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <Link
          href={authReady && isAuthenticated ? '/dashboard' : '/'}
          className="inline-flex items-center gap-1.5 text-[12px] text-[var(--text-muted)] hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {authReady && isAuthenticated ? 'Retour au dashboard' : "Retour à l'accueil"}
        </Link>

        {/* Header */}
        <div className="mb-6 pb-6 border-b border-[var(--glass-border)]/60">
          <p className="text-[11px] uppercase tracking-[0.16em] font-medium text-[var(--text-muted)] mb-2">
            Comprendre TimeLock
          </p>
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            Le verrouillage temporel décentralisé, expliqué
          </h1>
          <p className="text-[14px] text-[var(--text-secondary)] mt-2 leading-relaxed">
            TimeLock permet de rendre une donnée ou des fonds{' '}
            <span className="text-white">inaccessibles jusqu'à une date précise</span> — sans
            avoir à faire confiance à une personne ou une entreprise pour respecter cette date.
            La règle du temps est appliquée par un programme public sur la blockchain, que
            personne ne peut contourner. Pas même nous.
          </p>
        </div>

        {/* 1 — Les deux verrous */}
        <Section n="01" title="Les deux types de verrous">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass-surface)]/50 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Bitcoin className="w-5 h-5 text-[var(--cyan-light)]" strokeWidth={1.75} />
                <h3 className="text-[15px] font-semibold text-white">TimeLock Crypto</h3>
              </div>
              <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                Tu déposes des fonds (MATIC ou tokens) dans un coffre-fort logiciel. Ils sont{' '}
                <span className="text-white">verrouillés jusqu'à la date choisie</span>. Avant
                l'échéance, personne ne peut les retirer — toi non plus.
              </p>
            </div>
            <div className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass-surface)]/50 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-[var(--cyan-light)]" strokeWidth={1.75} />
                <h3 className="text-[15px] font-semibold text-white">TimeLock Files</h3>
              </div>
              <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                Ton fichier est chiffré, puis stocké de façon distribuée. La{' '}
                <span className="text-white">clé de déchiffrement est verrouillée</span> dans un
                coffre jusqu'à la date choisie. Avant l'échéance, le fichier reste illisible.
              </p>
            </div>
          </div>
        </Section>

        {/* 2 — Fonctionnement à distance */}
        <Section n="02" title="Comment ça fonctionne, étape par étape">
          <p className="text-[13px] text-[var(--text-muted)] mb-3 font-medium">Verrou de fonds (Crypto)</p>
          <Flow>
            <Step icon={PiggyBank} title="Tes fonds" desc="Tu choisis un montant et une date de déblocage." />
            <Connector />
            <Step
              icon={Lock}
              title="Coffre on-chain"
              desc="Les fonds entrent dans un smart contract qui mémorise la date."
              tone="accent"
            />
            <Connector />
            <Step icon={Hourglass} title="Période de blocage" desc="Aucun retrait possible. La règle est appliquée par le contrat." tone="muted" />
            <Connector />
            <Step icon={Unlock} title="Déblocage" desc="Une fois la date passée, toi seul peux retirer." tone="success" />
          </Flow>

          <p className="text-[13px] text-[var(--text-muted)] mb-3 mt-7 font-medium">Verrou de fichier (Files)</p>
          <Flow>
            <Step icon={ScrollText} title="Ton fichier" desc="Reste sur ton appareil, en clair, jusqu'au chiffrement." />
            <Connector />
            <Step
              icon={KeyRound}
              title="Chiffrement AES-256"
              desc="Chiffré dans ton navigateur. La clé est dérivée de ta signature wallet."
              tone="accent"
            />
            <Connector />
            <Step icon={Database} title="Stockage IPFS" desc="Le fichier chiffré part sur un réseau de stockage distribué." tone="muted" />
            <Connector />
            <Step icon={Lock} title="Clé verrouillée" desc="La clé + la date sont scellées dans un coffre on-chain." tone="accent" />
            <Connector />
            <Step icon={Unlock} title="Déchiffrement" desc="Après la date, la clé se débloque et le fichier redevient lisible." tone="success" />
          </Flow>

          <div className="mt-5 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-surface)]/40 p-4">
            <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
              <span className="text-white font-medium">Point clé :</span> le fichier en clair ne
              quitte jamais ton appareil, et la clé n'est jamais stockée en clair sur nos
              serveurs. Le chiffrement et le déchiffrement se font chez toi ; la blockchain ne
              garde que la <span className="text-white">règle du temps</span> et une clé déjà
              chiffrée.
            </p>
          </div>
        </Section>

        {/* 3 — Pourquoi pas chiffrer soi-même */}
        <Section n="03" title="Pourquoi ne pas simplement chiffrer de son côté ?">
          <p className="text-[13px] text-[var(--text-secondary)] mb-5 leading-relaxed">
            Chiffrer un fichier soi-même protège la <span className="text-white">confidentialité</span>,
            mais ne crée aucun <span className="text-white">verrou dans le temps</span> : si tu
            détiens la clé, tu peux ouvrir quand tu veux — et donc on peut aussi t'y forcer.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-[var(--error)]/30 bg-[var(--error)]/5 p-5">
              <p className="text-[13px] font-semibold text-white mb-3">Chiffrement local, seul</p>
              <ul className="space-y-2">
                {[
                  'Tu gardes la clé : aucun vrai blocage temporel, tu peux ouvrir à tout moment.',
                  'On peut te contraindre à déchiffrer (toi = point unique de défaillance).',
                  'Si tu perds la clé, la donnée est perdue pour toujours.',
                  'Aucune preuve de la date : impossible de prouver « avant / après ».',
                ].map((t) => (
                  <li key={t} className="flex gap-2 text-[12.5px] text-[var(--text-secondary)] leading-snug">
                    <X className="w-4 h-4 text-[var(--error)] flex-shrink-0 mt-0.5" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-[var(--success)]/30 bg-[var(--success)]/5 p-5">
              <p className="text-[13px] font-semibold text-white mb-3">Verrou on-chain TimeLock</p>
              <ul className="space-y-2">
                {[
                  'La date est appliquée par un programme impartial — personne ne peut tricher.',
                  'Même toi, même un admin, ne peut ouvrir avant l\'échéance.',
                  'Horodatage public et vérifiable de la création et du déblocage.',
                  'La règle survit à la disparition de l\'entreprise ou du serveur.',
                ].map((t) => (
                  <li key={t} className="flex gap-2 text-[12.5px] text-[var(--text-secondary)] leading-snug">
                    <Check className="w-4 h-4 text-[var(--success)] flex-shrink-0 mt-0.5" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        {/* 4 — Pourquoi une blockchain comme tiers de confiance */}
        <Section n="04" title="Pourquoi une blockchain comme tiers de confiance ?">
          <p className="text-[13px] text-[var(--text-secondary)] mb-5 leading-relaxed">
            Un verrou temporel a besoin d'un <span className="text-white">arbitre</span> qui garde
            la donnée scellée jusqu'à la date. Une entreprise classique peut faire faillite, être
            piratée, ou simplement changer d'avis. Un smart contract, lui, est un arbitre{' '}
            <span className="text-white">neutre, public et inviolable</span>.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { icon: Boxes, title: 'Immuable', desc: 'Une fois publié, le code du contrat ne peut plus être modifié.' },
              { icon: Eye, title: 'Public & vérifiable', desc: 'N\'importe qui peut auditer la règle et constater la date.' },
              { icon: Scale, title: 'Impartial', desc: 'Le contrat exécute sa règle à la lettre, sans favoritisme.' },
              { icon: Network, title: 'Décentralisé', desc: 'Répliqué sur des milliers de nœuds : aucun point de contrôle unique.' },
              { icon: Server, title: 'Disponible 24/7', desc: 'Pas de serveur à maintenir : le réseau tourne en permanence.' },
              { icon: Globe, title: 'Résistant à la censure', desc: 'Personne ne peut bloquer ou saisir le déblocage prévu.' },
            ].map((c) => (
              <div key={c.title} className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass-surface)]/50 p-4">
                <c.icon className="w-5 h-5 text-[var(--cyan-light)] mb-2" strokeWidth={1.75} />
                <p className="text-[13px] font-semibold text-white">{c.title}</p>
                <p className="text-[12px] text-[var(--text-muted)] mt-1 leading-snug">{c.desc}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* 5 — Cas d'usage */}
        <Section n="05" title="Dans quels cas c'est utile ?">
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              {
                icon: Users,
                title: 'Héritage numérique',
                desc: 'Transmettre des documents ou des fonds à un proche à une date donnée, ou s\'ils ne sont pas réclamés avant (« dead-man\'s switch »).',
              },
              {
                icon: PiggyBank,
                title: 'Épargne forcée',
                desc: 'Se bloquer volontairement l\'accès à des fonds pour ne pas les dépenser avant un objectif (achat, projet).',
              },
              {
                icon: Hourglass,
                title: 'Vesting d\'équipe',
                desc: 'Débloquer progressivement la rémunération d\'un associé, d\'un employé ou d\'un investisseur dans le temps.',
              },
              {
                icon: ScrollText,
                title: 'Révélation différée',
                desc: 'Testament numérique, scoop journalistique, ou preuve d\'antériorité d\'une idée révélée à une date précise.',
              },
              {
                icon: Scale,
                title: 'Engagement & paris',
                desc: 'Prouver qu\'on ne touchera pas à une somme avant une échéance — un engagement crédible et public.',
              },
              {
                icon: Lock,
                title: 'Séquestre (escrow) temporel',
                desc: 'Immobiliser une donnée ou des fonds le temps qu\'une condition de délai soit remplie, sans intermédiaire.',
              },
            ].map((c) => (
              <div key={c.title} className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass-surface)]/50 p-4 flex gap-3">
                <div className="w-9 h-9 rounded-md bg-[var(--cyan-light)]/10 border border-[var(--cyan-light)]/20 flex items-center justify-center flex-shrink-0">
                  <c.icon className="w-[18px] h-[18px] text-[var(--cyan-light)]" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-white">{c.title}</p>
                  <p className="text-[12px] text-[var(--text-muted)] mt-1 leading-snug">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Closing note */}
        <div className="mt-8 rounded-lg border border-[var(--cyan-light)]/30 bg-[var(--cyan-light)]/5 p-5 flex gap-3">
          <Clock className="w-5 h-5 text-[var(--cyan-light)] flex-shrink-0 mt-0.5" strokeWidth={1.75} />
          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
            <span className="text-white font-medium">En résumé :</span> TimeLock remplace « fais-moi
            confiance pour respecter la date » par « la date est garantie par un code public et
            inviolable ». C'est ce déplacement de la confiance — d'une personne vers un programme
            vérifiable — qui rend le verrou temporel réellement fiable.
          </p>
        </div>

        {/* CTA */}
        <div className="mt-8 flex flex-wrap items-center gap-3">
          {authReady && isAuthenticated ? (
            <Link href="/dashboard">
              <Button className="glass-button h-10 px-5 text-sm gap-2">
                <LayoutDashboard className="w-4 h-4" />
                Aller au dashboard
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          ) : authReady ? (
            <Link href="/register">
              <Button className="glass-button h-10 px-5 text-sm gap-2">
                Créer un compte
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  Bitcoin,
  Settings,
  LogOut,
  Shield,
  UserCog,
  Rocket,
  BookOpen,
} from 'lucide-react';
import Image from 'next/image';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { ProtectedRoute } from '@/components/protected-route';
import { useAuth } from '@/contexts/auth-context';
import { WalletButton } from '@/components/WalletButton';
import { useAdminAccess } from '@/hooks/use-admin';
import { GlobalUnlockWalletModal } from '@/components/global-unlock-wallet-modal';

type NavItem = { name: string; href: string; icon: React.ElementType };
type NavSection = { label: string; items: NavItem[] };

const baseSections: NavSection[] = [
  {
    label: 'Workspace',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Wallets', href: '/wallets', icon: Wallet },
      { name: 'Explication', href: '/explication', icon: BookOpen },
    ],
  },
  {
    label: 'TimeLocks',
    items: [
      { name: 'Files Blockchain', href: '/files-blockchain', icon: Shield },
      { name: 'TimeLock Crypto', href: '/crypto', icon: Bitcoin },
    ],
  },
  {
    label: 'Compte',
    items: [{ name: 'Paramètres', href: '/settings', icon: Settings }],
  },
];

const adminSection: NavSection = {
  label: 'Administration',
  items: [
    { name: 'Panel admin', href: '/admin', icon: UserCog },
    { name: 'Déploiement', href: '/deploy', icon: Rocket },
  ],
};

function userInitials(email?: string | null): string {
  if (!email) return '?';
  if (email.startsWith('wallet_')) return '0x';
  return email.slice(0, 2).toUpperCase();
}

function shortIdentity(email?: string | null): string {
  if (!email) return 'Anonyme';
  if (email.endsWith('@timelock.local') && email.startsWith('wallet_')) {
    const addr = email.replace(/^wallet_/, '').replace(/@timelock\.local$/, '');
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  }
  return email;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { isAdmin } = useAdminAccess();

  const sections = isAdmin ? [...baseSections, adminSection] : baseSections;

  return (
    <ProtectedRoute>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-[var(--background)] isolate">
          <Sidebar className="bg-[var(--background)] border-r border-[var(--glass-border)]/60">
            {/* Brand */}
            <SidebarHeader className="px-5 pt-5 pb-4 border-b border-[var(--glass-border)]/60">
              <Link href="/" className="flex items-center gap-2.5">
                <Image src="/logo.svg" alt="" width={22} height={22} className="w-[22px] h-[22px]" />
                <span className="text-[15px] font-semibold tracking-tight text-white">TimeLock</span>
                <span className="ml-auto px-1.5 py-0.5 text-[10px] font-medium rounded bg-[var(--glass-surface)] border border-[var(--glass-border)] text-[var(--text-muted)]">
                  beta
                </span>
              </Link>
            </SidebarHeader>

            {/* Sections */}
            <SidebarContent className="px-3 py-4">
              {sections.map((section) => (
                <div key={section.label} className="mb-6 last:mb-0">
                  <p className="px-3 mb-1.5 text-[10px] uppercase tracking-[0.14em] font-medium text-[var(--text-muted)]">
                    {section.label}
                  </p>
                  <ul className="space-y-0.5">
                    {section.items.map((item) => {
                      const active = pathname === item.href;
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className={[
                              'group flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] transition-colors',
                              active
                                ? 'bg-[var(--glass-surface)] text-white font-medium'
                                : 'text-[var(--text-secondary)] hover:text-white hover:bg-[var(--glass-surface)]/60',
                            ].join(' ')}
                          >
                            <item.icon
                              className={[
                                'w-[15px] h-[15px] flex-shrink-0',
                                active ? 'text-[var(--cyan-light)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]',
                              ].join(' ')}
                              strokeWidth={1.75}
                            />
                            <span>{item.name}</span>
                            {active && (
                              <span className="ml-auto w-1 h-1 rounded-full bg-[var(--cyan-light)]" />
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </SidebarContent>

            {/* User block */}
            <SidebarFooter className="p-3 border-t border-[var(--glass-border)]/60">
              <div className="flex items-center gap-2.5 px-2 py-2">
                <div className="w-8 h-8 rounded-full bg-[var(--glass-surface)] border border-[var(--glass-border)] flex items-center justify-center text-[11px] font-medium text-white">
                  {userInitials(user?.email)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-[var(--text-muted)] leading-tight">Connecté</p>
                  <p className="text-[12px] text-white truncate font-mono leading-tight">
                    {shortIdentity(user?.email)}
                  </p>
                </div>
                <button
                  onClick={logout}
                  title="Déconnexion"
                  className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--error)] hover:bg-[var(--error)]/10 transition-colors"
                >
                  <LogOut className="w-[15px] h-[15px]" strokeWidth={1.75} />
                </button>
              </div>
            </SidebarFooter>
          </Sidebar>

          <main className="flex-1 overflow-auto">
            {/* Top bar */}
            <div className="border-b border-[var(--glass-border)]/60 bg-[var(--background)] sticky top-0 z-40">
              <div className="px-6 md:px-8 lg:px-10 h-14 flex items-center justify-end gap-3">
                <WalletButton />
              </div>
            </div>

            <div className="px-6 md:px-8 lg:px-10 py-8">{children}</div>
          </main>
        </div>
        <GlobalUnlockWalletModal />
      </SidebarProvider>
    </ProtectedRoute>
  );
}

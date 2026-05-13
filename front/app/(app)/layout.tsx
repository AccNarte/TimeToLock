"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Wallet, Bitcoin, Settings, Lock, Clock, LogOut, Shield, UserCog } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { ProtectedRoute } from '@/components/protected-route';
import { useAuth } from '@/contexts/auth-context';
import { WalletButton } from '@/components/WalletButton';
import { useAdminAccess } from '@/hooks/use-admin';
import { GlobalUnlockWalletModal } from '@/components/global-unlock-wallet-modal';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Wallets', href: '/wallets', icon: Wallet },
  { name: 'Files Blockchain', href: '/files-blockchain', icon: Shield },
  { name: 'TimeLock Crypto', href: '/crypto', icon: Bitcoin },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { isAdmin } = useAdminAccess();

  // Build navigation with conditional admin item
  const fullNavigation = [
    ...navigation,
    ...(isAdmin ? [{ name: 'Administration', href: '/admin', icon: UserCog }] : []),
  ];

  return (
    <ProtectedRoute>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background isolate">
          <Sidebar className="glass-card border-r border-glass-border">
            <SidebarHeader className="p-6 border-b border-glass-border">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Lock className="w-8 h-8 text-cyan-neon" />
                  <Clock className="w-5 h-5 text-cyan-neon absolute -bottom-1 -right-1" />
                </div>
                <span className="text-xl font-bold text-white">TimeLock</span>
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarMenu className="p-4 space-y-2">
                {fullNavigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className={`
                          w-full justify-start gap-3 px-4 py-3 rounded-lg transition-all duration-200
                          ${isActive 
                            ? 'bg-cyan-neon/10 text-cyan-neon border border-cyan-neon/30' 
                            : 'text-text-secondary hover:text-white hover:bg-glass-surface/50'
                          }
                        `}
                      >
                        <Link href={item.href}>
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium">{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarContent>
            <SidebarFooter className="p-4 border-t border-glass-border">
              <div className="space-y-3">
                {user && (
                  <div className="px-4 py-2">
                    <p className="text-xs text-text-muted">Connecté en tant que</p>
                    <p className="text-sm text-white truncate">{user.email}</p>
                  </div>
                )}
                <Button
                  onClick={logout}
                  variant="ghost"
                  className="w-full justify-start gap-3 px-4 py-3 text-text-secondary hover:text-error hover:bg-error/10"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Déconnexion</span>
                </Button>
              </div>
            </SidebarFooter>
          </Sidebar>

          <main className="flex-1 overflow-auto">
            {/* Top Bar with Wallet */}
            <div className="border-b border-glass-border bg-glass-surface/30 backdrop-blur-sm sticky top-0 z-50">
              <div className="container mx-auto px-6 md:px-8 lg:px-10 py-4 flex justify-end relative z-50">
                <WalletButton />
              </div>
            </div>
            <div className="container mx-auto p-6 md:p-8 lg:p-10">
              {children}
            </div>
          </main>
        </div>
        <GlobalUnlockWalletModal />
      </SidebarProvider>
    </ProtectedRoute>
  );
}

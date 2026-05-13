"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Shield,
  Wallet,
  FileText,
  Bitcoin,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  Loader2,
  TrendingUp,
  Calendar,
  HardDrive,
  Mail,
  Key,
  UserCog,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAdminAccess, useAdminStats, useAdminUsers, useAdminRoles } from '@/hooks/use-admin';
import { formatFileSize, formatShortDate } from '@/lib/formatters';
import { toast } from 'sonner';

export default function AdminPage() {
  const router = useRouter();
  const { isAdmin, isLoading: accessLoading } = useAdminAccess();
  const { stats, isLoading: statsLoading, refetch: refetchStats } = useAdminStats();
  const { users, isLoading: usersLoading, refetch: refetchUsers, setUserRole } = useAdminUsers();
  const { roles } = useAdminRoles();
  const [changingRoleFor, setChangingRoleFor] = useState<number | null>(null);

  useEffect(() => {
    if (!accessLoading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [accessLoading, isAdmin, router]);

  const handleRoleChange = async (userId: number, newRole: string) => {
    setChangingRoleFor(userId);
    try {
      await setUserRole(userId, newRole);
      toast.success('Role modifie avec succes');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setChangingRoleFor(null);
    }
  };

  const handleRefresh = () => {
    refetchStats();
    refetchUsers();
    toast.success('Donnees actualisees');
  };

  if (accessLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-cyan-neon animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-1 text-white mb-2">Panel Administrateur</h1>
          <p className="text-text-secondary text-body">
            Vue d'ensemble du systeme et gestion des utilisateurs
          </p>
        </div>
        <Button onClick={handleRefresh} className="glass-button gap-2">
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </Button>
      </div>

      {statsLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 text-cyan-neon animate-spin" />
        </div>
      ) : stats ? (
        <>
          {/* Users Stats */}
          <div>
            <h2 className="text-heading-3 text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-neon" />
              Utilisateurs
            </h2>
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="glass-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-text-secondary">
                    Total inscrits
                  </CardTitle>
                  <Users className="w-5 h-5 text-cyan-neon" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{stats.users.total}</div>
                  <p className="text-xs text-text-muted mt-1">
                    +{stats.users.newThisMonth} ce mois
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-text-secondary">
                    Auth Email/MDP
                  </CardTitle>
                  <Mail className="w-5 h-5 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{stats.users.passwordAuthPercent}%</div>
                  <p className="text-xs text-text-muted mt-1">
                    {stats.users.passwordAuth} utilisateurs
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-text-secondary">
                    Auth Wallet
                  </CardTitle>
                  <Key className="w-5 h-5 text-warning" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{stats.users.walletAuthPercent}%</div>
                  <p className="text-xs text-text-muted mt-1">
                    {stats.users.walletAuth} utilisateurs
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-text-secondary">
                    Nouveaux (7j)
                  </CardTitle>
                  <TrendingUp className="w-5 h-5 text-cyan-neon" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{stats.users.newThisWeek}</div>
                  <p className="text-xs text-text-muted mt-1">
                    {stats.users.verifiedEmail} emails verifies
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Crypto & Files Stats */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Crypto Locks */}
            <div>
              <h2 className="text-heading-3 text-white mb-4 flex items-center gap-2">
                <Bitcoin className="w-5 h-5 text-warning" />
                Crypto TimeLocks
              </h2>
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 rounded-lg bg-glass-surface/30">
                      <div className="text-2xl font-bold text-white">{stats.cryptoLocks.total}</div>
                      <p className="text-xs text-text-muted">Total</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-error/10">
                      <div className="text-2xl font-bold text-error">{stats.cryptoLocks.locked}</div>
                      <p className="text-xs text-text-muted">Verrouilles</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-warning/10">
                      <div className="text-2xl font-bold text-warning">{stats.cryptoLocks.unlockable}</div>
                      <p className="text-xs text-text-muted">Deverrouillables</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-success/10">
                      <div className="text-2xl font-bold text-success">{stats.cryptoLocks.withdrawn}</div>
                      <p className="text-xs text-text-muted">Retires</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* File Locks (Blockchain) */}
            <div>
              <h2 className="text-heading-3 text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-neon" />
                Files Blockchain
              </h2>
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 rounded-lg bg-glass-surface/30">
                      <div className="text-2xl font-bold text-white">{stats.fileLocks.total}</div>
                      <p className="text-xs text-text-muted">Total</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-cyan-neon/10">
                      <div className="text-2xl font-bold text-cyan-neon">{formatFileSize(stats.fileLocks.totalSizeBytes)}</div>
                      <p className="text-xs text-text-muted">Stockage</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-error/10">
                      <div className="text-2xl font-bold text-error">{stats.fileLocks.locked}</div>
                      <p className="text-xs text-text-muted">Verrouilles</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-success/10">
                      <div className="text-2xl font-bold text-success">{stats.fileLocks.unlocked}</div>
                      <p className="text-xs text-text-muted">Deverrouilles</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Wallets Stats */}
          <div>
            <h2 className="text-heading-3 text-white mb-4 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-success" />
              Wallets
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="glass-card">
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-white">{stats.wallets.total}</div>
                  <p className="text-sm text-text-muted">Total wallets</p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-cyan-neon">{stats.wallets.internal}</div>
                  <p className="text-sm text-text-muted">Wallets internes</p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-warning">{stats.wallets.external}</div>
                  <p className="text-sm text-text-muted">Wallets externes</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      ) : null}

      {/* Users Table */}
      <div>
        <h2 className="text-heading-3 text-white mb-4 flex items-center gap-2">
          <UserCog className="w-5 h-5 text-cyan-neon" />
          Liste des utilisateurs
        </h2>
        <Card className="glass-card">
          <CardContent className="pt-6">
            {usersLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 text-cyan-neon animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <p className="text-text-muted text-center py-8">
                Aucun utilisateur trouve
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-glass-border hover:bg-transparent">
                    <TableHead className="text-text-secondary">ID</TableHead>
                    <TableHead className="text-text-secondary">Email</TableHead>
                    <TableHead className="text-text-secondary">Auth</TableHead>
                    <TableHead className="text-text-secondary">Email verifie</TableHead>
                    <TableHead className="text-text-secondary">Role</TableHead>
                    <TableHead className="text-text-secondary">Wallets</TableHead>
                    <TableHead className="text-text-secondary">Crypto Locks</TableHead>
                    <TableHead className="text-text-secondary">File Locks</TableHead>
                    <TableHead className="text-text-secondary">Inscription</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow
                      key={user.id}
                      className="border-glass-border hover:bg-glass-surface/30"
                    >
                      <TableCell className="text-text-muted">#{user.id}</TableCell>
                      <TableCell className="text-white">
                        {user.email || <span className="text-text-muted italic">Pas d'email</span>}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            user.loginMethod === 'wallet'
                              ? 'bg-warning/20 text-warning border-warning/30'
                              : 'bg-success/20 text-success border-success/30'
                          }
                        >
                          {user.loginMethod === 'wallet' ? 'Wallet' : 'Email/MDP'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.isEmailVerified ? (
                          <CheckCircle className="w-4 h-4 text-success" />
                        ) : (
                          <XCircle className="w-4 h-4 text-error" />
                        )}
                      </TableCell>
                      <TableCell>
                        {changingRoleFor === user.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Select
                            value={user.roleName || 'user'}
                            onValueChange={(value) => handleRoleChange(user.id, value)}
                          >
                            <SelectTrigger className="w-32 h-8 bg-glass-surface border-glass-border text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-glass-surface border-glass-border">
                              {roles.map((role) => (
                                <SelectItem key={role.id} value={role.name}>
                                  {role.name}
                                </SelectItem>
                              ))}
                              {roles.length === 0 && (
                                <SelectItem value="user">user</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell className="text-text-secondary">{user.walletsCount}</TableCell>
                      <TableCell className="text-text-secondary">{user.cryptoLocksCount}</TableCell>
                      <TableCell className="text-text-secondary">{user.fileLocksCount}</TableCell>
                      <TableCell className="text-text-muted text-sm">
                        {formatShortDate(new Date(user.createdAt))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

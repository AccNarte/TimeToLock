"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Shield,
  Wallet,
  Bitcoin,
  CheckCircle,
  XCircle,
  Loader2,
  UserCog,
  RefreshCw,
  Pencil,
  Check as CheckIcon,
  X as XIcon,
  Trash2,
  Search,
  Download,
  Ban,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Activity,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useAdminAccess, useAdminStats, useAdminUsers, useAdminRoles, useAdminAudit } from '@/hooks/use-admin';
import { formatFileSize, formatShortDate } from '@/lib/formatters';
import { toast } from 'sonner';
import { AdminChallengeModal, type AdminChallenge } from '@/components/AdminChallengeModal';

// Libellés FR + couleur des actions du journal d'audit.
const AUDIT_ACTION_LABELS: Record<string, string> = {
  USER_REGISTERED: 'Inscription',
  USER_LOGIN: 'Connexion',
  WALLET_LOGIN: 'Connexion wallet',
  USER_BANNED: 'Compte suspendu',
  USER_RESTORED: 'Compte réactivé',
  ROLE_CHANGED: 'Rôle modifié',
  EMAIL_CHANGED: 'Email modifié',
  PASSWORD_RESET: 'Mot de passe réinitialisé',
  USER_DELETED: 'Compte supprimé',
  CRYPTO_LOCK_CREATED: 'Lock crypto créé',
  CRYPTO_LOCK_WITHDRAWN: 'Lock crypto retiré',
  FILE_LOCK_CREATED: 'Fichier verrouillé',
};
const AUDIT_ENTITY_LABELS: Record<string, string> = {
  USER: 'Utilisateur',
  CRYPTO_LOCK: 'Crypto',
  FILE_LOCK: 'Fichier',
};
const auditActionTone = (action: string | null): string => {
  switch (action) {
    case 'USER_BANNED':
    case 'USER_DELETED':
      return 'border-[var(--error)]/30 text-[var(--error)] bg-[var(--error)]/10';
    case 'USER_RESTORED':
    case 'CRYPTO_LOCK_WITHDRAWN':
      return 'border-[var(--success)]/30 text-[var(--success)] bg-[var(--success)]/10';
    case 'ROLE_CHANGED':
    case 'EMAIL_CHANGED':
    case 'PASSWORD_RESET':
      return 'border-[var(--warning)]/30 text-[var(--warning)] bg-[var(--warning)]/10';
    default:
      return 'border-[var(--cyan-light)]/30 text-[var(--cyan-light)] bg-[var(--cyan-light)]/10';
  }
};

export default function AdminPage() {
  const router = useRouter();
  const { isAdmin, isLoading: accessLoading } = useAdminAccess();
  const { stats, isLoading: statsLoading, refetch: refetchStats } = useAdminStats();
  const {
    users,
    total,
    totalPages,
    isLoading: usersLoading,
    params,
    setParams,
    refetch: refetchUsers,
    setUserRole,
    setUserEmail,
    setUserPassword,
    deleteUser,
    banUser,
    restoreUser,
    exportCsv,
  } = useAdminUsers();
  const { roles } = useAdminRoles();
  const {
    items: auditLogs,
    total: auditTotal,
    totalPages: auditTotalPages,
    isLoading: auditLoading,
    params: auditParams,
    setParams: setAuditParams,
  } = useAdminAudit();
  const [changingRoleFor, setChangingRoleFor] = useState<number | null>(null);
  const [pendingRoleChange, setPendingRoleChange] = useState<{
    userId: number;
    userEmail: string | null;
    newRole: string;
  } | null>(null);
  const [pendingDeletion, setPendingDeletion] = useState<{
    userId: number;
    userEmail: string | null;
  } | null>(null);
  const [pendingBan, setPendingBan] = useState<{
    userId: number;
    userEmail: string | null;
  } | null>(null);
  const [banReason, setBanReason] = useState('');
  const [pendingPasswordReset, setPendingPasswordReset] = useState<{
    userId: number;
    userEmail: string | null;
  } | null>(null);
  const [passwordDraft, setPasswordDraft] = useState('');
  const [restoringFor, setRestoringFor] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [editingEmailFor, setEditingEmailFor] = useState<number | null>(null);
  const [emailDraft, setEmailDraft] = useState('');
  const [savingEmailFor, setSavingEmailFor] = useState<number | null>(null);

  // Debounced search: type freely, fire the query 350ms after the last keypress.
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== (params.q ?? '')) setParams({ q: searchInput });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // Click a column header to sort; click again to flip direction.
  const toggleSort = (col: 'id' | 'email' | 'createdAt' | 'status') => {
    if (params.sort === col) {
      setParams({ order: params.order === 'ASC' ? 'DESC' : 'ASC' });
    } else {
      setParams({ sort: col, order: 'ASC' });
    }
  };

  const handleRestore = async (userId: number) => {
    setRestoringFor(userId);
    try {
      await restoreUser(userId);
      toast.success(`Compte #${userId} réactivé`);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la restauration');
    } finally {
      setRestoringFor(null);
    }
  };

  const confirmBan = async (challenge: AdminChallenge) => {
    if (!pendingBan) return;
    try {
      await banUser(pendingBan.userId, banReason || undefined, challenge);
      toast.success(`Compte #${pendingBan.userId} suspendu`);
      setPendingBan(null);
      setBanReason('');
    } catch (err: any) {
      throw err;
    }
  };

  const confirmPasswordReset = async (challenge: AdminChallenge) => {
    if (!pendingPasswordReset) return;
    if (passwordDraft.length < 8) {
      throw new Error('Le mot de passe doit faire au moins 8 caractères');
    }
    try {
      await setUserPassword(pendingPasswordReset.userId, passwordDraft, challenge);
      toast.success(`Mot de passe du compte #${pendingPasswordReset.userId} réinitialisé`);
      setPendingPasswordReset(null);
      setPasswordDraft('');
    } catch (err: any) {
      throw err;
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportCsv();
      toast.success('Export CSV généré');
    } catch {
      toast.error("Erreur lors de l'export");
    } finally {
      setExporting(false);
    }
  };

  const startEmailEdit = (userId: number, currentEmail: string | null) => {
    setEditingEmailFor(userId);
    setEmailDraft(currentEmail ?? '');
  };

  const cancelEmailEdit = () => {
    setEditingEmailFor(null);
    setEmailDraft('');
  };

  const handleEmailSave = async (userId: number, currentEmail: string | null) => {
    const next = emailDraft.trim();
    if (!next || next === (currentEmail ?? '').trim()) {
      cancelEmailEdit();
      return;
    }
    setSavingEmailFor(userId);
    try {
      await setUserEmail(userId, next);
      toast.success('Email mis à jour. L\'utilisateur devra re-vérifier cette adresse.');
      cancelEmailEdit();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setSavingEmailFor(null);
    }
  };

  useEffect(() => {
    if (!accessLoading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [accessLoading, isAdmin, router]);

  const handleRoleChange = (userId: number, userEmail: string | null, newRole: string) => {
    // Open the challenge modal — the actual mutation happens after confirmation.
    setPendingRoleChange({ userId, userEmail, newRole });
  };

  const confirmRoleChange = async (challenge: AdminChallenge) => {
    if (!pendingRoleChange) return;
    setChangingRoleFor(pendingRoleChange.userId);
    try {
      await setUserRole(pendingRoleChange.userId, pendingRoleChange.newRole, challenge);
      toast.success('Role modifie avec succes');
      setPendingRoleChange(null);
    } catch (err: any) {
      // Re-throw so the modal shows the error inline.
      throw err;
    } finally {
      setChangingRoleFor(null);
    }
  };

  const confirmDeletion = async (challenge: AdminChallenge) => {
    if (!pendingDeletion) return;
    try {
      await deleteUser(pendingDeletion.userId, challenge);
      toast.success(`Compte #${pendingDeletion.userId} supprimé`);
      setPendingDeletion(null);
    } catch (err: any) {
      throw err;
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
        <Loader2 className="w-5 h-5 text-[var(--text-muted)] animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  // Helper to render one metric inside a flat band — no card chrome.
  const Metric = ({
    label,
    value,
    sub,
    tone,
  }: {
    label: string;
    value: React.ReactNode;
    sub?: string;
    tone?: 'default' | 'success' | 'warning' | 'error';
  }) => {
    const toneColor =
      tone === 'success'
        ? 'text-[var(--success)]'
        : tone === 'warning'
        ? 'text-[var(--warning)]'
        : tone === 'error'
        ? 'text-[var(--error)]'
        : 'text-white';
    return (
      <div className="border-l border-[var(--glass-border)]/80 pl-4">
        <p className="text-[10px] uppercase tracking-[0.14em] font-medium text-[var(--text-muted)] mb-1">
          {label}
        </p>
        <p className={`text-xl font-semibold font-mono tracking-tight ${toneColor}`}>{value}</p>
        {sub && <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{sub}</p>}
      </div>
    );
  };

  // Each domain section: a sticky-style label + flat metrics row, no card.
  const Section = ({
    label,
    title,
    icon: Icon,
    children,
  }: {
    label: string;
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
  }) => (
    <section className="py-7 border-b border-[var(--glass-border)]/60 last:border-0">
      <div className="grid lg:grid-cols-[200px_1fr] gap-6 items-start">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] font-medium text-[var(--text-muted)] mb-2">
            {label}
          </p>
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-[var(--cyan-light)]" strokeWidth={1.75} />
            <h2 className="text-base font-semibold text-white tracking-tight">{title}</h2>
          </div>
        </div>
        <div>{children}</div>
      </div>
    </section>
  );

  return (
    <div className="max-w-7xl mx-auto">
      {/* ─── Header ─── */}
      <div className="flex items-end justify-between mb-10 pb-6 border-b border-[var(--glass-border)]/60">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] font-medium text-[var(--text-muted)] mb-2">
            Administration
          </p>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Panel</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1.5">
            Vue d'ensemble du système et gestion des utilisateurs.
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm" className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />
          Actualiser
        </Button>
      </div>

      {/* ─── Sections ─── */}
      {statsLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-5 h-5 text-[var(--text-muted)] animate-spin" />
        </div>
      ) : stats ? (
        <div>
          <Section label="01" title="Utilisateurs" icon={Users}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-5 gap-x-6">
              <Metric
                label="Total inscrits"
                value={stats.users.total}
                sub={`+${stats.users.newThisMonth} ce mois`}
              />
              <Metric
                label="Actifs"
                value={stats.users.active}
                sub={`${stats.users.banned} suspendu${stats.users.banned > 1 ? 's' : ''}`}
                tone={stats.users.banned > 0 ? 'warning' : 'success'}
              />
              <Metric
                label="Auth Email / Wallet"
                value={`${stats.users.passwordAuth} / ${stats.users.walletAuth}`}
                sub={`${stats.users.passwordAuthPercent}% / ${stats.users.walletAuthPercent}%`}
              />
              <Metric
                label="7 derniers jours"
                value={stats.users.newThisWeek}
                sub={`${stats.users.verifiedEmail} emails vérifiés`}
              />
            </div>
          </Section>

          <Section label="02" title="Crypto TimeLocks" icon={Bitcoin}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-5 gap-x-6">
              <Metric label="Total" value={stats.cryptoLocks.total} />
              <Metric label="Verrouillés" value={stats.cryptoLocks.locked} tone="error" />
              <Metric label="Déverrouillables" value={stats.cryptoLocks.unlockable} tone="warning" />
              <Metric label="Retirés" value={stats.cryptoLocks.withdrawn} tone="success" />
            </div>
          </Section>

          <Section label="03" title="Files Blockchain" icon={Shield}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-5 gap-x-6">
              <Metric label="Total" value={stats.fileLocks.total} />
              <Metric label="Stockage" value={formatFileSize(stats.fileLocks.totalSizeBytes)} />
              <Metric label="Verrouillés" value={stats.fileLocks.locked} tone="error" />
              <Metric label="Déverrouillés" value={stats.fileLocks.unlocked} tone="success" />
            </div>
          </Section>

          <Section label="04" title="Wallets" icon={Wallet}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-5 gap-x-6">
              <Metric label="Total" value={stats.wallets.total} />
              <Metric label="Internes (embarqués)" value={stats.wallets.internal} />
              <Metric label="Externes (liés)" value={stats.wallets.external} />
            </div>
          </Section>
        </div>
      ) : null}

      {/* ─── Users management (advanced CRUD) ─── */}
      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <UserCog className="w-4 h-4 text-[var(--cyan-light)]" strokeWidth={1.75} />
            <h2 className="text-base font-semibold text-white tracking-tight">Utilisateurs</h2>
            <span className="text-[12px] text-[var(--text-muted)] ml-1.5">({total})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Rechercher un email…"
                className="h-8 w-56 pl-8 text-[12px]"
              />
            </div>
            <Button
              onClick={handleExport}
              variant="outline"
              size="sm"
              disabled={exporting || total === 0}
              className="gap-1.5"
            >
              {exporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Select value={params.status} onValueChange={(v) => setParams({ status: v as any })}>
            <SelectTrigger className="w-32 h-8 text-[12px] bg-transparent border-[var(--glass-border)]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tout statut</SelectItem>
              <SelectItem value="active">Actifs</SelectItem>
              <SelectItem value="banned">Suspendus</SelectItem>
            </SelectContent>
          </Select>

          <Select value={params.auth} onValueChange={(v) => setParams({ auth: v as any })}>
            <SelectTrigger className="w-32 h-8 text-[12px] bg-transparent border-[var(--glass-border)]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toute auth</SelectItem>
              <SelectItem value="password">Email</SelectItem>
              <SelectItem value="wallet">Wallet</SelectItem>
            </SelectContent>
          </Select>

          <Select value={params.verified} onValueChange={(v) => setParams({ verified: v as any })}>
            <SelectTrigger className="w-36 h-8 text-[12px] bg-transparent border-[var(--glass-border)]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Email : tous</SelectItem>
              <SelectItem value="true">Vérifié</SelectItem>
              <SelectItem value="false">Non vérifié</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={params.role || 'all'}
            onValueChange={(v) => setParams({ role: v === 'all' ? '' : v })}
          >
            <SelectTrigger className="w-32 h-8 text-[12px] bg-transparent border-[var(--glass-border)]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tout rôle</SelectItem>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.name}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(!!params.q ||
            !!params.role ||
            params.status !== 'all' ||
            params.auth !== 'all' ||
            params.verified !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-[12px] text-[var(--text-muted)] hover:text-white"
              onClick={() => {
                setSearchInput('');
                setParams({ q: '', role: '', status: 'all', auth: 'all', verified: 'all' });
              }}
            >
              <XIcon className="w-3.5 h-3.5 mr-1" />
              Réinitialiser
            </Button>
          )}
        </div>

        <div className="rounded-lg border border-[var(--glass-border)]/80 overflow-hidden">
          {usersLoading ? (
            <div className="flex items-center justify-center h-32 bg-[var(--glass-surface)]/30">
              <Loader2 className="w-5 h-5 text-[var(--text-muted)] animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-[var(--text-muted)] text-center py-12 text-sm bg-[var(--glass-surface)]/30">
              Aucun utilisateur trouvé
            </p>
          ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[var(--glass-border)]/80 hover:bg-transparent bg-[var(--glass-surface)]/30">
                    <TableHead
                      onClick={() => toggleSort('id')}
                      className="text-[10px] uppercase tracking-[0.14em] font-medium text-[var(--text-muted)] h-9 cursor-pointer select-none hover:text-white"
                    >
                      <span className="inline-flex items-center gap-1">
                        ID
                        {params.sort === 'id' &&
                          (params.order === 'ASC' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                      </span>
                    </TableHead>
                    <TableHead
                      onClick={() => toggleSort('email')}
                      className="text-[10px] uppercase tracking-[0.14em] font-medium text-[var(--text-muted)] h-9 cursor-pointer select-none hover:text-white"
                    >
                      <span className="inline-flex items-center gap-1">
                        Email
                        {params.sort === 'email' &&
                          (params.order === 'ASC' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                      </span>
                    </TableHead>
                    <TableHead className="text-[10px] uppercase tracking-[0.14em] font-medium text-[var(--text-muted)] h-9">Auth</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-[0.14em] font-medium text-[var(--text-muted)] h-9">Vérifié</TableHead>
                    <TableHead
                      onClick={() => toggleSort('status')}
                      className="text-[10px] uppercase tracking-[0.14em] font-medium text-[var(--text-muted)] h-9 cursor-pointer select-none hover:text-white"
                    >
                      <span className="inline-flex items-center gap-1">
                        Statut
                        {params.sort === 'status' &&
                          (params.order === 'ASC' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                      </span>
                    </TableHead>
                    <TableHead className="text-[10px] uppercase tracking-[0.14em] font-medium text-[var(--text-muted)] h-9">Rôle</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-[0.14em] font-medium text-[var(--text-muted)] h-9 text-right">Wallets</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-[0.14em] font-medium text-[var(--text-muted)] h-9 text-right">Crypto</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-[0.14em] font-medium text-[var(--text-muted)] h-9 text-right">Files</TableHead>
                    <TableHead
                      onClick={() => toggleSort('createdAt')}
                      className="text-[10px] uppercase tracking-[0.14em] font-medium text-[var(--text-muted)] h-9 cursor-pointer select-none hover:text-white"
                    >
                      <span className="inline-flex items-center gap-1">
                        Inscription
                        {params.sort === 'createdAt' &&
                          (params.order === 'ASC' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                      </span>
                    </TableHead>
                    <TableHead className="text-[10px] uppercase tracking-[0.14em] font-medium text-[var(--text-muted)] h-9 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow
                      key={user.id}
                      className={`border-b border-[var(--glass-border)]/40 last:border-0 hover:bg-[var(--glass-surface)]/40 transition-colors ${user.status === 'banned' ? 'opacity-60' : ''}`}
                    >
                      <TableCell className="text-[var(--text-muted)] font-mono text-[12px]">#{user.id}</TableCell>
                      <TableCell className="text-white text-[13px]">
                        {editingEmailFor === user.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={emailDraft}
                              onChange={(e) => setEmailDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleEmailSave(user.id, user.email);
                                if (e.key === 'Escape') cancelEmailEdit();
                              }}
                              autoFocus
                              disabled={savingEmailFor === user.id}
                              className="h-7 w-64 text-[12px]"
                              placeholder="nouveau@email.com"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEmailSave(user.id, user.email)}
                              disabled={savingEmailFor === user.id}
                              className="h-7 w-7 p-0 text-[var(--success)] hover:text-[var(--success)] hover:bg-[var(--success)]/10"
                              title="Sauvegarder"
                            >
                              {savingEmailFor === user.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckIcon className="w-3.5 h-3.5" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={cancelEmailEdit}
                              disabled={savingEmailFor === user.id}
                              className="h-7 w-7 p-0 text-[var(--text-muted)] hover:text-[var(--error)] hover:bg-[var(--error)]/10"
                              title="Annuler"
                            >
                              <XIcon className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group">
                            <span className="font-mono text-[12px] text-[var(--text-secondary)]">
                              {user.email || <span className="text-[var(--text-muted)] italic">Pas d'email</span>}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEmailEdit(user.id, user.email)}
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--cyan-light)] transition-opacity"
                              title="Modifier l'email"
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={user.loginMethod === 'wallet' ? 'outline' : 'secondary'}
                          className={
                            user.loginMethod === 'wallet'
                              ? 'border-[var(--warning)]/30 text-[var(--warning)] bg-[var(--warning)]/10'
                              : 'border-[var(--success)]/30 text-[var(--success)] bg-[var(--success)]/10'
                          }
                        >
                          {user.loginMethod === 'wallet' ? 'Wallet' : 'Email'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.isEmailVerified ? (
                          <CheckCircle className="w-3.5 h-3.5 text-[var(--success)]" strokeWidth={2} />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-[var(--text-muted)]" strokeWidth={2} />
                        )}
                      </TableCell>
                      <TableCell>
                        {user.status === 'banned' ? (
                          <Badge
                            className="border-[var(--error)]/30 text-[var(--error)] bg-[var(--error)]/10"
                            title={user.bannedAt ? `Suspendu le ${formatShortDate(new Date(user.bannedAt))}` : 'Suspendu'}
                          >
                            Suspendu
                          </Badge>
                        ) : (
                          <Badge className="border-[var(--success)]/30 text-[var(--success)] bg-[var(--success)]/10">
                            Actif
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {changingRoleFor === user.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--text-muted)]" />
                        ) : (
                          <Select
                            value={user.roleName || 'user'}
                            onValueChange={(value) => handleRoleChange(user.id, user.email, value)}
                          >
                            <SelectTrigger className="w-28 h-7 text-[12px] bg-transparent border-[var(--glass-border)]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
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
                      <TableCell className="text-[var(--text-secondary)] font-mono text-[12px] text-right">{user.walletsCount}</TableCell>
                      <TableCell className="text-[var(--text-secondary)] font-mono text-[12px] text-right">{user.cryptoLocksCount}</TableCell>
                      <TableCell className="text-[var(--text-secondary)] font-mono text-[12px] text-right">{user.fileLocksCount}</TableCell>
                      <TableCell className="text-[var(--text-muted)] text-[12px] whitespace-nowrap">
                        {formatShortDate(new Date(user.createdAt))}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {user.loginMethod !== 'wallet' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setPasswordDraft('');
                                setPendingPasswordReset({ userId: user.id, userEmail: user.email });
                              }}
                              className="h-7 w-7 p-0 text-[var(--text-muted)] hover:text-[var(--cyan-light)] hover:bg-[var(--cyan-light)]/10"
                              title="Réinitialiser le mot de passe"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {user.status === 'active' ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setBanReason('');
                                setPendingBan({ userId: user.id, userEmail: user.email });
                              }}
                              className="h-7 w-7 p-0 text-[var(--text-muted)] hover:text-[var(--warning)] hover:bg-[var(--warning)]/10"
                              title="Suspendre le compte"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={restoringFor === user.id}
                              onClick={() => handleRestore(user.id)}
                              className="h-7 w-7 p-0 text-[var(--text-muted)] hover:text-[var(--success)] hover:bg-[var(--success)]/10"
                              title="Réactiver le compte"
                            >
                              {restoringFor === user.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <RotateCcw className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setPendingDeletion({ userId: user.id, userEmail: user.email })}
                            className="h-7 w-7 p-0 text-[var(--text-muted)] hover:text-[var(--error)] hover:bg-[var(--error)]/10"
                            title="Supprimer définitivement"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
            <div className="flex items-center gap-2 text-[12px] text-[var(--text-muted)]">
              <span>Lignes par page</span>
              <Select
                value={String(params.limit ?? 10)}
                onValueChange={(v) => setParams({ limit: parseInt(v, 10), page: 1 })}
              >
                <SelectTrigger className="w-16 h-7 text-[12px] bg-transparent border-[var(--glass-border)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 25, 50].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 text-[12px] text-[var(--text-secondary)]">
              <span>
                Page <span className="font-mono text-white">{params.page}</span> / {totalPages}
                <span className="text-[var(--text-muted)]"> — {total} résultat{total > 1 ? 's' : ''}</span>
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={(params.page ?? 1) <= 1 || usersLoading}
                  onClick={() => setParams({ page: (params.page ?? 1) - 1 })}
                  className="h-7 w-7 p-0"
                  title="Page précédente"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={(params.page ?? 1) >= totalPages || usersLoading}
                  onClick={() => setParams({ page: (params.page ?? 1) + 1 })}
                  className="h-7 w-7 p-0"
                  title="Page suivante"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </section>

      {/* ─── Journal d'activité (audit) ─── */}
      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[var(--cyan-light)]" strokeWidth={1.75} />
            <h2 className="text-base font-semibold text-white tracking-tight">Journal d'activité</h2>
            <span className="text-[12px] text-[var(--text-muted)] ml-1.5">({auditTotal})</span>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={auditParams.action || 'all'}
              onValueChange={(v) => setAuditParams({ action: v === 'all' ? '' : v })}
            >
              <SelectTrigger className="w-48 h-8 text-[12px] bg-transparent border-[var(--glass-border)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les actions</SelectItem>
                {Object.entries(AUDIT_ACTION_LABELS).map(([k, l]) => (
                  <SelectItem key={k} value={k}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={auditParams.entityType || 'all'}
              onValueChange={(v) => setAuditParams({ entityType: v === 'all' ? '' : v })}
            >
              <SelectTrigger className="w-32 h-8 text-[12px] bg-transparent border-[var(--glass-border)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toute entité</SelectItem>
                {Object.entries(AUDIT_ENTITY_LABELS).map(([k, l]) => (
                  <SelectItem key={k} value={k}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-lg border border-[var(--glass-border)]/80 overflow-hidden">
          {auditLoading ? (
            <div className="flex items-center justify-center h-32 bg-[var(--glass-surface)]/30">
              <Loader2 className="w-5 h-5 text-[var(--text-muted)] animate-spin" />
            </div>
          ) : auditLogs.length === 0 ? (
            <p className="text-[var(--text-muted)] text-center py-12 text-sm bg-[var(--glass-surface)]/30">
              Aucune activité enregistrée
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[var(--glass-border)]/80 hover:bg-transparent bg-[var(--glass-surface)]/30">
                  <TableHead className="text-[10px] uppercase tracking-[0.14em] font-medium text-[var(--text-muted)] h-9">Date</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-[0.14em] font-medium text-[var(--text-muted)] h-9">Utilisateur</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-[0.14em] font-medium text-[var(--text-muted)] h-9">Action</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-[0.14em] font-medium text-[var(--text-muted)] h-9">Entité</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-[0.14em] font-medium text-[var(--text-muted)] h-9">Détails</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log) => {
                  const actor = log.userEmail
                    ? log.userEmail.endsWith('@timelock.local')
                      ? `${log.walletAddress?.slice(0, 6) ?? 'wallet'}…${log.walletAddress?.slice(-4) ?? ''}`
                      : log.userEmail
                    : log.walletAddress
                    ? `${log.walletAddress.slice(0, 6)}…${log.walletAddress.slice(-4)}`
                    : 'Système';
                  const details = log.metadataJson ? JSON.stringify(log.metadataJson) : '—';
                  return (
                    <TableRow
                      key={log.id}
                      className="border-b border-[var(--glass-border)]/40 last:border-0 hover:bg-[var(--glass-surface)]/40 transition-colors"
                    >
                      <TableCell className="text-[var(--text-muted)] text-[12px] whitespace-nowrap">
                        {formatShortDate(new Date(log.createdAt))}
                      </TableCell>
                      <TableCell className="text-[var(--text-secondary)] font-mono text-[12px]">{actor}</TableCell>
                      <TableCell>
                        <Badge className={auditActionTone(log.action)}>
                          {AUDIT_ACTION_LABELS[log.action ?? ''] ?? log.action ?? '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[var(--text-secondary)] text-[12px] whitespace-nowrap">
                        {AUDIT_ENTITY_LABELS[log.entityType ?? ''] ?? log.entityType ?? '—'}
                        {log.entityId ? <span className="text-[var(--text-muted)]"> #{log.entityId}</span> : null}
                      </TableCell>
                      <TableCell className="text-[var(--text-muted)] font-mono text-[11px] max-w-xs truncate" title={details}>
                        {details}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 mt-4 text-[12px] text-[var(--text-secondary)]">
          <span>
            Page <span className="font-mono text-white">{auditParams.page}</span> / {auditTotalPages}
            <span className="text-[var(--text-muted)]"> — {auditTotal} événement{auditTotal > 1 ? 's' : ''}</span>
          </span>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              disabled={(auditParams.page ?? 1) <= 1 || auditLoading}
              onClick={() => setAuditParams({ page: (auditParams.page ?? 1) - 1 })}
              className="h-7 w-7 p-0"
              title="Page précédente"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={(auditParams.page ?? 1) >= auditTotalPages || auditLoading}
              onClick={() => setAuditParams({ page: (auditParams.page ?? 1) + 1 })}
              className="h-7 w-7 p-0"
              title="Page suivante"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </section>

      <AdminChallengeModal
        open={!!pendingRoleChange}
        actionLabel={
          pendingRoleChange
            ? `Promouvoir #${pendingRoleChange.userId} (${pendingRoleChange.userEmail ?? 'sans email'}) au rôle "${pendingRoleChange.newRole}"`
            : ''
        }
        actionContext={
          pendingRoleChange
            ? `role-change:user=${pendingRoleChange.userId}:role=${pendingRoleChange.newRole}`
            : ''
        }
        onCancel={() => setPendingRoleChange(null)}
        onConfirm={confirmRoleChange}
      />

      <AdminChallengeModal
        open={!!pendingDeletion}
        actionLabel={
          pendingDeletion
            ? `⚠️ Suppression DÉFINITIVE de #${pendingDeletion.userId} (${pendingDeletion.userEmail ?? 'sans email'}). Tous ses wallets, locks et fichiers seront perdus.`
            : ''
        }
        actionContext={
          pendingDeletion ? `delete-user:user=${pendingDeletion.userId}` : ''
        }
        onCancel={() => setPendingDeletion(null)}
        onConfirm={confirmDeletion}
      />

      <AdminChallengeModal
        open={!!pendingBan}
        actionLabel={
          pendingBan
            ? `Suspendre le compte #${pendingBan.userId} (${pendingBan.userEmail ?? 'sans email'}). Il ne pourra plus se connecter, mais le compte est conservé et réactivable.`
            : ''
        }
        actionContext={pendingBan ? `ban-user:user=${pendingBan.userId}` : ''}
        extraContent={
          <div className="space-y-1.5 mb-1">
            <Label className="text-text-secondary text-xs">Motif (optionnel)</Label>
            <Input
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Ex : activité frauduleuse"
              className="bg-dark-blue border-glass-border text-white text-[13px]"
              maxLength={255}
            />
          </div>
        }
        onCancel={() => {
          setPendingBan(null);
          setBanReason('');
        }}
        onConfirm={confirmBan}
      />

      <AdminChallengeModal
        open={!!pendingPasswordReset}
        actionLabel={
          pendingPasswordReset
            ? `Définir un nouveau mot de passe pour #${pendingPasswordReset.userId} (${pendingPasswordReset.userEmail ?? 'sans email'}).`
            : ''
        }
        actionContext={
          pendingPasswordReset ? `reset-password:user=${pendingPasswordReset.userId}` : ''
        }
        extraContent={
          <div className="space-y-1.5 mb-1">
            <Label className="text-text-secondary text-xs">Nouveau mot de passe</Label>
            <Input
              type="password"
              value={passwordDraft}
              onChange={(e) => setPasswordDraft(e.target.value)}
              placeholder="Au moins 8 caractères"
              autoComplete="new-password"
              className="bg-dark-blue border-glass-border text-white text-[13px]"
              maxLength={128}
            />
          </div>
        }
        onCancel={() => {
          setPendingPasswordReset(null);
          setPasswordDraft('');
        }}
        onConfirm={confirmPasswordReset}
      />
    </div>
  );
}

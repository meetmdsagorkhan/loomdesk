'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Loader2, Plus, Shield, UserCheck, Crown,
  Mail, Search, Sparkles, Send, PauseCircle, Trash2,
  RefreshCw, ChevronRight, AlertCircle, Eye, EyeOff, Check, X, ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { isAdmin } from '@/lib/auth-utils';
import { showToast } from '@/components/shared/Toast';
import { handleApiError } from '@/lib/error-handler';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

/* ─────────────────────────────────────────── types ──── */
interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions?: string[];
  isActive?: boolean;
  image?: string | null;
  createdAt: string;
}

interface AuditLog {
  id: string;
  action: string;
  status: string;
  actorId: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  targetType: string | null;
  targetId: string | null;
  targetEmail: string | null;
  ipAddress: string | null;
  metadata: any | null;
  createdAt: string;
}

/* ─────────────────────────────────────────── helpers ── */
const ROLE_META: Record<string, { label: string; color: string; icon: React.ElementType; glow: string }> = {
  ADMIN: {
    label: 'Admin',
    color: 'text-violet-400 bg-violet-500/15 border-violet-500/30',
    icon: Crown,
    glow: 'shadow-[0_0_12px_rgba(139,92,246,0.35)]',
  },
  TEAM_LEAD: {
    label: 'Team Lead',
    color: 'text-sky-400 bg-sky-500/15 border-sky-500/30',
    icon: Shield,
    glow: 'shadow-[0_0_12px_rgba(56,189,248,0.3)]',
  },
  MEMBER: {
    label: 'Member',
    color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
    icon: UserCheck,
    glow: '',
  },
};

const SYSTEM_PERMISSIONS = [
  { key: 'view_team_analytics', label: 'View Team Analytics', desc: 'Allows access to manager graphs, leaderboard and stats.' },
  { key: 'manage_users', label: 'Manage Users', desc: 'Allows pausing, resuming and updating system accounts.' },
  { key: 'manage_invitations', label: 'Manage Invitations', desc: 'Allows inviting members and revoking invites.' },
  { key: 'manage_shifts', label: 'Manage Shifts', desc: 'Allows creating and assigning schedules and exceptions.' },
  { key: 'manage_leaves', label: 'Manage Leaves', desc: 'Allows approving or rejecting team leave requests.' },
  { key: 'score_reports', label: 'Score QA Reports', desc: 'Allows review and deduction events on team daily reports.' },
  { key: 'view_all_reports', label: 'View All Reports', desc: 'Allows looking at all company reports.' },
  { key: 'view_audit_logs', label: 'View Audit Logs', desc: 'Allows reading security compliance trails.' },
  { key: 'system_settings', label: 'System Settings', desc: 'Allows editing team-wide controls.' },
  { key: 'post_announcements', label: 'Post Announcements', desc: 'Allows posting in workspace broadcast channels.' },
];

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getAvatarGradient(name: string) {
  const gradients = [
    'from-violet-500 to-indigo-500',
    'from-sky-500 to-cyan-400',
    'from-emerald-500 to-teal-400',
    'from-rose-500 to-pink-400',
    'from-amber-500 to-orange-400',
    'from-fuchsia-500 to-purple-500',
  ];
  const idx = name.charCodeAt(0) % gradients.length;
  return gradients[idx];
}

/* ─────────────────────────────────────────── components ─ */

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
      className="glass-card rounded-2xl p-5 flex items-center gap-4 hover:-translate-y-0.5 transition-transform duration-300"
    >
      <div className={cn('p-3 rounded-xl border', color)}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground font-medium mt-0.5">{label}</p>
      </div>
    </motion.div>
  );
}

function RolePill({ role }: { role: string }) {
  const meta = ROLE_META[role] ?? ROLE_META.MEMBER;
  const Icon = meta.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border', meta.color)}>
      <Icon size={11} />
      {meta.label}
    </span>
  );
}

function MemberRow({
  member,
  index,
  canManageMembers,
  isCurrentUser,
  actionState,
  onTogglePause,
  onDelete,
  onManagePermissions,
}: {
  member: TeamMember;
  index: number;
  canManageMembers: boolean;
  isCurrentUser: boolean;
  actionState: { id: string; action: 'pause' | 'resume' | 'delete' | 'permissions' } | null;
  onTogglePause: (member: TeamMember) => void;
  onDelete: (member: TeamMember) => void;
  onManagePermissions: (member: TeamMember) => void;
}) {
  const gradient = getAvatarGradient(member.name);
  const joined = new Date(member.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
  const isPaused = member.isActive === false;
  const isPausing =
    actionState?.id === member.id &&
    (actionState.action === 'pause' || actionState.action === 'resume');
  const isDeleting = actionState?.id === member.id && actionState.action === 'delete';
  const isAdmin = member.role === 'ADMIN';
  const actionsDisabled = isCurrentUser || isAdmin || isPausing || isDeleting;

  return (
    <motion.tr
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05 * index, duration: 0.35, ease: 'easeOut' }}
      className="group border-b border-border/40 last:border-0 hover:bg-primary/[0.04] transition-colors duration-200"
    >
      {/* Avatar + Name */}
      <td className="py-3.5 pl-5 pr-3">
        <div className="flex items-center gap-3">
          <div className={cn('w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold shrink-0', gradient)}>
            {getInitials(member.name)}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground leading-tight">{member.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Mail size={10} />
              {member.email}
            </p>
            {isPaused && (
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-amber-500">
                Paused
              </p>
            )}
          </div>
        </div>
      </td>

      {/* Role */}
      <td className="py-3.5 px-3">
        <RolePill role={member.role} />
      </td>

      {/* Overrides Count */}
      <td className="py-3.5 px-3 hidden md:table-cell">
        <span className="text-xs font-medium text-foreground">
          {member.permissions && member.permissions.length > 0 ? (
            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
              {member.permissions.length} Overrides
            </span>
          ) : (
            <span className="text-muted-foreground italic">Standard</span>
          )}
        </span>
      </td>

      {/* Joined */}
      <td className="py-3.5 px-3 hidden lg:table-cell">
        <p className="text-xs text-muted-foreground">{joined}</p>
      </td>

      {/* Actions */}
      <td className="py-3.5 pl-3 pr-5">
        {canManageMembers ? (
          <div className="flex items-center justify-end gap-2">
            {isAdmin ? (
              <span className="text-xs text-muted-foreground italic" title="Admin accounts cannot be modified">
                Protected
              </span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onManagePermissions(member)}
                  disabled={actionsDisabled}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Shield size={12} />
                  Permissions
                </button>
                <button
                  type="button"
                  onClick={() => onTogglePause(member)}
                  disabled={actionsDisabled}
                  className={cn(
                    'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45',
                    isPaused
                      ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15'
                      : 'border border-amber-500/20 bg-amber-500/10 text-amber-500 hover:bg-amber-500/15',
                  )}
                >
                  {isPausing ? <Loader2 size={12} className="animate-spin" /> : <PauseCircle size={12} />}
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(member)}
                  disabled={actionsDisabled}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-destructive/20 bg-destructive/10 px-2.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/15 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  Delete
                </button>
              </>
            )}
          </div>
        ) : null}
      </td>
    </motion.tr>
  );
}

/* ─────────────────────────────────────────── page ──── */
export default function SettingsPage() {
  const { user, isLoading: userLoading } = useCurrentUser();
  const [mounted, setMounted] = useState(false);
  const isManager = isAdmin({ user }) || user?.role === 'TEAM_LEAD';

  /* tab selector */
  const [activeTab, setActiveTab] = useState<'roster' | 'audit'>('roster');

  /* invite state */
  const [inviteData, setInviteData] = useState({ email: '', role: 'MEMBER' });
  const [isInviting, setIsInviting] = useState(false);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(true);

  /* team state */
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [memberActionState, setMemberActionState] = useState<{ id: string; action: 'pause' | 'resume' | 'delete' | 'permissions' } | null>(null);
  const canManageMembers = user?.role === 'ADMIN';

  /* permissions modal state */
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<string[]>([]);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);

  /* audit logs state */
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditStatusFilter, setAuditStatusFilter] = useState('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const fetchMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch members');
      const data = await res.json();
      setMembers(data.users ?? []);
    } catch (e) {
      handleApiError(e, 'Admin Settings');
    } finally {
      setMembersLoading(false);
    }
  }, []);

  const fetchInvitations = useCallback(async () => {
    if (!canManageMembers) return;
    setInvitationsLoading(true);
    try {
      const res = await fetch('/api/auth/invite');
      if (!res.ok) throw new Error('Failed to fetch invitations');
      const data = await res.json();
      setInvitations(data.invitations ?? []);
    } catch (e) {
      handleApiError(e, 'Admin Settings');
    } finally {
      setInvitationsLoading(false);
    }
  }, [canManageMembers]);

  const fetchAuditLogs = useCallback(async () => {
    if (activeTab !== 'audit') return;
    setLogsLoading(true);
    try {
      const res = await fetch('/api/audit-logs?limit=80');
      if (!res.ok) throw new Error('Failed to fetch audit logs');
      const data = await res.json();
      setLogs(data.logs ?? []);
    } catch (e) {
      handleApiError(e, 'Compliance Audit Logs');
    } finally {
      setLogsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (isManager) fetchMembers();
  }, [isManager, fetchMembers]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    try {
      const res = await fetch('/api/auth/invite/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteData.email, role: inviteData.role }),
      });
      if (!res.ok) {
        const err = await res.json();
        handleApiError(err.error || 'Failed to send invitation', 'Settings');
        return;
      }
      showToast('Invitation sent successfully', 'success');
      setInviteData({ email: '', role: 'MEMBER' });
      fetchInvitations();
    } catch (err) {
      handleApiError(err, 'Settings');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRevokeInvitation = async (id: string) => {
    try {
      const res = await fetch(`/api/auth/invite/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        handleApiError('Failed to revoke invitation', 'Settings');
        return;
      }
      showToast('Invitation revoked successfully', 'success');
      fetchInvitations();
    } catch (err) {
      handleApiError(err, 'Settings');
    }
  };

  const handleTogglePauseMember = async (member: TeamMember) => {
    if (!canManageMembers) return;
    const nextAction = member.isActive === false ? 'resume' : 'pause';
    const confirmationMessage =
      nextAction === 'pause'
        ? `Pause ${member.name}'s account? They will lose access until reactivated.`
        : `Resume ${member.name}'s account and restore access?`;

    if (!window.confirm(confirmationMessage)) {
      return;
    }

    setMemberActionState({ id: member.id, action: nextAction });

    try {
      const res = await fetch(`/api/users/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: nextAction }),
      });
      const data = await res.json();

      if (!res.ok) {
        handleApiError(data.error || `Failed to ${nextAction} member`, 'Admin Settings');
        return;
      }

      showToast(data.message || `Member ${nextAction}d successfully`, 'success');
      await fetchMembers();
    } catch (error) {
      handleApiError(error, 'Admin Settings');
    } finally {
      setMemberActionState(null);
    }
  };

  const handleDeleteMember = async (member: TeamMember) => {
    if (!canManageMembers) return;
    if (!window.confirm(`Delete ${member.name} permanently? This cannot be undone.`)) {
      return;
    }

    setMemberActionState({ id: member.id, action: 'delete' });

    try {
      const res = await fetch(`/api/users/${member.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok) {
        handleApiError(data.error || 'Failed to delete member', 'Admin Settings');
        return;
      }

      showToast(data.message || 'Member deleted successfully', 'success');
      await fetchMembers();
    } catch (error) {
      handleApiError(error, 'Admin Settings');
    } finally {
      setMemberActionState(null);
    }
  };

  /* Open permission modal */
  const handleManagePermissions = (member: TeamMember) => {
    setSelectedMember(member);
    setEditingPermissions(member.permissions ?? []);
  };

  /* Save custom overrides */
  const handleSavePermissions = async () => {
    if (!selectedMember) return;
    setIsSavingPermissions(true);
    setMemberActionState({ id: selectedMember.id, action: 'permissions' });

    try {
      const res = await fetch(`/api/users/${selectedMember.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'permissions',
          permissions: editingPermissions,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update overrides');
      }

      showToast('User overrides updated successfully!', 'success');
      setSelectedMember(null);
      await fetchMembers();
    } catch (err) {
      handleApiError(err, 'Custom Permissions UI');
    } finally {
      setIsSavingPermissions(false);
      setMemberActionState(null);
    }
  };

  const togglePermissionSelection = (key: string, state: 'inherit' | 'grant' | 'deny') => {
    let clean = editingPermissions.filter(p => p !== key && p !== `-${key}`);
    if (state === 'grant') {
      clean.push(key);
    } else if (state === 'deny') {
      clean.push(`-${key}`);
    }
    setEditingPermissions(clean);
  };

  if (!mounted) return null;

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isManager) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-[400px] text-center p-8"
      >
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mb-4">
          <AlertCircle className="text-destructive" size={28} />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Access Restricted</h2>
        <p className="text-muted-foreground max-w-sm">Only administrators and team leads can access admin settings.</p>
      </motion.div>
    );
  }

  /* derived stats */
  const stats = {
    total: members.length,
    admins: members.filter((m) => m.role === 'ADMIN' && m.isActive !== false).length,
    leads: members.filter((m) => m.role === 'TEAM_LEAD' && m.isActive !== false).length,
    members: members.filter((m) => m.role === 'MEMBER' && m.isActive !== false).length,
  };

  const filteredMembers = members.filter((m) => {
    const matchSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'ALL' || m.role === roleFilter;
    return matchSearch && matchRole;
  });

  const filteredLogs = logs.filter((log) => {
    const matchSearch =
      log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
      (log.actorEmail && log.actorEmail.toLowerCase().includes(auditSearch.toLowerCase())) ||
      (log.targetEmail && log.targetEmail.toLowerCase().includes(auditSearch.toLowerCase()));
    
    const matchStatus = auditStatusFilter === 'ALL' || log.status.toUpperCase() === auditStatusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-14">

      {/* ── Header ─────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="glass-card rounded-2xl p-6 md:p-8 relative overflow-hidden"
      >
        <div className="pointer-events-none absolute -top-10 -right-10 w-64 h-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 left-10 w-48 h-48 rounded-full bg-sky-500/8 blur-3xl" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80 mb-2">SupOps Admin</p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground flex items-center gap-3">
              Command Center
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-500/15 text-violet-400 border border-violet-500/25">
                <Sparkles size={11} />
                V2 Secure
              </span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Manage enterprise workspace SSO credentials, custom override permissions, and compliance audit logging.
            </p>
          </div>

          <button
            onClick={() => {
              fetchMembers();
              fetchAuditLogs();
              fetchInvitations();
            }}
            className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 rounded-xl glass-card text-sm font-medium text-muted-foreground hover:text-foreground border border-border/60 hover:border-primary/30 transition-all duration-200"
          >
            <RefreshCw size={14} />
            Sync System
          </button>
        </div>
      </motion.div>

      {/* ── Stats Row ──────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard icon={Users} label="Active Users" value={stats.total} color="text-primary bg-primary/15 border-primary/25" delay={0.05} />
        <StatCard icon={Crown} label="Root Admins" value={stats.admins} color="text-violet-400 bg-violet-500/15 border-violet-500/30" delay={0.1} />
        <StatCard icon={Shield} label="Shift Leaders" value={stats.leads} color="text-sky-400 bg-sky-500/15 border-sky-500/30" delay={0.15} />
        <StatCard icon={UserCheck} label="Agents Registered" value={stats.members} color="text-emerald-400 bg-emerald-500/15 border-emerald-500/30" delay={0.2} />
      </div>

      {/* ── Tabs Bar ───────────────────────────── */}
      <div className="flex border-b border-border/50 gap-6" role="tablist" aria-label="Settings configuration sections">
        <button
          id="tab-roster"
          role="tab"
          aria-selected={activeTab === 'roster'}
          aria-controls="tabpanel-roster"
          tabIndex={activeTab === 'roster' ? 0 : -1}
          onClick={() => setActiveTab('roster')}
          onKeyDown={(e) => {
            const tabIds = ['roster', 'audit'];
            const currentIndex = tabIds.indexOf(activeTab);
            let nextIndex = currentIndex;
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
              nextIndex = (currentIndex + 1) % tabIds.length;
              e.preventDefault();
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
              nextIndex = (currentIndex - 1 + tabIds.length) % tabIds.length;
              e.preventDefault();
            }
            if (nextIndex !== currentIndex) {
              setActiveTab(tabIds[nextIndex] as any);
              setTimeout(() => {
                document.getElementById(`tab-${tabIds[nextIndex]}`)?.focus();
              }, 0);
            }
          }}
          className={cn(
            'pb-3 text-sm font-semibold tracking-wide border-b-2 transition-all relative uppercase',
            activeTab === 'roster'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <span className="flex items-center gap-2">
            <Users size={14} /> Team Roster & Provisioning
          </span>
        </button>

        <button
          id="tab-audit"
          role="tab"
          aria-selected={activeTab === 'audit'}
          aria-controls="tabpanel-audit"
          tabIndex={activeTab === 'audit' ? 0 : -1}
          onClick={() => setActiveTab('audit')}
          onKeyDown={(e) => {
            const tabIds = ['roster', 'audit'];
            const currentIndex = tabIds.indexOf(activeTab);
            let nextIndex = currentIndex;
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
              nextIndex = (currentIndex + 1) % tabIds.length;
              e.preventDefault();
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
              nextIndex = (currentIndex - 1 + tabIds.length) % tabIds.length;
              e.preventDefault();
            }
            if (nextIndex !== currentIndex) {
              setActiveTab(tabIds[nextIndex] as any);
              setTimeout(() => {
                document.getElementById(`tab-${tabIds[nextIndex]}`)?.focus();
              }, 0);
            }
          }}
          className={cn(
            'pb-3 text-sm font-semibold tracking-wide border-b-2 transition-all relative uppercase',
            activeTab === 'audit'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <span className="flex items-center gap-2">
            <ShieldAlert size={14} /> Security Compliance Audit Log
          </span>
        </button>
      </div>

      {/* ── Main Layout Grid ───────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">

        {/* Tab 1: Team Roster Layout */}
        {activeTab === 'roster' && (
          <motion.div
            id="tabpanel-roster"
            role="tabpanel"
            aria-labelledby="tab-roster"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="glass-card rounded-2xl overflow-hidden"
          >
            {/* Header / Search Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-5 border-b border-border/50">
              <div className="flex items-center gap-2.5 flex-1">
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                  <Users size={15} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Workspace Provisioning</h2>
                  <p className="text-xs text-muted-foreground">Modify active user privileges and system access status.</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search members…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 pr-3 h-8 text-xs rounded-lg bg-muted/60 border border-border/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 w-44 transition-all"
                  />
                </div>

                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="h-8 w-32 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Roles</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="TEAM_LEAD">Team Lead</SelectItem>
                    <SelectItem value="MEMBER">Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Members Table */}
            {membersLoading ? (
              <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
                <Loader2 size={20} className="animate-spin" />
                <span className="text-sm">Loading team roster…</span>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-8">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                  <Users size={20} className="text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">No members found</p>
                <p className="text-xs text-muted-foreground mt-1">Try adjusting your search criteria</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/40">
                      <th className="py-2.5 pl-5 pr-3 text-left text-xs font-semibold text-muted-foreground">Member Info</th>
                      <th className="py-2.5 px-3 text-left text-xs font-semibold text-muted-foreground">Base Role</th>
                      <th className="py-2.5 px-3 text-left text-xs font-semibold text-muted-foreground hidden md:table-cell">Overrides Status</th>
                      <th className="py-2.5 px-3 text-left text-xs font-semibold text-muted-foreground hidden lg:table-cell">Provisioned On</th>
                      <th className="py-2.5 pl-3 pr-5 text-right text-xs font-semibold text-muted-foreground">
                        {canManageMembers ? 'Privilege Controls' : ''}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {filteredMembers.map((member, i) => (
                        <MemberRow
                          key={member.id}
                          member={member}
                          index={i}
                          canManageMembers={canManageMembers}
                          isCurrentUser={user?.id === member.id}
                          actionState={memberActionState}
                          onTogglePause={handleTogglePauseMember}
                          onDelete={handleDeleteMember}
                          onManagePermissions={handleManagePermissions}
                        />
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {/* Tab 2: Compliance Audit Logs Layout */}
        {activeTab === 'audit' && (
          <motion.div
            id="tabpanel-audit"
            role="tabpanel"
            aria-labelledby="tab-audit"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="glass-card rounded-2xl overflow-hidden"
          >
            {/* Header controls */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-5 border-b border-border/50">
              <div className="flex items-center gap-2.5 flex-1">
                <div className="p-2.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
                  <ShieldAlert size={15} className="text-violet-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Compliance Activity Explorer</h2>
                  <p className="text-xs text-muted-foreground">Immutable audit logs of all configuration changes and admin overrides.</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search logs…"
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="pl-8 pr-3 h-8 text-xs rounded-lg bg-muted/60 border border-border/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 w-44 transition-all"
                  />
                </div>

                <Select value={auditStatusFilter} onValueChange={setAuditStatusFilter}>
                  <SelectTrigger className="h-8 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All States</SelectItem>
                    <SelectItem value="SUCCESS">Success</SelectItem>
                    <SelectItem value="FAILURE">Failure</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Audit log entries */}
            {logsLoading ? (
              <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
                <Loader2 size={20} className="animate-spin" />
                <span className="text-sm">Reading compliance trail…</span>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-8">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                  <ShieldAlert size={20} className="text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">No compliance events matched</p>
                <p className="text-xs text-muted-foreground mt-1">System activity is currently empty or filtered out.</p>
              </div>
            ) : (
              <div className="p-4 space-y-3 max-h-[550px] overflow-y-auto">
                {filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const logTime = new Date(log.createdAt).toLocaleString();
                  const isSuccess = log.status.toUpperCase() === 'SUCCESS';

                  return (
                    <div
                      key={log.id}
                      className="p-4 rounded-xl border border-border/40 bg-primary/[0.02] hover:bg-primary/[0.04] transition-all relative overflow-hidden"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-foreground/10 text-foreground">
                              {log.action}
                            </span>
                            <span className={cn(
                              'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border',
                              isSuccess
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-destructive/10 text-destructive border-destructive/20'
                            )}>
                              {log.status}
                            </span>
                            <span className="text-xs text-muted-foreground">{logTime}</span>
                          </div>
                          
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Actor: <span className="font-semibold text-foreground">{log.actorEmail ?? 'System'}</span> ({log.actorRole ?? 'SYSTEM'})
                            {log.targetEmail && (
                              <>
                                {' '}→ Target: <span className="font-semibold text-foreground">{log.targetEmail}</span>
                              </>
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 self-start md:self-auto shrink-0 text-xs text-muted-foreground">
                          <span className="font-mono text-[11px] bg-muted px-2 py-1 rounded">
                            IP: {log.ipAddress ?? 'internal'}
                          </span>
                          
                          {log.metadata && (
                            <button
                              type="button"
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                              className="p-1 rounded bg-muted hover:bg-primary/10 hover:text-primary transition-all"
                              title="Inspect metadata payload"
                            >
                              {isExpanded ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Collapsible JSON inspector */}
                      {isExpanded && log.metadata && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-3 p-3 rounded-lg bg-black/60 font-mono text-[11px] text-emerald-400 overflow-x-auto border border-border/40"
                        >
                          <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Enterprise SSO & Invite Panel ────────── */}
        <div className="space-y-5">
          {/* Invite Panel */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
            className="glass-card rounded-2xl overflow-hidden flex flex-col"
          >
            <div className="p-5 border-b border-border/50 relative overflow-hidden">
              <div className="pointer-events-none absolute -top-8 -right-8 w-32 h-32 rounded-full bg-primary/10 blur-2xl" />
              <div className="relative flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/15 border border-primary/25">
                  <Send size={15} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Invite Member</h2>
                  <p className="text-xs text-muted-foreground">Send a workspace invitation</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleInvite} className="flex flex-col gap-4 p-5 flex-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wide ml-0.5">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    value={inviteData.email}
                    onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                    placeholder="colleague@company.com"
                    className="pl-9 form-input bg-transparent text-sm h-10 border-border/80"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wide ml-0.5">
                  Workspace Role
                </Label>
                <Select
                  value={inviteData.role}
                  onValueChange={(value) => setInviteData({ ...inviteData, role: value })}
                >
                  <SelectTrigger className="form-input bg-transparent h-10 text-xs border-border/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEMBER">Member — Standard access</SelectItem>
                    <SelectItem value="TEAM_LEAD">Team Lead — Management access</SelectItem>
                    <SelectItem value="ADMIN">Admin — Full control</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                disabled={isInviting}
                className="w-full h-10 rounded-xl font-semibold btn-primary flex items-center justify-center gap-2 mt-2"
              >
                {isInviting ? <Loader2 size={15} className="animate-spin" /> : <Send size={14} />}
                Send Invitation
              </Button>
            </form>

            {invitations.length > 0 && (
              <div className="border-t border-border/50 p-4 max-h-48 overflow-y-auto">
                <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2 uppercase tracking-wide">
                  Pending Invitations ({invitations.length})
                </h3>
                <div className="space-y-2">
                  {invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between p-2 rounded bg-muted/40 border border-border/60 text-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{invitation.email}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {invitation.role} • Exp {new Date(invitation.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRevokeInvitation(invitation.id)}
                        className="text-destructive hover:bg-destructive/10 px-2 py-1 rounded font-semibold transition-all shrink-0 ml-2"
                      >
                        Revoke
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Enterprise Identity Federation / SAML OIDC Config Panel */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.45 }}
            className="glass-card rounded-2xl p-5 border border-border/50 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 h-20 w-20 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/25">
                <Crown size={15} className="text-sky-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Identity Federation</h3>
                <p className="text-[11px] text-muted-foreground">Enterprise Single Sign-On (SSO)</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border/60 bg-muted/30 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Okta Integration</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase">
                    Ready
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-normal">
                   Okta OIDC configured. System host redirection rewrites active subdomains immediately upon request matches.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border/60 bg-muted/30 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Azure AD SAML 2.0</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 uppercase">
                    Ready
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-normal">
                  Azure OIDC and SAML parameters compiled in next-auth. Domain matching logic secures centralized enterprise accounts.
                </p>
              </div>

              <div className="p-2 border border-yellow-500/20 bg-yellow-500/5 text-yellow-500 rounded text-[10px] leading-relaxed flex gap-2">
                <AlertCircle size={12} className="shrink-0 mt-0.5" />
                <span>
                  Federated identities enforce Okta policies. Local credential logins will bypass for standard testing domains.
                </span>
              </div>
            </div>
          </motion.div>
        </div>

      </div>

      {/* ── Option 1: Custom Permissions Modal ── */}
      <AnimatePresence>
        {selectedMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMember(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="glass-card w-full max-w-2xl rounded-2xl overflow-hidden relative z-10 border border-border/50 flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-border/50 flex items-center justify-between bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                    <Shield size={18} className="text-primary" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-foreground">User Override Privileges</h2>
                    <p className="text-xs text-muted-foreground">Configuring overrides for <span className="font-semibold text-foreground">{selectedMember.name}</span></p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMember(null)}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable list */}
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                <div className="p-3.5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-xs text-yellow-500 leading-normal flex gap-2.5">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>
                    Granting explicit access overrides default role restrictions. Denying a permission strictly revokes that privilege, even if the role permits it by default.
                  </span>
                </div>

                <div className="space-y-3">
                  {SYSTEM_PERMISSIONS.map((perm) => {
                    const isGranted = editingPermissions.includes(perm.key);
                    const isDenied = editingPermissions.includes(`-${perm.key}`);
                    const isInherit = !isGranted && !isDenied;

                    return (
                      <div
                        key={perm.key}
                        className={cn(
                          'p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4',
                          isGranted && 'border-emerald-500/20 bg-emerald-500/[0.02]',
                          isDenied && 'border-destructive/20 bg-destructive/[0.02]',
                          isInherit && 'border-border/40 bg-transparent'
                        )}
                      >
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            {perm.label}
                            {isGranted && <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">Granted Override</span>}
                            {isDenied && <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-destructive/10 border border-destructive/25 text-destructive">Strictly Denied</span>}
                            {isInherit && <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-muted border border-border/80 text-muted-foreground">Role Default</span>}
                          </p>
                          <p className="text-[11px] text-muted-foreground leading-normal max-w-md">{perm.desc}</p>
                        </div>

                        {/* 3-State Radio Selector */}
                        <div className="flex items-center gap-1 bg-muted/60 border border-border/60 p-0.5 rounded-lg self-start sm:self-auto shrink-0">
                          <button
                            type="button"
                            onClick={() => togglePermissionSelection(perm.key, 'inherit')}
                            className={cn(
                              'px-3 py-1 text-[10px] font-bold rounded-md transition-all uppercase tracking-wide',
                              isInherit
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                            )}
                          >
                            Inherit
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => togglePermissionSelection(perm.key, 'grant')}
                            className={cn(
                              'px-3 py-1 text-[10px] font-bold rounded-md transition-all uppercase tracking-wide flex items-center gap-1',
                              isGranted
                                ? 'bg-emerald-500 text-white shadow-sm font-semibold'
                                : 'text-muted-foreground hover:text-emerald-400'
                            )}
                          >
                            <Check size={10} />
                            Grant
                          </button>

                          <button
                            type="button"
                            onClick={() => togglePermissionSelection(perm.key, 'deny')}
                            className={cn(
                              'px-3 py-1 text-[10px] font-bold rounded-md transition-all uppercase tracking-wide flex items-center gap-1',
                              isDenied
                                ? 'bg-destructive text-white shadow-sm font-semibold'
                                : 'text-muted-foreground hover:text-destructive'
                            )}
                          >
                            <X size={10} />
                            Deny
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-border/50 flex items-center justify-end gap-3 bg-muted/20">
                <Button
                  onClick={() => setSelectedMember(null)}
                  variant="ghost"
                  className="rounded-xl h-10 px-4 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSavePermissions}
                  disabled={isSavingPermissions}
                  className="rounded-xl h-10 px-5 text-xs font-semibold btn-primary flex items-center gap-2"
                >
                  {isSavingPermissions && <Loader2 size={13} className="animate-spin" />}
                  Save Policy Overrides
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

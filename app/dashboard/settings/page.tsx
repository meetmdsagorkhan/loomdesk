'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Loader2, Plus, Shield, UserCheck, Crown,
  Mail, Search, Sparkles, Send, PauseCircle, Trash2,
  RefreshCw, ChevronRight, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
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
  isActive?: boolean;
  image?: string | null;
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
}: {
  member: TeamMember;
  index: number;
  canManageMembers: boolean;
  isCurrentUser: boolean;
  actionState: { id: string; action: 'pause' | 'resume' | 'delete' } | null;
  onTogglePause: (member: TeamMember) => void;
  onDelete: (member: TeamMember) => void;
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
  const actionsDisabled = isCurrentUser || member.role === 'ADMIN' || isPausing || isDeleting;

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

      {/* Joined */}
      <td className="py-3.5 px-3 hidden md:table-cell">
        <p className="text-xs text-muted-foreground">{joined}</p>
      </td>

      {/* Actions placeholder */}
      <td className="py-3.5 pl-3 pr-5">
        {canManageMembers ? (
          <div className="flex items-center justify-end gap-2">
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

  /* invite state */
  const [inviteData, setInviteData] = useState({ email: '', role: 'MEMBER' });
  const [isInviting, setIsInviting] = useState(false);

  /* team state */
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [memberActionState, setMemberActionState] = useState<{ id: string; action: 'pause' | 'resume' | 'delete' } | null>(null);
  const canManageMembers = user?.role === 'ADMIN';

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

  useEffect(() => {
    if (isManager) fetchMembers();
  }, [isManager, fetchMembers]);

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
    } catch (err) {
      handleApiError(err, 'Settings');
    } finally {
      setIsInviting(false);
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

  const filtered = members.filter((m) => {
    const matchSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'ALL' || m.role === roleFilter;
    return matchSearch && matchRole;
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
        {/* ambient orbs */}
        <div className="pointer-events-none absolute -top-10 -right-10 w-64 h-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 left-10 w-48 h-48 rounded-full bg-sky-500/8 blur-3xl" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80 mb-2">Admin</p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground flex items-center gap-3">
              Admin Settings
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/25">
                <Sparkles size={11} />
                Live
              </span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Manage your workspace members, permissions, and team access.
            </p>
          </div>

          <button
            onClick={fetchMembers}
            className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 rounded-xl glass-card text-sm font-medium text-muted-foreground hover:text-foreground border border-border/60 hover:border-primary/30 transition-all duration-200"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </motion.div>

      {/* ── Stats Row ──────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard icon={Users} label="Total Members" value={stats.total} color="text-primary bg-primary/15 border-primary/25" delay={0.05} />
        <StatCard icon={Crown} label="Admins" value={stats.admins} color="text-violet-400 bg-violet-500/15 border-violet-500/30" delay={0.1} />
        <StatCard icon={Shield} label="Team Leads" value={stats.leads} color="text-sky-400 bg-sky-500/15 border-sky-500/30" delay={0.15} />
        <StatCard icon={UserCheck} label="Members" value={stats.members} color="text-emerald-400 bg-emerald-500/15 border-emerald-500/30" delay={0.2} />
      </div>

      {/* ── Main Layout ────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">

        {/* Team Roster ─────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
          className="glass-card rounded-2xl overflow-hidden"
        >
          {/* roster header */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-5 border-b border-border/50">
            <div className="flex items-center gap-2.5 flex-1">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <Users size={15} className="text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Team Roster</h2>
                <p className="text-xs text-muted-foreground">{filtered.length} of {members.length} members</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* search */}
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-3 h-8 text-xs rounded-lg bg-muted/60 border border-border/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 w-36 transition-all"
                />
              </div>

              {/* role filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-8 px-2.5 text-xs rounded-lg bg-muted/60 border border-border/60 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
              >
                <option value="ALL">All Roles</option>
                <option value="ADMIN">Admin</option>
                <option value="TEAM_LEAD">Team Lead</option>
                <option value="MEMBER">Member</option>
              </select>
            </div>
          </div>

          {/* table */}
          {membersLoading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm">Loading team…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-8">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                <Users size={20} className="text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">No members found</p>
              <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filter</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="py-2.5 pl-5 pr-3 text-left text-xs font-semibold text-muted-foreground">Member</th>
                    <th className="py-2.5 px-3 text-left text-xs font-semibold text-muted-foreground">Role</th>
                    <th className="py-2.5 px-3 text-left text-xs font-semibold text-muted-foreground hidden md:table-cell">Joined</th>
                    <th className="py-2.5 pl-3 pr-5 text-right text-xs font-semibold text-muted-foreground">
                      {canManageMembers ? 'Actions' : ''}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {filtered.map((member, i) => (
                      <MemberRow
                        key={member.id}
                        member={member}
                        index={i}
                        canManageMembers={canManageMembers}
                        isCurrentUser={user?.id === member.id}
                        actionState={memberActionState}
                        onTogglePause={handleTogglePauseMember}
                        onDelete={handleDeleteMember}
                      />
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Invite Panel ────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
          className="glass-card rounded-2xl overflow-hidden flex flex-col"
        >
          {/* panel header */}
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

          {/* notice */}
          <div className="mx-5 mt-5 p-3.5 rounded-xl bg-primary/8 border border-primary/15">
            <p className="text-xs text-foreground/80 leading-relaxed">
              Invitations expire after <span className="font-semibold text-primary">72 hours</span>. Members can join only via the emailed link.
            </p>
          </div>

          {/* form */}
          <form onSubmit={handleInvite} className="flex flex-col gap-5 p-5 flex-1">
            <div className="space-y-2">
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
                  className="pl-9 form-input"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wide ml-0.5">
                Workspace Role
              </Label>
              <Select
                value={inviteData.role}
                onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
                className="form-input bg-transparent"
              >
                <option value="MEMBER">Member — Standard access</option>
                <option value="TEAM_LEAD">Team Lead — Management access</option>
                <option value="ADMIN">Admin — Full control</option>
              </Select>

              {/* Role description */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={inviteData.role}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    'overflow-hidden mt-2 p-3 rounded-xl text-xs border',
                    ROLE_META[inviteData.role]?.color ?? ROLE_META.MEMBER.color
                  )}
                >
                  {inviteData.role === 'ADMIN' && 'Full access to all settings, reports, and team management features.'}
                  {inviteData.role === 'TEAM_LEAD' && 'Can manage their team\'s reports, attendance, and QA reviews.'}
                  {inviteData.role === 'MEMBER' && 'Standard workspace access — submit reports, view personal stats, and more.'}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-auto pt-2">
              <Button
                type="submit"
                disabled={isInviting}
                className="w-full h-11 rounded-xl font-semibold btn-primary flex items-center justify-center gap-2"
              >
                {isInviting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Sending invite…
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Send Invitation
                    <ChevronRight size={14} className="ml-auto opacity-60" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </motion.div>

      </div>
    </div>
  );
}

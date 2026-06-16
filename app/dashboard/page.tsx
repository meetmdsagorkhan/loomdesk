'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Medal,
  FileText,
  Loader2,
  TrendingUp,
  CheckCircle2,
  CalendarDays,
  Users,
  Search,
  Sparkles,
  Clock,
  UserCheck,
  ThumbsUp,
  AlertTriangle,
  XCircle,
  Check,
  ChevronRight,
  TrendingDown,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  ShieldCheck,
  Sliders,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import StatCard from '@/components/shared/StatCard';
import PageHeader from '@/components/shared/PageHeader';
import GlassCard from '@/components/shared/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import Badge from '@/components/shared/Badge';
import { showToast } from '@/components/shared/Toast';
import { handleApiError } from '@/lib/error-handler';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { format } from 'date-fns';
import { trackEvent } from '@/lib/analytics';
import { useDashboardLayout } from '@/hooks/useDashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type DashboardAnalytics = {
  kpi: {
    totalReports: number;
    activeMembers: number;
    pendingLeaves: number;
    avgScore: number;
    totalDeductions: number;
  };
  leaderboard: Array<{
    name: string;
    reports: number;
    avgScore: number;
  }>;
};

type PendingLeave = {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
};

type PersonalScoring = {
  currentScore: number;
  monthlyScore: number;
  totalReports: number;
  averageScore: number;
  rank: number;
  totalMembers: number;
  recentScores: Array<{
    reportId: string;
    date: string;
    score: number;
    scoreEvents: Array<{
      id: string;
      severity: 'MINOR' | 'MAJOR';
      deduction: number;
      reason: string;
      adminNote?: string | null;
      createdAt: string;
    }>;
  }>;
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useCurrentUser();
  const role = user?.role || 'MEMBER';
  const isAdminView = role === 'ADMIN' || role === 'TEAM_LEAD';

  // Zen Focus Timer & completed tickets state
  const [timeRemaining, setTimeRemaining] = useState(1500); // 25 min default
  const [timerActive, setTimerActive] = useState(false);
  const [timerType, setTimerType] = useState<'focus' | 'break' | 'sprint'>('focus');
  const [completedTickets, setCompletedTickets] = useState(0);
  const [lofiActive, setLofiActive] = useState(false);
  const [report, setReport] = useState<any>(null);
  
  // Operational Intelligence state
  const [pendingAuditsCount, setPendingAuditsCount] = useState<number>(0);

  // Personalization & Telemetry
  const { widgets, toggleVisibility, moveWidget, setWidgets } = useDashboardLayout(isAdminView);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  useEffect(() => {
    if (user) {
      trackEvent('navigation', 'view_page', '/dashboard');
    }
  }, [user]);

  // Widget Renderers
  const renderLeaderboard = () => (
    <GlassCard key="leaderboard" variant="panel" padding="none" className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/15 px-5 py-4 md:px-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Operational Team Standing</h2>
          <p className="text-xs text-muted-foreground mt-0.5">High-speed keyboard query search enabled</p>
        </div>
        <div className="relative w-full max-w-[240px] sm:w-auto">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Query agent name..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              trackEvent('search', 'query_submitted', e.target.value);
            }}
            className="pl-9 h-9 text-xs rounded-full border-white/10 bg-white/20 dark:bg-slate-900/50 backdrop-blur-md"
          />
        </div>
      </div>

      <div className="p-4 md:p-6">
        {analyticsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full rounded-xl bg-white/10" />
            <Skeleton className="h-14 w-full rounded-xl bg-white/10" />
            <Skeleton className="h-14 w-full rounded-xl bg-white/10" />
          </div>
        ) : filteredLeaderboard.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">No agents found matching &quot;{searchQuery}&quot;</p>
          </div>
        ) : (
          <div className="space-y-4 font-sans mt-4">
            {filteredLeaderboard.map((row, index) => (
              <div key={`${row.name}-${index}`} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 transition-all hover:bg-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                    {row.name[0] || '?'}
                  </div>
                  <div>
                     <span className="text-sm font-medium">{row.name}</span>
                     <p className="text-[10px] text-muted-foreground">{row.reports} Reports Logged</p>
                  </div>
                </div>
                <Badge variant="success" label={`${row.avgScore.toFixed(1)}%`} />
              </div>
            ))}
          </div>
        )}
      </div>
    </GlassCard>
  );

  const renderSystemStatus = () => (
    <GlassCard key="system-status" variant="panel" padding="md" className="flex flex-col font-sans">
      <h3 className="font-semibold text-muted-foreground uppercase tracking-widest text-xs mb-4">System Status</h3>
      <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/5 mb-3">
        <ShieldCheck className="text-success" />
        <div>
          <p className="text-sm font-medium">API Services</p>
          <p className="text-xs text-success">Operational</p>
        </div>
      </div>
      <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/5">
        <Clock className="text-primary" />
        <div>
          <p className="text-sm font-medium">Next Sync</p>
          <p className="text-xs text-muted-foreground">In 14 mins</p>
        </div>
      </div>
    </GlassCard>
  );

  const renderLeaveDispatch = () => (
    <GlassCard key="leave-dispatch" variant="panel" padding="none" className="overflow-hidden border-white/10">
      <div className="flex items-center justify-between border-b border-white/15 px-5 py-4 md:px-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Leave Dispatch</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Real-time inline supervisor action desk</p>
        </div>
        <Badge variant="warning" label={`${pendingLeaves.length} Pending`} />
      </div>

      <div className="p-4 md:p-5 space-y-4">
        {leavesLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-xl bg-white/10" />
            <Skeleton className="h-24 w-full rounded-xl bg-white/10" />
          </div>
        ) : pendingLeaves.length === 0 ? (
          <div className="text-center py-10 rounded-2xl border border-dashed border-white/10 p-6">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2.5 opacity-80" />
            <p className="text-sm font-semibold text-foreground">Clean Slate!</p>
            <p className="text-xs text-muted-foreground mt-1">No pending leave requests to process today.</p>
          </div>
        ) : (
          pendingLeaves.slice(0, 4).map((leave) => (
            <div
              key={leave.id}
              className="group relative rounded-2xl border border-white/15 bg-white/20 dark:bg-slate-900/30 p-4 transition-all hover:border-white/30"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="text-xs font-bold text-foreground">{leave.user?.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{leave.user?.email}</p>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {format(new Date(leave.createdAt), 'MMM d')}
                </span>
              </div>

              <div className="bg-white/10 dark:bg-slate-900/20 rounded-xl p-2.5 mb-4">
                <p className="text-xs text-muted-foreground italic leading-relaxed">
                  &quot;{leave.reason}&quot;
                </p>
                <p className="text-[10px] font-bold text-foreground mt-2 inline-flex items-center gap-1.5">
                  <Clock size={10} className="text-primary" />
                  {format(new Date(leave.startDate), 'MMM d')} - {format(new Date(leave.endDate), 'MMM d, yyyy')}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  size="xs"
                  variant="default"
                  disabled={submittingLeaveId === leave.id}
                  onClick={() => {
                    handleReviewLeave(leave.id, 'APPROVED');
                    trackEvent('leave_approval', 'decision_rendered', 'APPROVED');
                  }}
                  className="flex-1 rounded-lg text-[10px] h-8 bg-emerald-500 hover:bg-emerald-600 border-0"
                >
                  {submittingLeaveId === leave.id ? (
                    <Loader2 size={10} className="animate-spin" />
                  ) : (
                    <>
                      <Check size={12} className="mr-1" /> Approve
                    </>
                  )}
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  disabled={submittingLeaveId === leave.id}
                  onClick={() => {
                    handleReviewLeave(leave.id, 'REJECTED');
                    trackEvent('leave_approval', 'decision_rendered', 'REJECTED');
                  }}
                  className="flex-1 rounded-lg text-[10px] h-8 border-white/10 hover:bg-rose-500/10 text-rose-500"
                >
                  <XCircle size={12} className="mr-1" /> Reject
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </GlassCard>
  );

  const renderQuickActions = () => (
    <GlassCard key="quick-actions" variant="panel" padding="md" className="border-white/10">
      <h3 className="text-sm font-bold text-foreground mb-3 inline-flex items-center gap-2">
        <Sparkles size={14} className="text-amber-500 animate-pulse" />
        Quick Admin Actions
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <Link href="/shifts">
          <Button variant="outline" className="w-full text-xs h-9 justify-start rounded-xl border-white/10" onClick={() => trackEvent('dashboard', 'quick_action_click', 'schedule_shifts')}>
            📅 Schedule Shifts
          </Button>
        </Link>
        <Link href="/qa">
          <Button variant="outline" className="w-full text-xs h-9 justify-start rounded-xl border-white/10" onClick={() => trackEvent('dashboard', 'quick_action_click', 'conduct_audits')}>
            🔍 Conduct Audits
          </Button>
        </Link>
        <Link href="/reports">
          <Button variant="outline" className="w-full text-xs h-9 justify-start rounded-xl border-white/10" onClick={() => trackEvent('dashboard', 'quick_action_click', 'export_sheets')}>
            📂 Export Sheets
          </Button>
        </Link>
        <Link href="/settings">
          <Button variant="outline" className="w-full text-xs h-9 justify-start rounded-xl border-white/10" onClick={() => trackEvent('dashboard', 'quick_action_click', 'cockpit_settings')}>
            ⚙️ Cockpit Settings
          </Button>
        </Link>
      </div>
    </GlassCard>
  );

  const renderZenTimer = () => (
    <GlassCard key="zen-timer" variant="panel" padding="md" className="border-white/10 relative overflow-hidden">
      <div className="absolute top-0 right-0 h-16 w-16 bg-primary/10 rounded-full blur-xl pointer-events-none" />
      <h3 className="text-sm font-bold text-foreground mb-4 flex items-center justify-between">
        <span>Zen Focus Shift Timer</span>
        {timerActive && (
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        )}
      </h3>
      
      <div className="flex flex-col items-center py-2 space-y-4">
        <div className="relative h-32 w-32 flex items-center justify-center">
          <svg className="absolute inset-0 h-full w-full transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="54"
              className="stroke-white/10 fill-none"
              strokeWidth="6"
            />
            <circle
              cx="64"
              cy="64"
              r="54"
              className="stroke-primary fill-none transition-all duration-1000 ease-linear"
              strokeWidth="6"
              strokeDasharray={2 * Math.PI * 54}
              strokeDashoffset={2 * Math.PI * 54 * (1 - getTimerPercentage() / 100)}
              strokeLinecap="round"
            />
          </svg>
          <div className="relative text-center select-none">
            <p className="font-mono text-2xl font-bold tracking-wider text-foreground">
              {formatTime(timeRemaining)}
            </p>
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground mt-0.5 font-semibold">
              {timerType}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-white/10 dark:bg-slate-900/30 p-1 rounded-xl w-full border border-white/5">
          {(['focus', 'sprint', 'break'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                selectTimerType(type);
                trackEvent('dashboard', 'timer_type_change', type);
              }}
              className={cn(
                'flex-1 text-[10px] font-bold py-1.5 rounded-lg uppercase transition-all tracking-wide',
                timerType === type
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="flex gap-2 w-full">
          <Button
            onClick={() => {
              const next = !timerActive;
              setTimerActive(next);
              trackEvent('dashboard', next ? 'timer_started' : 'timer_paused', timerType);
            }}
            className="flex-1 text-xs h-9 rounded-xl font-semibold btn-primary"
          >
            {timerActive ? 'Pause Interval' : 'Start Interval'}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              selectTimerType(timerType);
              trackEvent('dashboard', 'timer_reset', timerType);
            }}
            className="h-9 w-9 rounded-xl border-white/10 flex items-center justify-center p-0"
            title="Reset Focus Block"
          >
            <RotateCcw size={14} />
          </Button>
          <button
            type="button"
            onClick={() => {
              setLofiActive(!lofiActive);
              trackEvent('dashboard', 'lofi_toggle', lofiActive ? 'off' : 'on');
            }}
            className={cn(
              'h-9 px-3 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition-all',
              lofiActive
                ? 'bg-violet-500/10 border-violet-500/20 text-violet-400 shadow-[0_0_12px_rgba(139,92,246,0.25)] animate-pulse'
                : 'border-white/10 text-muted-foreground hover:text-foreground'
            )}
            title="Toggle Focus Soundscape"
          >
            {lofiActive ? <Volume2 size={13} /> : <VolumeX size={13} />}
            <span>Lofi</span>
          </button>
        </div>
      </div>
    </GlassCard>
  );

  const renderWorkLogging = () => (
    <GlassCard key="work-logging" variant="panel" padding="md" className="border-white/10 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground">Shift Work Logging</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">Tickets resolved during active coverage</p>
        </div>
        <div className="flex items-center gap-2 bg-white/10 dark:bg-slate-900/30 border border-white/5 p-1 rounded-xl select-none">
          <button
            type="button"
            onClick={handleDecrementTicket}
            className="h-11 w-11 rounded-xl hover:bg-white/10 text-muted-foreground flex items-center justify-center font-bold text-lg transition-colors"
            aria-label="Decrease completed tickets"
          >
            -
          </button>
          <span className="font-mono text-sm font-bold text-foreground px-2.5 min-w-[20px] text-center">
            {completedTickets}
          </span>
          <button
            type="button"
            onClick={handleIncrementTicket}
            className="h-11 w-11 rounded-xl hover:bg-white/10 text-muted-foreground flex items-center justify-center font-bold text-lg transition-colors"
            aria-label="Increase completed tickets"
          >
            +
          </button>
        </div>
      </div>
    </GlassCard>
  );

  const renderBenchmarking = () => (
    <GlassCard key="benchmarking" variant="panel" padding="md" className="border-white/10">
      <h3 className="text-sm font-bold text-foreground mb-4">My Dashboard Benchmarking</h3>
      {personalLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full rounded-xl bg-white/10" />
          <Skeleton className="h-12 w-full rounded-xl bg-white/10" />
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-muted-foreground">My QA Index</span>
              <span className="text-foreground">{(personalScores?.monthlyScore || 100).toFixed(1)}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-300/30 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${personalScores?.monthlyScore || 100}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-muted-foreground">Team Average Bench</span>
              <span className="text-muted-foreground">{(personalScores?.averageScore || 90).toFixed(1)}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-300/30 overflow-hidden">
              <div
                className="h-full rounded-full bg-slate-500/50"
                style={{ width: `${personalScores?.averageScore || 90}%` }}
              />
            </div>
          </div>

          <div className="bg-emerald-500/10 dark:bg-emerald-500/5 rounded-2xl p-4 border border-emerald-500/20 text-center">
            <p className="text-xs text-emerald-600 dark:text-emerald-300 font-semibold inline-flex items-center gap-1.5">
              <ThumbsUp size={12} className="animate-pulse" /> Keep it up!
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              You are performing in the top {(100 - ((personalScores?.rank || 1) / (personalScores?.totalMembers || 1)) * 100).toFixed(0)}% of the shift pool this month.
            </p>
          </div>
        </div>
      )}
    </GlassCard>
  );

  const renderQuickNav = () => (
    <GlassCard key="quick-nav" variant="panel" padding="md" className="border-white/10">
      <h3 className="text-sm font-bold text-foreground mb-3">Quick Navigation</h3>
      <div className="grid grid-cols-2 gap-2">
        <Link href="/reports">
          <Button variant="outline" className="w-full text-xs h-9 justify-start rounded-xl border-white/10" onClick={() => trackEvent('dashboard', 'quick_nav_click', 'reports')}>
            📂 Log Daily Report
          </Button>
        </Link>
        <Link href="/leave">
          <Button variant="outline" className="w-full text-xs h-9 justify-start rounded-xl border-white/10" onClick={() => trackEvent('dashboard', 'quick_nav_click', 'leave')}>
            🏝️ Request Leaves
          </Button>
        </Link>
        <Link href="/shifts/my-schedule">
          <Button variant="outline" className="w-full text-xs h-9 justify-start rounded-xl border-white/10" onClick={() => trackEvent('dashboard', 'quick_nav_click', 'my_schedule')}>
            📆 View My Shifts
          </Button>
        </Link>
        <Link href="/profile">
          <Button variant="outline" className="w-full text-xs h-9 justify-start rounded-xl border-white/10" onClick={() => trackEvent('dashboard', 'quick_nav_click', 'profile')}>
            🔒 My Security
          </Button>
        </Link>
      </div>
    </GlassCard>
  );

  const renderCoaching = () => (
    <GlassCard key="coaching" variant="panel" padding="none" className="overflow-hidden">
      <div className="border-b border-white/15 px-5 py-4 md:px-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Coaching & growth opportunities</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Constructive feedback timeline from audits</p>
        </div>
        <ThumbsUp size={16} className="text-primary animate-bounce" />
      </div>

      <div className="p-4 md:p-6">
        {personalLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-xl bg-white/10" />
            <Skeleton className="h-24 w-full rounded-xl bg-white/10" />
          </div>
        ) : !personalScores?.recentScores || personalScores.recentScores.length === 0 ? (
          <div className="text-center py-10 rounded-2xl border border-dashed border-white/10">
            <p className="text-sm font-semibold text-foreground">Perfect Audit Record!</p>
            <p className="text-xs text-muted-foreground mt-1">No deductions or coaching items logged this month.</p>
          </div>
        ) : (
          <div className="relative border-l border-white/15 pl-6 ml-3 space-y-6">
            {personalScores.recentScores
              .flatMap((scoreGroup) =>
                scoreGroup.scoreEvents.map((evt) => ({
                  ...evt,
                  reportDate: scoreGroup.date,
                }))
              )
              .slice(0, 4)
              .map((event) => (
                <div key={event.id} className="relative group">
                  <div className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-800 border-2 border-white/50 dark:border-slate-900 group-hover:scale-110 transition-transform">
                    {event.severity === 'MINOR' ? (
                      <div className="h-2 w-2 rounded-full bg-amber-500" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 text-rose-500" />
                    )}
                  </div>

                  <div className="rounded-2xl border border-white/15 bg-white/25 dark:bg-slate-900/30 p-4 shadow-sm hover:border-white/25 transition-all">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <Badge
                        variant={event.severity === 'MINOR' ? 'warning' : 'danger'}
                        label={event.severity === 'MINOR' ? 'Minor Audit Highlight' : 'Critical Focus Item'}
                      />
                      <span className="text-[10px] text-muted-foreground font-mono">
                        Audit on {format(new Date(event.reportDate), 'MMM d, yyyy')}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-foreground leading-normal">
                      {event.reason}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed bg-white/10 dark:bg-slate-800/20 p-2.5 rounded-xl border border-white/5">
                      <strong className="text-foreground">Coaching Insight:</strong>{' '}
                      {event.adminNote || 'Maintain consistent performance across all support channels.'}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </GlassCard>
  );

  const renderAdminWidget = (id: string) => {
    switch (id) {
      case 'leaderboard': return renderLeaderboard();
      case 'system-status': return renderSystemStatus();
      case 'leave-dispatch': return renderLeaveDispatch();
      case 'quick-actions': return renderQuickActions();
      default: return null;
    }
  };

  const renderMemberWidget = (id: string) => {
    switch (id) {
      case 'zen-timer': return renderZenTimer();
      case 'work-logging': return renderWorkLogging();
      case 'benchmarking': return renderBenchmarking();
      case 'quick-nav': return renderQuickNav();
      case 'coaching': return renderCoaching();
      default: return null;
    }
  };

  useEffect(() => {
    if (!isAdminView || userLoading || !user) return;
    const fetchPendingAudits = async () => {
      try {
        const res = await fetch('/api/reports?status=SUBMITTED');
        if (res.ok) {
          const data = await res.json();
          setPendingAuditsCount(data.total || data.reports?.length || 0);
        }
      } catch (err) {
        console.error('Failed to fetch pending audits:', err);
      }
    };
    fetchPendingAudits();
  }, [isAdminView, userLoading, user]);

  useEffect(() => {
    if (isAdminView || userLoading || !user) return;

    const fetchTodayReport = async () => {
      try {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const res = await fetch(`/api/reports?date=${todayStr}`);
        if (res.ok) {
          const data = await res.json();
          const todayReport = data.reports?.[0] || null;
          setReport(todayReport);
          if (todayReport) {
            const ticketCount = todayReport.entries?.filter((e: any) => e.type === 'TICKET').length || 0;
            setCompletedTickets(ticketCount);
          }
        }
      } catch (err) {
        console.error('Failed to fetch today report:', err);
      }
    };

    fetchTodayReport();
  }, [isAdminView, userLoading, user]);

  const handleIncrementTicket = async () => {
    if (userLoading || !user) return;
    
    setCompletedTickets((prev) => prev + 1);
    trackEvent('dashboard', 'ticket_logged_increment');

    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      let currentReport = report;

      if (!currentReport) {
        const resCreate = await fetch('/api/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: todayStr }),
        });

        if (resCreate.ok) {
          const dataCreate = await resCreate.json();
          currentReport = dataCreate.reports?.[0] || dataCreate;
          setReport(currentReport);
        } else if (resCreate.status === 409) {
          const resFetch = await fetch(`/api/reports?date=${todayStr}`);
          if (resFetch.ok) {
            const dataFetch = await resFetch.json();
            currentReport = dataFetch.reports?.[0] || null;
            setReport(currentReport);
          }
        }
      }

      if (!currentReport) {
        showToast('Failed to initialize today\'s report draft', 'error');
        setCompletedTickets((prev) => Math.max(0, prev - 1));
        return;
      }

      const refId = `TKT-QL-${Math.floor(1000 + Math.random() * 9000)}`;
      const resEntry = await fetch(`/api/reports/${currentReport.id}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'TICKET',
          referenceId: refId,
          status: 'SOLVED',
          note: 'Quick logged ticket from dashboard',
          pendingReason: '',
        }),
      });

      if (resEntry.ok) {
        const newEntry = await resEntry.json();
        setReport({
          ...currentReport,
          entries: [...(currentReport.entries || []), newEntry].filter(Boolean),
        });
        showToast(`Ticket logged: ${refId}. Draft updated.`, 'success');
      } else {
        throw new Error('Failed to create entry');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to log ticket to daily report', 'error');
      setCompletedTickets((prev) => Math.max(0, prev - 1));
    }
  };

  const handleDecrementTicket = async () => {
    if (!report || completedTickets === 0) return;

    const ticketEntries = report.entries?.filter((e: any) => e.type === 'TICKET') || [];
    if (ticketEntries.length === 0) {
      setCompletedTickets(0);
      return;
    }

    const lastTicket = ticketEntries[ticketEntries.length - 1];
    
    setCompletedTickets((prev) => Math.max(0, prev - 1));
    trackEvent('dashboard', 'ticket_logged_decrement');

    try {
      const resDelete = await fetch(`/api/reports/${report.id}/entries/${lastTicket.id}`, {
        method: 'DELETE',
      });

      if (resDelete.ok) {
        setReport({
          ...report,
          entries: report.entries.filter((e: any) => e.id !== lastTicket.id),
        });
        showToast(`Removed entry: ${lastTicket.referenceId}`, 'success');
      } else {
        throw new Error('Failed to delete entry');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to delete ticket from report', 'error');
      setCompletedTickets((prev) => prev + 1);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0) {
      setTimerActive(false);
      showToast('Focus block completed! Outstanding work.', 'success');
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, timeRemaining]);

  const selectTimerType = (type: 'focus' | 'break' | 'sprint') => {
    setTimerActive(false);
    setTimerType(type);
    if (type === 'focus') setTimeRemaining(1500); // 25 mins
    else if (type === 'break') setTimeRemaining(300); // 5 mins
    else if (type === 'sprint') setTimeRemaining(2700); // 45 mins
  };

  const getTimerPercentage = () => {
    const total = timerType === 'focus' ? 1500 : timerType === 'break' ? 300 : 2700;
    return ((total - timeRemaining) / total) * 100;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Analytics summaries
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // Admin states
  const [pendingLeaves, setPendingLeaves] = useState<PendingLeave[]>([]);
  const [leavesLoading, setLeavesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [submittingLeaveId, setSubmittingLeaveId] = useState<string | null>(null);

  // Member states
  const [personalScores, setPersonalScores] = useState<PersonalScoring | null>(null);
  const [personalLoading, setPersonalLoading] = useState(false);



  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch(`/api/analytics/summary`, { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          if (data) setAnalytics(data);
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setAnalyticsLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  // Fetch admin-specific data
  useEffect(() => {
    if (!isAdminView || userLoading) return;

    const fetchPendingLeaves = async () => {
      setLeavesLoading(true);
      try {
        const response = await fetch('/api/leave?status=PENDING');
        if (response.ok) {
          const data = await response.json();
          setPendingLeaves(data.leaveRequests || []);
        }
      } catch (error) {
        console.error('Failed to fetch pending leaves:', error);
      } finally {
        setLeavesLoading(false);
      }
    };

    fetchPendingLeaves();
  }, [isAdminView, userLoading]);

  // Fetch member-specific data
  useEffect(() => {
    if (isAdminView || userLoading) return;

    const fetchPersonalScores = async () => {
      setPersonalLoading(true);
      try {
        const response = await fetch('/api/scoring/my-scores');
        if (response.ok) {
          const data = await response.json();
          setPersonalScores(data);
        }
      } catch (error) {
        console.error('Failed to fetch personal scoring data:', error);
      } finally {
        setPersonalLoading(false);
      }
    };

    fetchPersonalScores();
  }, [isAdminView, userLoading]);

  const handleReviewLeave = async (leaveId: string, status: 'APPROVED' | 'REJECTED') => {
    setSubmittingLeaveId(leaveId);
    try {
      const response = await fetch(`/api/leave/${leaveId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${status.toLowerCase()} leave request`);
      }

      showToast(`Leave request ${status === 'APPROVED' ? 'approved' : 'rejected'} successfully`, 'success');
      
      // Optimistic UI updates
      setPendingLeaves((prev) => prev.filter((leave) => leave.id !== leaveId));
      if (analytics?.kpi) {
        setAnalytics({
          ...analytics,
          kpi: {
            ...analytics.kpi,
            pendingLeaves: Math.max(0, analytics.kpi.pendingLeaves - 1),
          },
        });
      }
    } catch (error) {
      handleApiError(error, 'Review Leave');
    } finally {
      setSubmittingLeaveId(null);
    }
  };

  if (userLoading) {
    return (
      <div className="space-y-8 max-w-6xl mx-auto pb-12 p-4 animate-pulse">
        <div className="flex justify-between items-end mb-8">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24 rounded bg-white/10" />
            <Skeleton className="h-8 w-48 rounded bg-white/10" />
            <Skeleton className="h-4 w-72 rounded bg-white/10" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl bg-white/10" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Skeleton className="h-[400px] w-full rounded-2xl bg-white/10" />
          <div className="space-y-6">
            <Skeleton className="h-32 w-full rounded-2xl bg-white/10" />
            <Skeleton className="h-64 w-full rounded-2xl bg-white/10" />
          </div>
        </div>
      </div>
    );
  }

  const metricCards = isAdminView
    ? [
        {
          title: 'Total Team Reports',
          value: analytics?.kpi?.totalReports || 0,
          icon: <FileText size={18} />,
          color: 'primary',
          change: 12,
          href: '/reports',
        },
        {
          title: 'Team Avg QA Score',
          value: analytics?.kpi?.avgScore ? `${analytics.kpi.avgScore.toFixed(1)}%` : '0.0%',
          icon: <TrendingUp size={18} />,
          color: 'warning',
          change: 3,
          href: '/qa',
        },
        {
          title: 'Pending Leaves',
          value: analytics?.kpi?.pendingLeaves || 0,
          icon: <CalendarDays size={18} />,
          color: 'accent',
          change: 0,
          href: '/leave',
        },
        {
          title: 'Active Team Size',
          value: analytics?.kpi?.activeMembers || 0,
          icon: <Users size={18} />,
          color: 'success',
          change: 5,
          href: '/team',
        },
      ]
    : [
        {
          title: 'My Reports Submitted',
          value: personalScores?.totalReports || 0,
          icon: <FileText size={18} />,
          color: 'primary',
          change: 8,
          href: '/reports',
        },
        {
          title: 'My Quality Standing',
          value: personalScores?.monthlyScore ? `${personalScores.monthlyScore.toFixed(1)}%` : '100%',
          icon: <TrendingUp size={18} />,
          color: 'warning',
          change: 2,
          href: '/scoring',
        },
        {
          title: 'Tickets Logged Today',
          value: completedTickets,
          icon: <CheckCircle2 size={18} />,
          color: 'accent',
          change: 15,
          href: '/reports',
        },
        {
          title: 'My Team Rank',
          value: personalScores?.rank ? `#${personalScores.rank} of ${personalScores.totalMembers}` : 'N/A',
          icon: <Users size={18} />,
          color: 'success',
          change: 0,
          href: '/scoring',
        },
      ];

  const filteredLeaderboard = analytics?.leaderboard
    ? analytics.leaderboard.filter((row) =>
        row.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Build suggestions for cockpit
  const suggestions = [];
  if (!isAdminView) {
    if (!report) {
      suggestions.push({
        id: 'start-report',
        title: "Start today's daily report draft",
        description: "You haven't initialized today's activity log yet.",
        actionLabel: "Start Draft",
        action: async () => {
          try {
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            const res = await fetch('/api/reports', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ date: todayStr }),
            });
            if (res.ok) {
              const data = await res.json();
              const newReport = data.reports?.[0] || data;
              setReport(newReport);
              showToast("Today's report draft initialized", 'success');
              router.push('/reports');
            } else {
              throw new Error('Failed to initialize report');
            }
          } catch (err) {
            console.error(err);
            showToast('Failed to start report draft', 'error');
          }
        },
        icon: <FileText className="text-indigo-400 w-4 h-4" />,
      });
    } else if (report.status === 'DRAFT') {
      const entryCount = report.entries?.length || 0;
      suggestions.push({
        id: 'finish-report',
        title: `Finish logging today's report (${entryCount} entries logged)`,
        description: "Your daily report is still in Draft status. Complete and submit it when your shift ends.",
        actionLabel: "Go to Report",
        href: '/reports',
        icon: <FileText className="text-amber-400 w-4 h-4" />,
      });
    }

    suggestions.push({
      id: 'view-shifts',
      title: "Verify your upcoming shift coverage",
      description: "Ensure your shift calendar is aligned with active targets.",
      actionLabel: "View Schedule",
      href: '/shifts/my-schedule',
      icon: <CalendarDays className="text-emerald-400 w-4 h-4" />,
    });
  } else {
    if (pendingLeaves.length > 0) {
      suggestions.push({
        id: 'review-leaves',
        title: `Review ${pendingLeaves.length} pending leave requests`,
        description: "Team members have submitted time-off requests waiting for your approval.",
        actionLabel: "Manage Leaves",
        href: '/leave',
        icon: <CalendarDays className="text-rose-400 w-4 h-4" />,
      });
    }
    if (pendingAuditsCount > 0) {
      suggestions.push({
        id: 'review-audits',
        title: `Resume auditing (${pendingAuditsCount} reports pending review)`,
        description: "Agent shift logs have been submitted and are awaiting QA scoring.",
        actionLabel: "Review Audits",
        href: '/qa',
        icon: <CheckCircle2 className="text-indigo-400 w-4 h-4" />,
      });
    }

    suggestions.push({
      id: 'schedule-shifts',
      title: "Review team coverage requirements",
      description: "Manage upcoming shift schedules and check coverage gaps.",
      actionLabel: "Configure Shifts",
      href: '/shifts',
      icon: <Users className="text-cyan-400 w-4 h-4" />,
    });
  }

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
        <div>
          <div className="mb-2">
            <Badge variant="info" label={isAdminView ? 'Admin Dashboard' : 'Member Dashboard'} />
          </div>
          <h2 className="text-2xl font-bold font-heading">
            Welcome back, {user?.name ? user.name.split(' ')[0] : 'Operator'}
          </h2>
          <p className="text-muted-foreground text-sm font-sans">
            {isAdminView
              ? "Here's an operational cockpit of your team activity and scheduling performance today."
              : "Maintain complete focus. Here's your structured, stress-free snapshot for shift performance."}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setCustomizeOpen(!customizeOpen);
            trackEvent('dashboard', 'customize_panel_toggle', customizeOpen ? 'close' : 'open');
          }}
          className="rounded-xl border-white/20 hover:bg-white/5 flex items-center gap-2"
        >
          <Sliders size={14} />
          Customize Workspace
        </Button>
      </div>

      {/* CUSTOMIZE DRAWER */}
      <AnimatePresence>
        {customizeOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <GlassCard variant="panel" padding="md" className="border-white/25 bg-white/10 dark:bg-slate-900/40">
              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <Sliders size={14} className="text-primary" />
                Configure Dashboard Layout
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Toggle widget visibility or use the reorder buttons to customize your daily cockpit view. Preferences are auto-saved.
              </p>
              <div className="space-y-2.5 max-w-xl">
                {widgets.map((widget, index) => (
                  <div key={widget.id} className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={widget.visible}
                        onChange={() => {
                          toggleVisibility(widget.id);
                          trackEvent('dashboard', 'widget_visibility_toggle', widget.id, widget.visible ? 0 : 1);
                        }}
                        className="accent-primary h-4 w-4 rounded cursor-pointer"
                        id={`check-${widget.id}`}
                      />
                      <label htmlFor={`check-${widget.id}`} className="text-xs font-semibold text-foreground cursor-pointer select-none">
                        {widget.title}
                      </label>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="xs"
                        variant="ghost"
                        disabled={index === 0}
                        onClick={() => {
                          moveWidget(index, index - 1);
                          trackEvent('dashboard', 'widget_reorder', 'up', index);
                        }}
                        className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30"
                      >
                        ▲
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        disabled={index === widgets.length - 1}
                        onClick={() => {
                          moveWidget(index, index + 1);
                          trackEvent('dashboard', 'widget_reorder', 'down', index);
                        }}
                        className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30"
                      >
                        ▼
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SUGGESTED ACTIONS COCKPIT */}
      {suggestions.length > 0 && (
        <section className="mb-6">
          <GlassCard variant="panel" padding="md" className="border-white/20 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-indigo-400 animate-pulse" />
              <h3 className="text-xs font-semibold text-foreground tracking-wider uppercase">Suggested Actions Cockpit</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {suggestions.map((sug) => (
                <div key={sug.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-white/10 mt-0.5">
                      {sug.icon}
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold text-foreground">{sug.title}</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{sug.description}</p>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {sug.href ? (
                      <Link href={sug.href}>
                        <Button size="xs" variant="default" className="w-full sm:w-auto h-8 px-4 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md">
                          {sug.actionLabel}
                        </Button>
                      </Link>
                    ) : (
                      <Button size="xs" variant="default" onClick={sug.action} className="w-full sm:w-auto h-8 px-4 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md">
                        {sug.actionLabel}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </section>
      )}

      {/* METRICS HUD GRID */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {analyticsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px] w-full rounded-[1.25rem] bg-white/10 dark:bg-slate-900/30 border border-white/10" />
          ))
        ) : (
          metricCards.map((metric) => (
            <Link href={metric.href} key={metric.title} className="block transition-transform duration-200 hover:scale-[1.02] cursor-pointer">
              <StatCard 
                title={metric.title} 
                value={metric.value as number} 
                icon={metric.icon} 
                color={metric.color as any} 
                change={metric.change} 
              />
            </Link>
          ))
        )}
      </section>

      {/* DUAL DASHBOARD VIEWPORT */}
      {isAdminView ? (
        /* ==================== ADMIN COCKPIT LAYOUT ==================== */
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(350px,0.8fr)]">
          {/* LEFT COLUMN */}
          <div className="space-y-6">
            {widgets
              .filter((w) => w.visible && (w.id === 'leaderboard' || w.id === 'leave-dispatch'))
              .map((w) => renderAdminWidget(w.id))}
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
            {widgets
              .filter((w) => w.visible && (w.id === 'system-status' || w.id === 'quick-actions'))
              .map((w) => renderAdminWidget(w.id))}
          </div>
        </section>
      ) : (
        /* ==================== MEMBER ZEN GARDEN LAYOUT ==================== */
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(350px,0.8fr)]">
          {/* DAILY FOCUS BANNER & QA COACHING OPPORTUNITIES */}
          <div className="space-y-6">
            {/* STRESS-FREE CALM BANNER */}
            <GlassCard
              variant="panel"
              padding="lg"
              className="relative overflow-hidden border-white/15 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent"
            >
              <div className="absolute top-0 right-0 h-32 w-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 space-y-3">
                <Badge variant="purple" label="✨ Daily Zen Focus Mode" className="glass-pill border-primary/30 text-white px-3 py-1.5" />
                <h2 className="text-2xl font-bold text-foreground">Keep customer satisfaction high today.</h2>
                <p className="text-sm text-muted-foreground max-w-xl">
                  Take it one support ticket at a time. The team has checked in, shift scheduling is running smoothly,
                  and we are matching all coverage targets today.
                </p>
                <div className="flex flex-wrap gap-4 pt-2">
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-white/10 dark:bg-slate-900/30 px-3 py-1.5 rounded-full">
                    <Clock size={12} className="text-primary" /> Active Shift Coverage
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-white/10 dark:bg-slate-900/30 px-3 py-1.5 rounded-full">
                    <UserCheck size={12} className="text-emerald-500" /> QA Level Stable
                  </span>
                </div>
              </div>
            </GlassCard>

            {widgets
              .filter((w) => w.visible && w.id === 'coaching')
              .map((w) => renderMemberWidget(w.id))}
          </div>

          {/* BENCHMARK COMPARE & QUICK SUBMISSIONS */}
          <div className="space-y-6">
            {widgets
              .filter((w) => w.visible && w.id !== 'coaching')
              .map((w) => renderMemberWidget(w.id))}
          </div>
        </section>
      )}
    </div>
  );
}


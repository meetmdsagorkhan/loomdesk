'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import {
  FileText,
  Users,
  TrendingUp,
  AlertCircle,
  Calendar,
  Award,
  Loader2,
  Crown,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { isAdmin, isTeamLead } from '@/lib/auth-utils';
import { handleApiError } from '@/lib/error-handler';
import { BentoGrid, BentoCard } from '@/components/shared/BentoGrid';
import PageHeader from '@/components/shared/PageHeader';
import GlassCard from '@/components/shared/GlassCard';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type AnalyticsData = {
  kpi: {
    totalReports: number;
    attendanceRate: number;
    avgScore: number;
    totalDeductions: number;
    pendingLeaves: number;
    activeMembers: number;
  };
  dailyReports: { date: string; count: number }[];
  attendanceBreakdown: {
    name: string;
    present: number;
    late: number;
    absent: number;
    leave: number;
  }[];
  weeklyScoreTrend: { week: string; avgScore: number }[];
  entryDistribution: {
    tickets: number;
    chats: number;
  };
  leaderboard: {
    name: string;
    reports: number;
    avgScore: number;
    deductions: number;
    attendanceRate: number;
  }[];
};

function AnalyticsContent() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useCurrentUser();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30days');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      let startDate: string | undefined;
      let endDate: string | undefined;

      const now = new Date();

      switch (dateRange) {
        case '7days':
          startDate = subDays(now, 7).toISOString().split('T')[0];
          endDate = now.toISOString().split('T')[0];
          break;
        case '30days':
          startDate = subDays(now, 30).toISOString().split('T')[0];
          endDate = now.toISOString().split('T')[0];
          break;
        case 'thisMonth':
          startDate = startOfMonth(now).toISOString().split('T')[0];
          endDate = endOfMonth(now).toISOString().split('T')[0];
          break;
        case 'custom':
          startDate = customStart;
          endDate = customEnd;
          break;
      }

      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/analytics/summary?${params}`);
      
      if (!response.ok) {
        handleApiError('Failed to fetch analytics data', 'Analytics Dashboard');
        return;
      }
      
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      handleApiError(error, 'Analytics Dashboard');
      setAnalytics(null);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, customStart, customEnd]);

  useEffect(() => {
    if (userLoading) return;
    if (!mounted) return;

    if (!user || (!isAdmin({ user }) && !isTeamLead({ user }))) {
      router.push('/dashboard');
      return;
    }

    fetchAnalytics();
  }, [user, userLoading, router, mounted, fetchAnalytics]);

  useEffect(() => {
    if (!mounted || userLoading) return;
    if (!user || (!isAdmin({ user }) && !isTeamLead({ user }))) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchAnalytics();
      }
    };

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchAnalytics();
      }
    }, 30000);

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [mounted, userLoading, user, fetchAnalytics]);

  // Prevent SSR rendering
  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (userLoading || isLoading || !mounted) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Failed to load analytics data</p>
        </div>
      </div>
    );
  }

  const getTooltipValue = (
    value: number | string | readonly (number | string)[] | undefined
  ) => {
    if (Array.isArray(value)) {
      return value.join(', ');
    }

    return value ?? 0;
  };

  const formatCountTooltip = (value: number | string | readonly (number | string)[] | undefined) =>
    [`${getTooltipValue(value)} reports`, 'Count'] as [string, string];

  const formatScoreTooltip = (value: number | string | readonly (number | string)[] | undefined) =>
    [`${getTooltipValue(value)}%`, 'Score'] as [string, string];

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Analytics Dashboard"
        title="Team performance insights"
        subtitle="Monitor key performance indicators, track trends, and analyze team productivity data."
      />

      {/* Date Range Filter */}
      <GlassCard variant="default" padding="sm">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Date Range:</span>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={dateRange === '7days' ? 'default' : 'outline'}
              onClick={() => setDateRange('7days')}
              className="rounded-xl"
            >
              Last 7 days
            </Button>
            <Button
              size="sm"
              variant={dateRange === '30days' ? 'default' : 'outline'}
              onClick={() => setDateRange('30days')}
              className="rounded-xl"
            >
              Last 30 days
            </Button>
            <Button
              size="sm"
              variant={dateRange === 'thisMonth' ? 'default' : 'outline'}
              onClick={() => setDateRange('thisMonth')}
              className="rounded-xl"
            >
              This month
            </Button>
            <Button
              size="sm"
              variant={dateRange === 'custom' ? 'default' : 'outline'}
              onClick={() => setDateRange('custom')}
              className="rounded-xl"
            >
              Custom
            </Button>
          </div>
          {dateRange === 'custom' && (
            <div className="flex gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
              <span className="text-muted-foreground">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
          )}
        </div>
      </GlassCard>

      {/* KPI Cards - Bento Grid */}
      <section>
        <BentoGrid>
          <BentoCard>
            <div className="flex items-center justify-between mb-2">
              <FileText size={20} className="text-primary" />
              <span className="text-xs text-muted-foreground">Period</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{analytics.kpi.totalReports}</div>
            <div className="text-sm text-muted-foreground">Reports</div>
          </BentoCard>

          <BentoCard>
            <div className="flex items-center justify-between mb-2">
              <TrendingUp size={20} className="text-success" />
              <span className="text-xs text-muted-foreground">Rate</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{analytics.kpi.attendanceRate}%</div>
            <div className="text-sm text-muted-foreground">Attendance</div>
          </BentoCard>

          <BentoCard>
            <div className="flex items-center justify-between mb-2">
              <Award size={20} className="text-warning" />
              <span className="text-xs text-muted-foreground">Avg</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{analytics.kpi.avgScore}</div>
            <div className="text-sm text-muted-foreground">QA Score</div>
          </BentoCard>

          <BentoCard>
            <div className="flex items-center justify-between mb-2">
              <AlertCircle size={20} className="text-destructive" />
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{analytics.kpi.totalDeductions}</div>
            <div className="text-sm text-muted-foreground">Deductions</div>
          </BentoCard>

          <BentoCard>
            <div className="flex items-center justify-between mb-2">
              <Calendar size={20} className="text-info" />
              <span className="text-xs text-muted-foreground">Pending</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{analytics.kpi.pendingLeaves}</div>
            <div className="text-sm text-muted-foreground">Leave Requests</div>
          </BentoCard>

          <BentoCard>
            <div className="flex items-center justify-between mb-2">
              <Users size={20} className="text-primary" />
              <span className="text-xs text-muted-foreground">Active</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{analytics.kpi.activeMembers}</div>
            <div className="text-sm text-muted-foreground">Members</div>
          </BentoCard>
        </BentoGrid>
      </section>

      {/* Charts - Bento Grid */}
      <section>
        <BentoGrid>
          <BentoCard colSpan={2}>
            <h2 className="text-lg font-semibold text-foreground mb-4">Daily Reports</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.dailyReports}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-xs text-muted-foreground" />
                <YAxis className="text-xs text-muted-foreground" />
                <Tooltip
                  formatter={formatCountTooltip}
                  labelFormatter={(label) => format(new Date(label), 'MMM d')}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </BentoCard>

          <BentoCard>
            <h2 className="text-lg font-semibold text-foreground mb-4">Entry Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Tickets', value: analytics.entryDistribution.tickets },
                    { name: 'Chats', value: analytics.entryDistribution.chats },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="hsl(var(--primary))" />
                  <Cell fill="hsl(var(--info))" />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </BentoCard>

          <BentoCard>
            <h2 className="text-lg font-semibold text-foreground mb-4">Attendance Breakdown</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.attendanceBreakdown}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs text-muted-foreground" />
                <YAxis className="text-xs text-muted-foreground" />
                <Tooltip />
                <Legend />
                <Bar dataKey="present" stackId="a" fill="hsl(var(--success))" name="Present" />
                <Bar dataKey="late" stackId="a" fill="hsl(var(--warning))" name="Late" />
                <Bar dataKey="absent" stackId="a" fill="hsl(var(--destructive))" name="Absent" />
                <Bar dataKey="leave" stackId="a" fill="hsl(var(--info))" name="Leave" />
              </BarChart>
            </ResponsiveContainer>
          </BentoCard>

          <BentoCard colSpan={2}>
            <h2 className="text-lg font-semibold text-foreground mb-4">QA Score Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics.weeklyScoreTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="week" className="text-xs text-muted-foreground" />
                <YAxis className="text-xs text-muted-foreground" />
                <Tooltip formatter={formatScoreTooltip} />
                <Area
                  type="monotone"
                  dataKey="avgScore"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </BentoCard>
        </BentoGrid>
      </section>

      {/* Member Leaderboard */}
      <GlassCard variant="panel" padding="none" className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-white/15 px-5 py-4 md:px-6">
          <h2 className="text-lg font-semibold text-foreground">Member Leaderboard</h2>
          <span className="glass-pill rounded-full px-3 py-1 text-xs font-semibold text-muted-foreground">
            Ranked by score
          </span>
        </div>

        <div className="hidden md:block p-4 md:p-6">
          <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/25 shadow-[0_16px_48px_rgba(76,92,148,0.16)] dark:bg-slate-900/30 backdrop-blur-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/20 bg-white/35 dark:bg-white/5 backdrop-blur-sm">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Rank</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Member</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Reports</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Avg Score</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Deductions</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Attendance</th>
                </tr>
              </thead>
              <tbody>
                {analytics.leaderboard.map((member, index) => (
                  <tr
                    key={index}
                    className="border-b border-white/15 last:border-0 transition-colors hover:bg-white/35 dark:hover:bg-white/5 backdrop-blur-sm"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {index === 0 && <Crown size={16} className="text-warning" />}
                        <span className="text-sm font-semibold text-foreground">{index + 1}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-medium text-foreground">{member.name}</td>
                    <td className="px-5 py-3.5 text-sm text-foreground">{member.reports}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        member.avgScore >= 90 ? 'bg-success/20 text-success' :
                        member.avgScore >= 70 ? 'bg-warning/20 text-warning' :
                        'bg-destructive/20 text-destructive'
                      }`}>
                        {member.avgScore}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex rounded-full bg-destructive/15 px-2.5 py-1 text-xs font-semibold text-destructive">
                        {member.deductions}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">
                        {member.attendanceRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-3 p-4 md:hidden">
          {analytics.leaderboard.map((member, index) => (
            <div
              key={`${member.name}-${index}`}
              className="glass-card rounded-2xl border border-white/20 bg-gradient-to-br from-white/40 via-white/20 to-transparent p-4 shadow-[0_8px_32px_rgba(76,92,148,0.12)] dark:shadow-none backdrop-blur-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">{member.name}</p>
                <span className="text-xs font-semibold text-muted-foreground">#{index + 1}</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Reports</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{member.reports}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Score</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{member.avgScore}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Attendance</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{member.attendanceRate}%</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

export default function AnalyticsPage() {
  return <AnalyticsContent />;
}

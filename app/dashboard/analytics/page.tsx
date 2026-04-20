'use client';

import { useState, useEffect, useEffectEvent } from 'react';
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

  useEffect(() => {
    if (userLoading) return;
    if (!mounted) return;

    if (!user || (!isAdmin({ user }) && !isTeamLead({ user }))) {
      router.push('/dashboard');
      return;
    }

    fetchAnalytics();
  }, [user, userLoading, router, dateRange, customStart, customEnd, mounted]);

  const fetchAnalytics = useEffectEvent(async () => {
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
  });

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
      {/* Header */}
      <section className="rounded-3xl border border-border/60 bg-card/80 p-6 card-elevation-md backdrop-blur-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
            Analytics Dashboard
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            Team performance insights
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Monitor key performance indicators, track trends, and analyze team productivity data.
          </p>
        </div>
      </section>

      {/* Date Range Filter */}
      <section className="rounded-3xl border border-border/60 bg-card/80 p-4 card-elevation-md backdrop-blur-sm">
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
      </section>

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
      <section className="rounded-3xl border border-border/60 bg-card/80 overflow-hidden card-elevation-md backdrop-blur-sm">
        <div className="border-b border-border/60 p-6">
          <h2 className="text-lg font-semibold text-foreground">Member Leaderboard</h2>
        </div>
        <div className="overflow-x-auto p-6">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/60">
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Rank</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Member</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Reports</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Avg Score</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Deductions</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Attendance Rate</th>
              </tr>
            </thead>
            <tbody>
              {analytics.leaderboard.map((member, index) => (
                <tr key={index} className="border-b border-border/40 last:border-0 hover:bg-muted/30">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {index === 0 && <Crown size={16} className="text-warning" />}
                      <span className="text-sm font-medium text-foreground">{index + 1}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">{member.name}</td>
                  <td className="px-6 py-4 text-sm text-foreground">{member.reports}</td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-medium ${
                      member.avgScore >= 90 ? 'text-success' :
                      member.avgScore >= 70 ? 'text-warning' :
                      'text-destructive'
                    }`}>
                      {member.avgScore}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-destructive">{member.deductions}</td>
                  <td className="px-6 py-4 text-sm text-foreground">{member.attendanceRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default function AnalyticsPage() {
  return <AnalyticsContent />;
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import {
  FileText,
  Users,
  TrendingUp,
  AlertCircle,
  Calendar,
  Award,
  Loader2,
  Crown,
  ChevronDown,
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

  const fetchAnalytics = async () => {
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
        throw new Error('Failed to fetch analytics data');
      }
      
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setAnalytics(null);
    } finally {
      setIsLoading(false);
    }
  };

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

  const COLORS = ['#6366f1', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Analytics Dashboard</h1>
        <p className="text-muted-foreground mt-1">Team performance insights</p>
      </div>

      {/* Date Range Filter */}
      <div className="bg-card rounded-2xl border border-border p-4">
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
            >
              Last 7 days
            </Button>
            <Button
              size="sm"
              variant={dateRange === '30days' ? 'default' : 'outline'}
              onClick={() => setDateRange('30days')}
            >
              Last 30 days
            </Button>
            <Button
              size="sm"
              variant={dateRange === 'thisMonth' ? 'default' : 'outline'}
              onClick={() => setDateRange('thisMonth')}
            >
              This month
            </Button>
            <Button
              size="sm"
              variant={dateRange === 'custom' ? 'default' : 'outline'}
              onClick={() => setDateRange('custom')}
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
                className="px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm"
              />
              <span className="text-muted-foreground">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-2">
            <FileText size={20} className="text-primary" />
            <span className="text-xs text-muted-foreground">Period</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{analytics.kpi.totalReports}</div>
          <div className="text-sm text-muted-foreground">Reports</div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp size={20} className="text-green-500" />
            <span className="text-xs text-muted-foreground">Rate</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{analytics.kpi.attendanceRate}%</div>
          <div className="text-sm text-muted-foreground">Attendance</div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-2">
            <Award size={20} className="text-amber-500" />
            <span className="text-xs text-muted-foreground">Avg</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{analytics.kpi.avgScore}</div>
          <div className="text-sm text-muted-foreground">QA Score</div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-2">
            <AlertCircle size={20} className="text-destructive" />
            <span className="text-xs text-muted-foreground">Total</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{analytics.kpi.totalDeductions}</div>
          <div className="text-sm text-muted-foreground">Deductions</div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-2">
            <Calendar size={20} className="text-blue-500" />
            <span className="text-xs text-muted-foreground">Pending</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{analytics.kpi.pendingLeaves}</div>
          <div className="text-sm text-muted-foreground">Leave Requests</div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-2">
            <Users size={20} className="text-purple-500" />
            <span className="text-xs text-muted-foreground">Active</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{analytics.kpi.activeMembers}</div>
          <div className="text-sm text-muted-foreground">Members</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Reports Line Chart */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="text-lg font-medium text-foreground mb-4">Daily Reports</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.dailyReports}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" className="text-xs text-muted-foreground" />
              <YAxis className="text-xs text-muted-foreground" />
              <Tooltip
                formatter={(value: any, name: any) => [`${value || 0} reports`, 'Count']}
                labelFormatter={(label) => format(new Date(label), 'MMM d')}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Attendance Breakdown Bar Chart */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="text-lg font-medium text-foreground mb-4">Attendance Breakdown</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.attendanceBreakdown}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" className="text-xs text-muted-foreground" />
              <YAxis className="text-xs text-muted-foreground" />
              <Tooltip />
              <Legend />
              <Bar dataKey="present" stackId="a" fill="#22c55e" name="Present" />
              <Bar dataKey="late" stackId="a" fill="#f59e0b" name="Late" />
              <Bar dataKey="absent" stackId="a" fill="#ef4444" name="Absent" />
              <Bar dataKey="leave" stackId="a" fill="#3b82f6" name="Leave" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* QA Score Trend Area Chart */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="text-lg font-medium text-foreground mb-4">QA Score Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analytics.weeklyScoreTrend}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="week" className="text-xs text-muted-foreground" />
              <YAxis className="text-xs text-muted-foreground" />
              <Tooltip formatter={(value: any, name: any) => [`${value}%`, 'Score']} />
              <Area
                type="monotone"
                dataKey="avgScore"
                stroke="#6366f1"
                fill="#6366f1"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Entry Type Distribution Pie Chart */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="text-lg font-medium text-foreground mb-4">Entry Type Distribution</h2>
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
                <Cell fill="#6366f1" />
                <Cell fill="#3b82f6" />
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Member Leaderboard */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-medium text-foreground">Member Leaderboard</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
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
                <tr key={index} className="border-b border-border last:border-0">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {index === 0 && <Crown size={16} className="text-amber-500" />}
                      <span className="text-sm font-medium text-foreground">{index + 1}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">{member.name}</td>
                  <td className="px-6 py-4 text-sm text-foreground">{member.reports}</td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-medium ${
                      member.avgScore >= 90 ? 'text-green-600' :
                      member.avgScore >= 70 ? 'text-amber-600' :
                      'text-red-600'
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
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  // Prevent SSR completely
  if (typeof window === 'undefined') {
    return null;
  }
  return <AnalyticsContent />;
}

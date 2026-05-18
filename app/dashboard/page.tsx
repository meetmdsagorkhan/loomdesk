'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Medal,
  FileText,
  Loader2,
  TrendingUp,
  CheckCircle,
  CalendarDays,
  Users,
} from 'lucide-react';
import StatCard from '@/components/shared/StatCard';
import PageHeader from '@/components/shared/PageHeader';
import GlassCard from '@/components/shared/GlassCard';
import { useCurrentUser } from '@/hooks/useCurrentUser';

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

import { API_URL } from '@/lib/api-config';

export default function DashboardPage() {
  const { user, isLoading: userLoading } = useCurrentUser();
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const role = user?.role || 'MEMBER';
  const isAdminView = role === 'ADMIN' || role === 'TEAM_LEAD';

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch(`${API_URL}/api/analytics/summary`, { credentials: 'include' });

        if (response.ok) {
          const data = await response.json();
          if (data) {
            setAnalytics(data);
          }
        }
      } catch (error) {
        // Silently fail - analytics are optional
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const metricCards = analytics?.kpi
    ? [
        {
          title: isAdminView ? 'Reports' : 'My Reports',
          value: analytics.kpi.totalReports || 0,
          icon: <FileText size={18} />,
          color: 'primary',
          change: 12,
          href: '/reports',
        },
        {
          title: isAdminView ? 'Avg Score' : 'My Score',
          value: analytics.kpi.avgScore || 0,
          icon: <TrendingUp size={18} />,
          color: 'warning',
          change: 3,
          href: '/scoring',
        },
        {
          title: isAdminView ? 'Pending Leaves' : 'Pending Leaves',
          value: analytics.kpi.pendingLeaves || 0,
          icon: <CalendarDays size={18} />,
          color: 'accent',
          change: 0,
          href: '/leave',
        },
        {
          title: isAdminView ? 'Active Team' : 'Team Members',
          value: analytics.kpi.activeMembers || 0,
          icon: <Users size={18} />,
          color: 'success',
          change: 5,
          href: '/team',
        },
      ]
    : [];

  const reportData = analytics?.leaderboard
    ? analytics.leaderboard.slice(0, 5).map((item) => ({
        member: item.name || 'Unknown',
        reports: item.reports || 0,
        avgScore: item.avgScore || 0,
      }))
    : [];

  if (userLoading || isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        badge={isAdminView ? 'Admin Dashboard' : 'Member Dashboard'}
        title={`Welcome back, ${user?.name || 'User'}`}
        subtitle={isAdminView
          ? "Here's what's happening with your team today."
          : "Here's your personal performance snapshot for today."}
      />

      <section>
        <GlassCard variant="panel" padding="none">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/15 px-5 py-4 md:px-6">
            <h2 className="text-lg font-semibold text-foreground">
              {isAdminView ? 'Performance Overview' : 'My Performance'}
            </h2>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Monthly Snapshot
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4 md:p-6">
            {metricCards.map((metric) => (
              <Link href={metric.href} key={metric.title} className="block transition-transform duration-200 hover:scale-[1.02] cursor-pointer">
                <StatCard
                  title={metric.title}
                  value={metric.value}
                  icon={metric.icon}
                  color={metric.color}
                  change={metric.change}
                />
              </Link>
            ))}
          </div>
        </GlassCard>
      </section>

      <section>
        <GlassCard variant="panel" padding="none" className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/15 px-5 py-4 md:px-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {isAdminView ? 'Team Leaderboard' : 'Top Performers'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isAdminView ? 'Recent activity and score trends' : 'How you compare with the team average'}
              </p>
            </div>
            <div className="glass-pill inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-foreground/90">
              <Medal className="h-3.5 w-3.5 text-amber-500" />
              {isAdminView ? 'Top 5 Members' : 'Market Benchmark'}
            </div>
          </div>

          <div className="hidden md:block p-4 md:p-6">
            <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/25 shadow-[0_16px_48px_rgba(76,92,148,0.16)] dark:bg-slate-900/30 backdrop-blur-sm">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-white/20 bg-white/35 dark:bg-white/5 backdrop-blur-sm">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Member
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Reports
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Avg Score
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, index) => (
                    <tr
                      key={`${row.member}-${index}`}
                      className="border-b border-white/15 last:border-0 transition-colors hover:bg-white/35 dark:hover:bg-white/5 backdrop-blur-sm"
                    >
                      <td className="px-5 py-3.5 text-sm font-semibold text-foreground">{row.member}</td>
                      <td className="px-5 py-3.5 text-sm text-foreground">{row.reports}</td>
                      <td className="px-5 py-3.5 text-sm text-foreground">
                        <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-300 backdrop-blur-sm">
                          {row.avgScore}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3 p-4 md:hidden">
            {reportData.map((row, index) => (
              <div
                key={`${row.member}-${index}`}
                className="glass-card rounded-2xl border border-white/20 bg-gradient-to-br from-white/40 via-white/20 to-transparent p-4 shadow-[0_8px_32px_rgba(76,92,148,0.12)] dark:shadow-none backdrop-blur-sm"
              >
                <p className="text-sm font-semibold text-foreground">{row.member}</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Reports</p>
                    <p className="mt-1 text-sm font-medium text-foreground">{row.reports}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Avg</p>
                    <p className="mt-1 text-sm font-medium text-foreground">{row.avgScore}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </section>
    </div>
  );
}


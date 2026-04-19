'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BarChart2,
  CalendarOff,
  CheckSquare,
  Clock,
  FileText,
  LayoutDashboard,
  Loader2,
  Settings,
  UserCheck,
  Users,
  CheckCircle,
  TrendingUp,
} from 'lucide-react';
import StatCard from '@/components/shared/StatCard';
import Card from '@/components/shared/Card';
import DataTable from '@/components/shared/DataTable';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { navItems, type NavIcon } from '@/lib/navigation';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type DashboardAnalytics = {
  kpi: {
    totalReports: number;
    activeMembers: number;
    pendingLeaves: number;
    avgScore: number;
  };
  leaderboard: Array<{
    name: string;
    reports: number;
    avgScore: number;
    attendanceRate: number;
  }>;
};

const iconMap: Record<NavIcon, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  reports: FileText,
  qa: CheckSquare,
  leave: CalendarOff,
  shifts: Clock,
  attendance: UserCheck,
  analytics: BarChart2,
  settings: Settings,
};

export default function DashboardPage() {
  const { user, isLoading: userLoading } = useCurrentUser();
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch('/api/analytics/summary');

        if (response.ok) {
          const data = await response.json();
          if (data) {
            setAnalytics(data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const statCards = analytics?.kpi
    ? [
        {
          title: 'Total Reports',
          value: analytics.kpi.totalReports || 0,
          change: 12,
          icon: <FileText size={24} />,
          color: 'primary',
        },
        {
          title: 'Team Members',
          value: analytics.kpi.activeMembers || 0,
          change: 0,
          icon: <Users size={24} />,
          color: 'accent',
        },
        {
          title: 'Pending QA',
          value: analytics.kpi.pendingLeaves || 0,
          change: -15,
          icon: <CheckCircle size={24} />,
          color: 'warning',
        },
        {
          title: 'Avg Score',
          value: analytics.kpi.avgScore || 0,
          change: 3,
          icon: <TrendingUp size={24} />,
          color: 'success',
        },
      ]
    : [];

  const reportColumns = [
    { key: 'member', label: 'Member' },
    { key: 'reports', label: 'Reports' },
    { key: 'avgScore', label: 'Avg Score' },
    { key: 'attendanceRate', label: 'Attendance' },
  ];

  const reportData = analytics?.leaderboard
    ? analytics.leaderboard.slice(0, 5).map((item) => ({
        member: item.name || 'Unknown',
        reports: item.reports || 0,
        avgScore: item.avgScore || 0,
        attendanceRate: `${item.attendanceRate || 0}%`,
      }))
    : [];

  if (userLoading || isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const workspaces = navItems.filter((item) => item.href !== '/dashboard');

  return (
    <div className="space-y-8">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)]">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-[0_28px_80px_-36px_rgba(15,23,42,0.55)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
            Team Control Center
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-white">
            {user?.name
              ? `${user.name}, here is the fastest route through today's work.`
              : 'Everything important is now one click away.'}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Each function now has its own workspace route, clearer navigation, and less dashboard nesting.
            Jump straight into reporting, review, scheduling, or approvals without hunting through stacked pages.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/reports"
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition-transform hover:-translate-y-0.5"
            >
              Open reports
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/qa"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/14"
            >
              Review QA
            </Link>
            <Link
              href="/analytics"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-transparent px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10"
            >
              View analytics
            </Link>
          </div>
        </div>

        <Card
          title="Operational Pulse"
          subtitle="What needs attention first"
          className="border-slate-200/80 bg-white/90 dark:bg-slate-950/75"
        >
          <div className="space-y-4">
            <div className="rounded-3xl border border-border bg-secondary/70 p-4">
              <p className="text-sm font-medium text-muted-foreground">Open workflows</p>
              <p className="mt-2 text-3xl font-semibold text-card-foreground">{workspaces.length}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Reports, QA, leave, shifts, attendance, analytics, and settings are available as separate pages.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-border p-4">
                <p className="text-sm font-medium text-muted-foreground">Role</p>
                <p className="mt-2 text-lg font-semibold text-card-foreground">
                  {user?.role?.replace('_', ' ') || 'Team member'}
                </p>
              </div>
              <div className="rounded-3xl border border-border p-4">
                <p className="text-sm font-medium text-muted-foreground">Top route</p>
                <p className="mt-2 text-lg font-semibold text-card-foreground">/reports</p>
              </div>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
        <Card
          title="Team Leaderboard"
          subtitle="Recent activity and score trends"
          className="border-slate-200/80 bg-white/90 dark:bg-slate-950/75"
        >
          <DataTable columns={reportColumns} data={reportData} isLoading={isLoading} />
        </Card>

        <Card
          title="Workspace Map"
          subtitle="Direct entry points for each function"
          className="border-slate-200/80 bg-white/90 dark:bg-slate-950/75"
        >
          <div className="grid gap-3">
            {workspaces.map((item) => {
              const Icon = iconMap[item.icon];

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-center justify-between rounded-[1.5rem] border border-border bg-background/70 px-4 py-4 transition-colors hover:border-slate-300 hover:bg-white dark:hover:border-white/15 dark:hover:bg-white/[0.04]"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-card-foreground">{item.label}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5" />
                </Link>
              );
            })}
          </div>
        </Card>
      </section>
    </div>
  );
}

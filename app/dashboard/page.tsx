'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BarChart2,
  CalendarDays,
  CalendarOff,
  CheckSquare,
  Clock,
  FileText,
  LayoutDashboard,
  Loader2,
  MessageSquare,
  Settings,
  TrendingUp,
  UserCheck,
  Users,
  CheckCircle,
} from 'lucide-react';
import StatCard from '@/components/shared/StatCard';
import Card from '@/components/shared/Card';
import { BentoGrid, BentoCard } from '@/components/shared/BentoGrid';
import DataTable from '@/components/shared/DataTable';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { navItems, type NavIcon } from '@/lib/navigation';
import { handleApiError } from '@/lib/error-handler';

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
  calendar: CalendarDays,
  attendance: UserCheck,
  analytics: BarChart2,
  messages: MessageSquare,
  scoring: TrendingUp,
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
        } else {
          console.warn('Analytics data not available yet');
        }
      } catch (error) {
        console.warn('Failed to fetch analytics:', error);
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
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/95 to-info p-6 text-primary-foreground card-elevation-lg sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary-foreground/80">
          {isAdmin ? 'Admin Dashboard' : 'Member Dashboard'}
        </p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-primary-foreground">
            {user?.name
              ? `${user.name}, ${isAdmin ? 'manage your team' : 'track your progress'} efficiently.`
              : 'Everything important is now one click away.'}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-primary-foreground/90">
          {isAdmin
            ? 'Oversee team performance, manage reports, review QA, and handle administrative tasks from your centralized dashboard.'
            : 'Track your reports, view your QA scores, manage your schedule, and access all your work tools in one place.'}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard/reports"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5 hover:shadow-lg"
          >
            {isAdmin ? 'Manage Reports' : 'My Reports'}
            <ArrowRight className="h-4 w-4" />
          </Link>
          {isAdmin && (
            <Link
              href="/dashboard/qa"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5 hover:shadow-lg"
            >
              Review QA
            </Link>
          )}
          <Link
            href="/dashboard/analytics"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5 hover:shadow-lg"
          >
            {isAdmin ? 'Team Analytics' : 'My Analytics'}
          </Link>
        </div>
      </section>

      <section>
        <BentoGrid>
          {statCards.map((stat) => (
            <BentoCard key={stat.title}>
              <StatCard {...stat} />
            </BentoCard>
          ))}
        </BentoGrid>
      </section>

      <Card
        title="Team Leaderboard"
        subtitle="Recent activity and score trends"
        className="bg-card/80 backdrop-blur-sm"
      >
        <DataTable columns={reportColumns} data={reportData} isLoading={isLoading} />
      </Card>
    </div>
  );
}

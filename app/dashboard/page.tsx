'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  FileText,
  Loader2,
  TrendingUp,
  Users,
  CheckCircle,
} from 'lucide-react';
import StatCard from '@/components/shared/StatCard';
import Card from '@/components/shared/Card';
import { BentoGrid, BentoCard } from '@/components/shared/BentoGrid';
import PageHeader from '@/components/shared/PageHeader';
import GlassCard from '@/components/shared/GlassCard';
import DataTable from '@/components/shared/DataTable';
import { useCurrentUser } from '@/hooks/useCurrentUser';

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
        <GlassCard variant="default" padding="none" key="stats">
          <div className="p-6 border-b border-border/60">
            <h2 className="text-lg font-semibold text-foreground">Performance Overview</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6">
            <StatCard
              title="Reports"
              value={analytics.kpi.totalReports || 0}
              icon={<FileText size={20} />}
              color="primary"
              change={12}
            />
            <StatCard
              title="Attendance"
              value={`${analytics.kpi.activeMembers || 0}%`}
              icon={<Users size={20} />}
              color="success"
              change={0}
            />
            <StatCard
              title="Avg Score"
              value={analytics.kpi.avgScore || 0}
              icon={<TrendingUp size={20} />}
              color="warning"
              change={3}
            />
            <StatCard
              title="Deductions"
              value={analytics.kpi.pendingLeaves || 0}
              icon={<CheckCircle size={20} />}
              color="accent"
              change={0}
            />
          </div>
        </GlassCard>,
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

  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Dashboard"
        title={`Welcome back, ${user?.name || 'User'}`}
        subtitle="Here's what's happening with your team today."
      />

      <GlassCard variant="default" padding="md">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/reports"
            className="btn-primary inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
          >
            {isAdmin ? 'Manage Reports' : 'My Reports'}
            <ArrowRight className="h-4 w-4" />
          </Link>
          {isAdmin && (
            <Link
              href="/dashboard/qa"
              className="glass-pill inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-foreground"
            >
              Review QA
            </Link>
          )}
          <Link
            href="/dashboard/analytics"
            className="glass-pill inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-foreground"
          >
            {isAdmin ? 'Team Analytics' : 'My Analytics'}
          </Link>
        </div>
      </GlassCard>

      <section>
        <BentoGrid>
          {statCards.map((stat, index) => (
            <BentoCard key={index}>
              {stat}
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

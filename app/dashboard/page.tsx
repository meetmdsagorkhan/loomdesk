'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import PageWrapper from '@/components/layout/PageWrapper';
import StatCard from '@/components/shared/StatCard';
import Card from '@/components/shared/Card';
import DataTable from '@/components/shared/DataTable';
import Badge from '@/components/shared/Badge';
import { FileText, Users, CheckCircle, TrendingUp, Loader2 } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { isAdmin, isTeamLead } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default function DashboardPage() {
  // Prevent SSR completely
  if (typeof window === 'undefined') {
    return null;
  }

  const { user, isLoading: userLoading } = useCurrentUser();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch('/api/analytics/summary');
        if (response.ok) {
          const data = await response.json();
          setAnalytics(data);
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const statCards = analytics
    ? [
        {
          title: 'Total Reports',
          value: analytics.kpi.totalReports,
          change: 12,
          icon: <FileText size={24} />,
          color: 'primary',
        },
        {
          title: 'Team Members',
          value: analytics.kpi.activeMembers,
          change: 0,
          icon: <Users size={24} />,
          color: 'accent',
        },
        {
          title: 'Pending QA',
          value: analytics.kpi.pendingLeaves,
          change: -15,
          icon: <CheckCircle size={24} />,
          color: 'warning',
        },
        {
          title: 'Avg Score',
          value: analytics.kpi.avgScore,
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

  const reportData = analytics?.leaderboard?.slice(0, 5).map((item: any) => ({
    member: item.name,
    reports: item.reports,
    avgScore: item.avgScore,
    attendanceRate: `${item.attendanceRate}%`,
  })) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Sidebar isMobileOpen={isMobileMenuOpen} onMobileClose={() => setIsMobileMenuOpen(false)} />
      <Navbar title="Dashboard" onMobileMenuToggle={handleMobileMenuToggle} />
      <PageWrapper>
        <div className="space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat, index) => (
              <StatCard key={index} {...stat} />
            ))}
          </div>

          {/* Recent Reports Table */}
          <Card title="Team Leaderboard">
            <DataTable columns={reportColumns} data={reportData} isLoading={isLoading} />
          </Card>
        </div>
      </PageWrapper>
    </>
  );
}

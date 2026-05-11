'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Medal,
  FileText,
  Loader2,
  TrendingUp,
  Users,
  CheckCircle,
  CalendarDays,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import StatCard from '@/components/shared/StatCard';
import PageHeader from '@/components/shared/PageHeader';
import GlassCard from '@/components/shared/GlassCard';
import { BentoGrid, BentoCard } from '@/components/shared/BentoGrid';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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

  const metricCards = [
    {
      title: isAdminView ? 'Reports' : 'My Reports',
      value: analytics?.kpi?.totalReports || 0,
      icon: <FileText size={18} />,
      color: 'primary',
      change: 12,
      href: '/reports',
    },
    {
      title: isAdminView ? 'Avg Score' : 'My Score',
      value: analytics?.kpi?.avgScore || 0,
      icon: <TrendingUp size={18} />,
      color: 'warning',
      change: 3,
      href: '/scoring',
    },
    {
      title: isAdminView ? 'Deductions' : 'Pending Leaves',
      value: isAdminView ? (analytics?.kpi?.totalDeductions || 0) : (analytics?.kpi?.pendingLeaves || 0),
      icon: isAdminView ? <CheckCircle size={18} /> : <CalendarDays size={18} />,
      color: 'accent',
      change: 0,
      href: isAdminView ? '/qa' : '/leave',
    },
    {
      title: isAdminView ? 'Active Team' : 'Shifts',
      value: isAdminView ? (analytics?.kpi?.activeMembers || 0) : 1,
      icon: isAdminView ? <Users size={18} /> : <Clock size={18} />,
      color: 'success',
      change: 5,
      href: isAdminView ? '/settings' : '/shifts',
    },
  ];

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
    <div className="space-y-8 fade-in">
      <PageHeader
        badge={isAdminView ? 'Admin Dashboard' : 'Member Dashboard'}
        title={`Welcome back, ${user?.name || 'User'}`}
        subtitle={isAdminView 
          ? "Here's what's happening with your team today." 
          : "Here's your personal performance snapshot for today."}
        actions={
          <Link 
            href="/reports" 
            className={cn(buttonVariants({ variant: "gradient", size: "sm" }), "cursor-pointer")}
          >
            {isAdminView ? 'Manage Reports' : 'View My Reports'} <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        }
      />

      <BentoGrid>
        {/* Main metrics displayed in a more dynamic way */}
        {metricCards.map((metric, idx) => (
          <BentoCard 
            key={metric.title} 
            className="glass-card overflow-hidden p-0"
          >
            <Link href={metric.href} className="block transition-transform duration-200 hover:scale-[1.02] cursor-pointer h-full">
              <StatCard
                title={metric.title}
                value={metric.value}
                icon={metric.icon}
                color={metric.color}
                change={metric.change}
              />
            </Link>
          </BentoCard>
        ))}

        {/* Team Leaderboard / Performance Chart */}
        <BentoCard colSpan={2} rowSpan={2} className="flex flex-col p-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/15 px-5 py-4 md:px-6 bg-white/10 dark:bg-white/5">
            <div>
              <h2 className="text-lg font-semibold font-heading text-foreground">
                {isAdminView ? 'Team Leaderboard' : 'Top Performers'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isAdminView ? 'Recent activity and score trends' : 'How you compare with the team average'}
              </p>
            </div>
            <Badge variant="secondary" className="glass-pill">
              <Medal className="mr-1.5 h-3 w-3 text-amber-500" />
              {isAdminView ? 'Top 5 Members' : 'Team Overview'}
            </Badge>
          </div>

          <div className="flex-1 p-4 md:p-6 overflow-x-auto">
            <div className="overflow-hidden rounded-xl border border-white/15 bg-white/10 dark:bg-white/5 backdrop-blur-md shadow-sm">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/10 dark:bg-white/5">
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      Member
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      Reports
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground text-right">
                      Avg Score
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.length > 0 ? (
                    reportData.map((row, index) => (
                      <tr
                        key={`${row.member}-${index}`}
                        className="border-b border-white/5 last:border-0 transition-colors hover:bg-primary/5 cursor-pointer"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary ring-1 ring-primary/20">
                              {row.member.charAt(0)}
                            </div>
                            <span className="text-sm font-semibold text-foreground">{row.member}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm font-medium text-foreground/80">{row.reports}</td>
                        <td className="px-5 py-4 text-right">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "font-heading font-bold",
                              row.avgScore >= 90 ? "bg-success/15 text-success border-success/30" :
                              row.avgScore >= 75 ? "bg-warning/15 text-warning border-warning/30" :
                              "bg-destructive/15 text-destructive border-destructive/30"
                            )}
                          >
                            {row.avgScore}%
                          </Badge>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-5 py-12 text-center text-sm text-muted-foreground italic">
                        No activity data available yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="mt-auto border-t border-white/10 p-4 bg-white/5">
            <Button variant="ghost" size="sm" className="w-full text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer">
              View Detailed Analytics <ArrowRight className="ml-1.5 h-3 w-3" />
            </Button>
          </div>
        </BentoCard>

        {/* Quick Actions / System Status */}
        <BentoCard className="flex flex-col gap-4">
          <h3 className="text-sm font-bold font-heading uppercase tracking-widest text-muted-foreground">
            System Status
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/20 text-success">
                  <ShieldCheck size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground">API Services</p>
                  <p className="text-[10px] text-success/80">Operational</p>
                </div>
              </div>
              <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            </div>

            <div className="flex items-center justify-between rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
                  <Clock size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground">Next Sync</p>
                  <p className="text-[10px] text-muted-foreground">Scheduled in 14m</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-2">
            <h3 className="text-xs font-bold font-heading uppercase tracking-widest text-muted-foreground mb-3">
              Quick Tasks
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/reports" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-[10px] h-8 justify-start cursor-pointer px-2")}>
                New Report
              </Link>
              <Link href="/leave" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-[10px] h-8 justify-start cursor-pointer px-2")}>
                Apply Leave
              </Link>
              <Link href="/settings" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-[10px] h-8 justify-start cursor-pointer px-2")}>
                Settings
              </Link>
              <Link href="/qa" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-[10px] h-8 justify-start cursor-pointer px-2")}>
                QA Review
              </Link>
            </div>
          </div>
        </BentoCard>
      </BentoGrid>
    </div>
  );
}


'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Award, Loader2, Target, Trophy } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { format } from 'date-fns';
import PageHeader from '@/components/shared/PageHeader';
import GlassCard from '@/components/shared/GlassCard';
import StatCard from '@/components/shared/StatCard';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type ScoreEvent = {
  id: string;
  severity: 'MINOR' | 'MAJOR';
  deduction: number;
  reason: string;
  createdAt: string;
};

type ReportScore = {
  reportId: string;
  date: string;
  score: number;
  scoreEvents: ScoreEvent[];
};

type ScoringData = {
  currentScore: number;
  totalReports: number;
  averageScore: number;
  rank: number;
  totalMembers: number;
  recentScores: ReportScore[];
  scoreHistory: {
    date: string;
    score: number;
  }[];
};

export default function ScoringPage() {
  const { user, isLoading: userLoading } = useCurrentUser();
  const [scoringData, setScoringData] = useState<ScoringData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (userLoading || !mounted) return;
    if (!user) return;

    fetchScoringData();
  }, [user, userLoading, mounted]);

  const fetchScoringData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/scoring/my-scores');
      const data = await response.json();
      setScoringData(data);
    } catch (error) {
      console.error('Failed to fetch scoring data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted || userLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-success';
    if (score >= 70) return 'text-primary';
    if (score >= 50) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Average';
    return 'Needs Improvement';
  };

  return (
    <div className="space-y-8">
      <PageHeader
        badge="My Scoring"
        title="Performance and quality metrics"
        subtitle="Track your score trends, deductions, and ranking within the team."
      />

      {/* Score Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Current Score"
          value={scoringData?.currentScore || 0}
          icon={<Target size={18} />}
          color="primary"
        />
        <StatCard
          title="Total Reports"
          value={scoringData?.totalReports || 0}
          icon={<Award size={18} />}
          color="accent"
        />
        <StatCard
          title="Average Score"
          value={scoringData?.averageScore?.toFixed(1) || 0}
          icon={<TrendingUp size={18} />}
          color="warning"
        />
        <StatCard
          title="Team Rank"
          value={`#${scoringData?.rank || 0}`}
          icon={<Trophy size={18} />}
          color="success"
        />
      </div>

      <GlassCard variant="minimal" padding="sm">
        <p className={`text-sm font-medium ${getScoreColor(scoringData?.currentScore || 0)}`}>
          {getScoreBadge(scoringData?.currentScore || 0)}
          <span className="ml-2 text-muted-foreground">
            (of {scoringData?.totalMembers || 0} team members)
          </span>
        </p>
      </GlassCard>

      {/* Recent Scores */}
      <GlassCard variant="panel" padding="none" className="overflow-hidden">
        <div className="border-b border-white/15 px-5 py-4 md:px-6">
          <h2 className="text-lg font-semibold text-foreground">Recent Report Scores</h2>
        </div>
        <div className="p-4 md:p-6">
        {scoringData?.recentScores && scoringData.recentScores.length > 0 ? (
          <div className="space-y-4">
            {scoringData.recentScores.map((report) => (
              <div
                key={report.reportId}
                className="glass-card flex items-center justify-between rounded-2xl border border-white/20 bg-gradient-to-r from-white/35 via-white/20 to-transparent p-4 shadow-[0_8px_32px_rgba(76,92,148,0.12)] dark:shadow-none backdrop-blur-sm"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {format(new Date(report.date), 'EEEE, MMMM d, yyyy')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {report.scoreEvents.length} deduction{report.scoreEvents.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${getScoreColor(report.score)}`}>
                    {report.score}
                  </p>
                  {report.scoreEvents.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      -{report.scoreEvents.reduce((sum, event) => sum + event.deduction, 0)} points
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="rounded-2xl border border-dashed border-slate-300/50 p-8 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.8),inset_0_-1px_0_rgba(0,0,0,0.05),0_8px_32px_rgba(0,0,0,0.05)] dark:border-slate-700/50 dark:bg-slate-800/50 dark:backdrop-blur-sm dark:shadow-none">
              <p className="text-muted-foreground">No reports scored yet</p>
            </div>
          </div>
        )}
        </div>
      </GlassCard>

      {/* Score Details for Latest Report */}
      {scoringData?.recentScores && scoringData.recentScores.length > 0 && (
        <GlassCard variant="panel" padding="none" className="overflow-hidden">
          <div className="border-b border-white/15 px-5 py-4 md:px-6">
            <h2 className="text-lg font-semibold text-foreground">
              Latest Report Details - {format(new Date(scoringData.recentScores[0].date), 'MMM d, yyyy')}
            </h2>
          </div>
          <div className="p-4 md:p-6">
          {scoringData.recentScores[0].scoreEvents.length > 0 ? (
            <div className="space-y-3">
              {scoringData.recentScores[0].scoreEvents.map((event) => (
                <div
                  key={event.id}
                  className="glass-card flex items-start gap-3 rounded-xl border border-white/20 bg-white/30 p-3 backdrop-blur-sm"
                >
                  <div
                    className={`mt-1 px-2 py-1 rounded-md text-xs font-semibold ${
                      event.severity === 'MAJOR'
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-warning/10 text-warning'
                    }`}
                  >
                    {event.severity}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{event.reason}</p>
                    <p className="text-sm text-muted-foreground">
                      -{event.deduction} points • {format(new Date(event.createdAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No deductions - perfect score!
            </p>
          )}
          </div>
        </GlassCard>
      )}
    </div>
  );
}

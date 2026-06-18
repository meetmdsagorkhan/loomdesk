'use client';

import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Award, Loader2, Target, Trophy, Users, Star, AlertCircle } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { format } from 'date-fns';
import { isAdmin, isTeamLead } from '@/lib/auth-utils';
import PageHeader from '@/components/shared/PageHeader';
import GlassCard from '@/components/shared/GlassCard';
import StatCard from '@/components/shared/StatCard';
import Badge from '@/components/shared/Badge';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type LeaderboardMember = {
  name: string;
  reports: number;
  avgScore: number;
  deductions: number;
};

type RecentScore = {
  reportId: string;
  date: string;
  score: number;
  scoreEvents: Array<{
    id: string;
    reportId: string | null;
    severity: 'MINOR' | 'MAJOR';
    deduction: number;
    reason: string;
    createdAt: string;
  }>;
};

type ScoringData = {
  currentScore: number;
  monthlyScore: number;
  totalReports: number;
  averageScore: number;
  rank: number;
  totalMembers: number;
  recentScores: RecentScore[];
};

export default function ScoringPage() {
  const { user, isLoading: userLoading } = useCurrentUser();
  const [mounted, setMounted] = useState(false);
  const [personalData, setPersonalData] = useState<ScoringData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isManager = user && (isAdmin({ user }) || isTeamLead({ user }));

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Always fetch personal scores
      const personalRes = await fetch('/api/scoring/my-scores');
      const pData = await personalRes.json();
      setPersonalData(pData);

      // If manager, also fetch leaderboard from analytics
      if (isManager) {
        const analyticsRes = await fetch('/api/analytics/summary');
        const aData = await analyticsRes.json();
        setLeaderboard(aData.leaderboard || []);
      }
    } catch (error) {
      // Silently fail - leaderboard will be empty
    } finally {
      setIsLoading(false);
    }
  }, [isManager]);

  useEffect(() => {
    if (!mounted || userLoading) return;
    fetchData();
  }, [mounted, userLoading, fetchData]);

  useEffect(() => {
    if (!mounted || userLoading) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    };

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    }, 30000);

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [mounted, userLoading, fetchData]);

  if (!mounted || userLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-success';
    if (score >= 75) return 'text-primary';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Performance"
        title={isManager ? "Team Leaderboard" : "My Performance"}
        subtitle={isManager 
          ? "Monitor team-wide quality scores and rankings." 
          : "Track your score trends, deductions, and ranking within the team."
        }
      />

      {isManager ? (
        <>
          {/* Manager View: Leaderboard */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatCard
              title="Team Average"
              value={leaderboard.length > 0 
                ? (leaderboard.reduce((acc, m) => acc + m.avgScore, 0) / leaderboard.length).toFixed(1) 
                : "0"}
              icon={<Users size={18} />}
              color="primary"
            />
            <StatCard
              title="Top Performer"
              value={leaderboard[0]?.name || "N/A"}
              icon={<Trophy size={18} />}
              color="success"
            />
            <StatCard
              title="Total Audits"
              value={leaderboard.reduce((acc, m) => acc + m.reports, 0)}
              icon={<Star size={18} />}
              color="accent"
            />
          </div>

          <GlassCard variant="panel" padding="none" className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h2 className="text-lg font-semibold text-foreground">Rankings</h2>
              <Badge variant="info" label={`${leaderboard.length} Members`} />
            </div>
            <div className="p-4 md:p-6">
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px] text-muted-foreground">Rank</th>
                      <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px] text-muted-foreground">Member</th>
                      <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px] text-muted-foreground text-center">Reports</th>
                      <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px] text-muted-foreground text-center">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((member, index) => (
                      <tr key={member.name} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 font-bold text-muted-foreground/60">#{index + 1}</td>
                        <td className="px-6 py-4 font-semibold text-foreground">{member.name}</td>
                        <td className="px-6 py-4 text-center">{member.reports}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`font-bold ${getScoreColor(member.avgScore)}`}>
                            {member.avgScore}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </GlassCard>
        </>
      ) : (
        <>
          {/* Member View: Stats */}
          {personalData && personalData.monthlyScore < 90 && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-xl flex items-start gap-3 shadow-sm backdrop-blur-sm">
              <AlertCircle size={20} className="mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold tracking-tight">Danger Zone</p>
                <p className="text-xs mt-1 opacity-90">Your monthly score has fallen below 90. Consistent low scores may lead to mandatory training or a final warning.</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Monthly Score"
              value={personalData?.monthlyScore || 0}
              icon={<Target size={18} />}
              color="primary"
            />
            <StatCard
              title="Total Reports"
              value={personalData?.totalReports || 0}
              icon={<Award size={18} />}
              color="accent"
            />
            <StatCard
              title="Average Score"
              value={personalData?.averageScore?.toFixed(1) || 0}
              icon={<TrendingUp size={18} />}
              color="warning"
            />
            <StatCard
              title="Team Rank"
              value={`#${personalData?.rank || 0}`}
              icon={<Trophy size={18} />}
              color="success"
            />
          </div>

          {/* Recent scores list (reused from original) */}
          <GlassCard variant="panel" padding="none" className="overflow-hidden">
            <div className="border-b border-white/15 px-5 py-4 md:px-6">
              <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
            </div>
            <div className="p-4 md:p-6 space-y-4">
              {personalData?.recentScores.length ? (
                personalData.recentScores.map((report) => (
                  <div key={report.reportId} className="glass-card flex items-center justify-between p-4 rounded-2xl border border-white/10 bg-white/5">
                    <div>
                      <p className="font-medium">{format(new Date(report.date), 'MMM d, yyyy')}</p>
                      <p className="text-xs text-muted-foreground">{report.scoreEvents.length} events</p>
                    </div>
                    <div className={`text-xl font-bold ${getScoreColor(report.score)}`}>
                      {report.score}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-center text-sm text-muted-foreground">
                  No scored reports yet. Submit reports and QA reviews will appear here automatically.
                </div>
              )}
            </div>
          </GlassCard>
        </>
      )}
    </div>
  );
}

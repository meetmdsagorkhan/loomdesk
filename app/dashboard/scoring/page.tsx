'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Award, Loader2, Target } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { format } from 'date-fns';

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">My Scoring</h1>
        <p className="text-muted-foreground mt-1">Track your performance and quality metrics</p>
      </div>

      {/* Score Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <Target className="text-primary" size={20} />
            <p className="text-sm text-muted-foreground">Current Score</p>
          </div>
          <p className={`text-3xl font-bold ${getScoreColor(scoringData?.currentScore || 0)}`}>
            {scoringData?.currentScore || 0}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {getScoreBadge(scoringData?.currentScore || 0)}
          </p>
        </div>

        <div className="bg-card rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <Award className="text-primary" size={20} />
            <p className="text-sm text-muted-foreground">Total Reports</p>
          </div>
          <p className="text-3xl font-bold text-foreground">
            {scoringData?.totalReports || 0}
          </p>
        </div>

        <div className="bg-card rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-primary" size={20} />
            <p className="text-sm text-muted-foreground">Average Score</p>
          </div>
          <p className={`text-3xl font-bold ${getScoreColor(scoringData?.averageScore || 0)}`}>
            {scoringData?.averageScore?.toFixed(1) || 0}
          </p>
        </div>

        <div className="bg-card rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <Award className="text-primary" size={20} />
            <p className="text-sm text-muted-foreground">Team Rank</p>
          </div>
          <p className="text-3xl font-bold text-foreground">
            #{scoringData?.rank || 0}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            of {scoringData?.totalMembers || 0} members
          </p>
        </div>
      </div>

      {/* Recent Scores */}
      <div className="bg-card rounded-2xl p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-foreground mb-4">Recent Report Scores</h2>
        {scoringData?.recentScores && scoringData.recentScores.length > 0 ? (
          <div className="space-y-4">
            {scoringData.recentScores.map((report) => (
              <div
                key={report.reportId}
                className="flex items-center justify-between p-4 bg-muted/50 rounded-xl"
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
          <p className="text-center text-muted-foreground py-8">No reports scored yet</p>
        )}
      </div>

      {/* Score Details for Latest Report */}
      {scoringData?.recentScores && scoringData.recentScores.length > 0 && (
        <div className="bg-card rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Latest Report Details - {format(new Date(scoringData.recentScores[0].date), 'MMM d, yyyy')}
          </h2>
          {scoringData.recentScores[0].scoreEvents.length > 0 ? (
            <div className="space-y-3">
              {scoringData.recentScores[0].scoreEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 bg-muted/50 rounded-xl shadow-sm"
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
      )}
    </div>
  );
}

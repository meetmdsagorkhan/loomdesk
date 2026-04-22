'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeft, ChevronDown, ChevronUp, MessageSquare, MinusCircle, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Badge from '@/components/shared/Badge';
import { showToast } from '@/components/shared/Toast';
import PageHeader from '@/components/shared/PageHeader';
import GlassCard from '@/components/shared/GlassCard';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Feedback = {
  id: string;
  comment: string;
  authorId: string;
  author: {
    id: string;
    name: string;
  };
  createdAt: string;
};

type ReportEntry = {
  id: string;
  type: 'TICKET' | 'CHAT';
  referenceId: string;
  status: 'SOLVED' | 'PENDING';
  note: string;
  pendingReason: string | null;
  feedback: Feedback[];
};

type ScoreEvent = {
  id: string;
  severity: 'MINOR' | 'MAJOR';
  deduction: number;
  reason: string;
  adminNote: string | null;
  createdAt: string;
};

type Report = {
  id: string;
  date: string;
  status: string;
  score: number;
  totalDeduction: number;
  user: {
    id: string;
    name: string;
    email: string;
  };
  entries: ReportEntry[];
};

export default function QADetailPage() {
  const router = useRouter();
  const params = useParams();
  const reportId = params.reportId as string;

  const [report, setReport] = useState<Report | null>(null);
  const [scoreEvents, setScoreEvents] = useState<ScoreEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [showDeductModal, setShowDeductModal] = useState(false);
  const [deductEntryId, setDeductEntryId] = useState<string | null>(null);
  const [deductSeverity, setDeductSeverity] = useState<'MINOR' | 'MAJOR'>('MINOR');
  const [deductReason, setDeductReason] = useState('');
  const [deductAdminNote, setDeductAdminNote] = useState('');
  const [isDeducting, setIsDeducting] = useState(false);
  const [feedbackEntryId, setFeedbackEntryId] = useState<string | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [isAddingFeedback, setIsAddingFeedback] = useState(false);

  const fetchReport = useCallback(async () => {
    try {
      const response = await fetch(`/api/qa/reports/${reportId}`);
      const data = await response.json();
      setReport(data);
    } catch (error) {
      console.error('Failed to fetch report:', error);
    } finally {
      setIsLoading(false);
    }
  }, [reportId]);

  const fetchScoreEvents = useCallback(async (userId: string) => {
    try {
      const response = await fetch(`/api/qa/score-events?userId=${userId}`);
      const data = await response.json();
      setScoreEvents(data.scoreEvents || []);
    } catch (error) {
      console.error('Failed to fetch score events:', error);
    }
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  useEffect(() => {
    if (report?.user.id) {
      fetchScoreEvents(report.user.id);
    }
  }, [report?.user.id, fetchScoreEvents]);

  const toggleEntry = (entryId: string) => {
    setExpandedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
      return next;
    });
  };

  const handleDeductScore = async () => {
    if (!report || !deductEntryId) return;

    setIsDeducting(true);
    try {
      const response = await fetch('/api/qa/score-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: report.user.id,
          reportId: report.id,
          entryId: deductEntryId,
          severity: deductSeverity,
          reason: deductReason,
          adminNote: deductAdminNote,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        showToast(error.error || 'Failed to deduct score', 'error');
        return;
      }

      await fetchReport();
      await fetchScoreEvents(report.user.id);
      setShowDeductModal(false);
      setDeductSeverity('MINOR');
      setDeductReason('');
      setDeductAdminNote('');
      setDeductEntryId(null);
      showToast('Score deduction recorded', 'success');
    } catch (error) {
      console.error('Failed to deduct score:', error);
      showToast('Failed to deduct score', 'error');
    } finally {
      setIsDeducting(false);
    }
  };

  const handleAddFeedback = async (entryId: string) => {
    if (!feedbackComment.trim()) return;

    setIsAddingFeedback(true);
    try {
      const response = await fetch('/api/qa/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId,
          comment: feedbackComment,
        }),
      });

      if (!response.ok) {
        showToast('Failed to add feedback', 'error');
        return;
      }

      await fetchReport();
      setFeedbackComment('');
      setFeedbackEntryId(null);
      showToast('Feedback added', 'success');
    } catch (error) {
      console.error('Failed to add feedback:', error);
      showToast('Failed to add feedback', 'error');
    } finally {
      setIsAddingFeedback(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-12 text-center">
        <p className="text-muted-foreground">Report not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        badge="QA Review"
        title="Report Review"
        subtitle="Review entries, add feedback, and apply score deductions."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/dashboard/qa')}
            className="rounded-xl"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back
          </Button>
        }
      />

      {/* Report Header */}
      <GlassCard variant="panel" padding="md">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-lg">
              {getInitials(report.user.name)}
            </div>
            <div>
              <h2 className="text-lg font-medium text-foreground">{report.user.name}</h2>
              <p className="text-sm text-muted-foreground">{report.user.email}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {format(new Date(report.date), 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-foreground">{report.score}</div>
            <p className="text-sm text-muted-foreground">Current Score</p>
          </div>
        </div>
      </GlassCard>

      {/* Entries Table */}
      <GlassCard variant="panel" padding="none" className="overflow-hidden">
        <div className="border-b border-white/15 px-5 py-4 md:px-6">
          <h2 className="text-lg font-medium text-foreground">Entries ({report.entries.length})</h2>
        </div>
        <div className="divide-y divide-white/15">
          {report.entries.map((entry) => (
            <div key={entry.id} className="border-b border-white/15 last:border-0">
              <div className="p-4 flex items-center gap-4">
                <button
                  onClick={() => toggleEntry(entry.id)}
                  className="rounded-lg p-2 transition-colors hover:bg-white/30 dark:hover:bg-white/10"
                >
                  {expandedEntries.has(entry.id) ? (
                    <ChevronUp size={20} />
                  ) : (
                    <ChevronDown size={20} />
                  )}
                </button>
                <div className="flex-1 grid grid-cols-4 gap-4">
                  <div>
                    <Badge variant={entry.type === 'TICKET' ? 'info' : 'success'} label={entry.type} />
                  </div>
                  <div className="text-sm text-foreground">{entry.referenceId}</div>
                  <div>
                    <Badge variant={entry.status === 'SOLVED' ? 'success' : 'warning'} label={entry.status} />
                  </div>
                  <div className="text-sm text-muted-foreground truncate">{entry.note}</div>
                </div>
              </div>
              
              {/* Expanded Content */}
              {expandedEntries.has(entry.id) && (
                <div className="px-4 pb-4 pl-14 space-y-4">
                  {entry.pendingReason && (
                    <div className="rounded-lg border border-white/15 bg-white/20 p-3 dark:bg-slate-900/25 backdrop-blur-sm">
                      <p className="text-sm font-medium text-foreground mb-1">Pending Reason</p>
                      <p className="text-sm text-muted-foreground">{entry.pendingReason}</p>
                    </div>
                  )}

                  {/* Feedback Thread */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare size={16} className="text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">Feedback</p>
                    </div>
                    {entry.feedback.length > 0 ? (
                      <div className="space-y-2">
                        {entry.feedback.map((fb) => (
                          <div key={fb.id} className="rounded-lg border border-white/15 bg-white/20 p-3 dark:bg-slate-900/25 backdrop-blur-sm">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-foreground">{fb.author.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(fb.createdAt), 'MMM d, yyyy HH:mm')}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{fb.comment}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No feedback yet</p>
                    )}

                    {/* Add Feedback Form */}
                    {feedbackEntryId === entry.id ? (
                      <div className="mt-3 space-y-2">
                        <textarea
                          value={feedbackComment}
                          onChange={(e) => setFeedbackComment(e.target.value)}
                          placeholder="Add your feedback..."
                          rows={2}
                          className="w-full rounded-lg border border-white/20 bg-background/70 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleAddFeedback(entry.id)}
                            disabled={isAddingFeedback || !feedbackComment.trim()}
                          >
                            {isAddingFeedback ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              'Add'
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setFeedbackEntryId(null);
                              setFeedbackComment('');
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3"
                        onClick={() => setFeedbackEntryId(entry.id)}
                      >
                        <MessageSquare size={14} className="mr-2" />
                        Add Feedback
                      </Button>
                    )}
                  </div>

                  {/* Deduct Score Button */}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setDeductEntryId(entry.id);
                      setShowDeductModal(true);
                    }}
                  >
                    <MinusCircle size={14} className="mr-2" />
                    Deduct Score
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Score History */}
      <GlassCard variant="panel" padding="none" className="overflow-hidden">
        <div className="border-b border-white/15 px-5 py-4 md:px-6">
          <h2 className="text-lg font-medium text-foreground">Score History</h2>
        </div>
        {scoreEvents.length > 0 ? (
          <div className="overflow-x-auto p-4 md:p-6">
            <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/25 dark:bg-slate-900/30 backdrop-blur-sm">
            <table className="w-full">
              <thead className="border-b border-white/20 bg-white/35 dark:bg-white/5 backdrop-blur-sm">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Severity</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Reason</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Admin Note</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Deduction</th>
                </tr>
              </thead>
              <tbody>
                {scoreEvents.map((event) => (
                  <tr key={event.id} className="border-b border-white/15 last:border-0 hover:bg-white/35 dark:hover:bg-white/5 backdrop-blur-sm">
                    <td className="px-5 py-3.5 text-sm text-foreground">
                      {format(new Date(event.createdAt), 'MMM d, yyyy HH:mm')}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={event.severity === 'MAJOR' ? 'danger' : 'warning'} label={event.severity} />
                    </td>
                    <td className="px-5 py-3.5 text-sm text-foreground">{event.reason}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{event.adminNote || '-'}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-destructive">-{event.deduction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">No score deductions yet</p>
          </div>
        )}
      </GlassCard>

      {/* Deduct Score Modal */}
      <Dialog open={showDeductModal} onOpenChange={setShowDeductModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Deduct Score</DialogTitle>
            <button
              onClick={() => {
                setShowDeductModal(false);
                setDeductSeverity('MINOR');
                setDeductReason('');
                setDeductAdminNote('');
                setDeductEntryId(null);
              }}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X size={16} />
            </button>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Severity</label>
              <div className="flex gap-2">
                <label className="flex-1">
                  <input
                    type="radio"
                    value="MINOR"
                    checked={deductSeverity === 'MINOR'}
                    onChange={(e) => setDeductSeverity(e.target.value as 'MINOR' | 'MAJOR')}
                    className="peer sr-only"
                  />
                  <div className="px-4 py-2.5 rounded-xl border border-white/20 bg-gradient-to-br from-white/40 via-white/20 to-white/40 text-center cursor-pointer hover:from-primary/15 hover:via-primary/10 hover:to-primary/15 hover:text-primary backdrop-blur-sm shadow-sm peer-checked:border-purple-500 peer-checked:bg-purple-500 peer-checked:text-white peer-checked:shadow-[0_8px_24px_rgba(168,85,247,0.5)] dark:border-white/10 dark:from-slate-800/40 dark:via-slate-900/20 dark:to-slate-800/40 dark:hover:from-primary/20 dark:hover:via-primary/15 dark:hover:to-primary/20 dark:hover:text-primary peer-checked:bg-purple-600">
                    Minor (-0.5)
                  </div>
                </label>
                <label className="flex-1">
                  <input
                    type="radio"
                    value="MAJOR"
                    checked={deductSeverity === 'MAJOR'}
                    onChange={(e) => setDeductSeverity(e.target.value as 'MINOR' | 'MAJOR')}
                    className="peer sr-only"
                  />
                  <div className="px-4 py-2.5 rounded-xl border border-white/20 bg-gradient-to-br from-white/40 via-white/20 to-white/40 text-center cursor-pointer hover:from-primary/15 hover:via-primary/10 hover:to-primary/15 hover:text-primary backdrop-blur-sm shadow-sm peer-checked:border-purple-500 peer-checked:bg-purple-500 peer-checked:text-white peer-checked:shadow-[0_8px_24px_rgba(168,85,247,0.5)] dark:border-white/10 dark:from-slate-800/40 dark:via-slate-900/20 dark:to-slate-800/40 dark:hover:from-primary/20 dark:hover:via-primary/15 dark:hover:to-primary/20 dark:hover:text-primary peer-checked:bg-purple-600">
                    Major (-1.0)
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Reason</label>
              <select
                value={deductReason}
                onChange={(e) => setDeductReason(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              >
                <option value="">Select a reason</option>
                <option value="Incorrect resolution">Incorrect resolution</option>
                <option value="Missing information">Missing information</option>
                <option value="Wrong categorization">Wrong categorization</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Admin Note (Optional)</label>
              <textarea
                value={deductAdminNote}
                onChange={(e) => setDeductAdminNote(e.target.value)}
                placeholder="Additional notes..."
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeductModal(false);
                setDeductSeverity('MINOR');
                setDeductReason('');
                setDeductAdminNote('');
                setDeductEntryId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeductScore}
              disabled={isDeducting || !deductReason}
            >
              {isDeducting ? <Loader2 size={16} className="animate-spin" /> : 'Deduct'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

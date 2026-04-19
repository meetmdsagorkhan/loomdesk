'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeft, ChevronDown, ChevronUp, MessageSquare, MinusCircle, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Badge from '@/components/shared/Badge';
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
        alert(error.error || 'Failed to deduct score');
        return;
      }

      await fetchReport();
      await fetchScoreEvents(report.user.id);
      setShowDeductModal(false);
      setDeductSeverity('MINOR');
      setDeductReason('');
      setDeductAdminNote('');
      setDeductEntryId(null);
    } catch (error) {
      console.error('Failed to deduct score:', error);
      alert('Failed to deduct score');
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
        alert('Failed to add feedback');
        return;
      }

      await fetchReport();
      setFeedbackComment('');
      setFeedbackEntryId(null);
    } catch (error) {
      console.error('Failed to add feedback:', error);
      alert('Failed to add feedback');
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
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/qa')}
        >
          <ArrowLeft size={16} className="mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Report Review</h1>
          <p className="text-muted-foreground mt-1">Review and score submitted report</p>
        </div>
      </div>

      {/* Report Header */}
      <div className="bg-card rounded-2xl border border-border p-6">
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
      </div>

      {/* Entries Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-medium text-foreground">Entries ({report.entries.length})</h2>
        </div>
        <div className="divide-y divide-border">
          {report.entries.map((entry) => (
            <div key={entry.id} className="border-b border-border last:border-0">
              <div className="p-4 flex items-center gap-4">
                <button
                  onClick={() => toggleEntry(entry.id)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
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
                    <div className="bg-muted/50 rounded-lg p-3">
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
                          <div key={fb.id} className="bg-muted/50 rounded-lg p-3">
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
                          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
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
      </div>

      {/* Score History */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-medium text-foreground">Score History</h2>
        </div>
        {scoreEvents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Severity</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Reason</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Admin Note</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Deduction</th>
                </tr>
              </thead>
              <tbody>
                {scoreEvents.map((event) => (
                  <tr key={event.id} className="border-b border-border last:border-0">
                    <td className="px-6 py-4 text-sm text-foreground">
                      {format(new Date(event.createdAt), 'MMM d, yyyy HH:mm')}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={event.severity === 'MAJOR' ? 'danger' : 'warning'} label={event.severity} />
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">{event.reason}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{event.adminNote || '-'}</td>
                    <td className="px-6 py-4 text-sm text-destructive font-medium">-{event.deduction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">No score deductions yet</p>
          </div>
        )}
      </div>

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
                  <div className="px-4 py-2.5 rounded-xl border border-input text-center cursor-pointer peer-checked:bg-destructive peer-checked:text-destructive-foreground peer-checked:border-destructive transition-all">
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
                  <div className="px-4 py-2.5 rounded-xl border border-input text-center cursor-pointer peer-checked:bg-destructive peer-checked:text-destructive-foreground peer-checked:border-destructive transition-all">
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
                className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
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
                className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
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

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  ChevronDown, 
  ChevronUp, 
  MessageSquare, 
  MinusCircle, 
  Loader2, 
  X, 
  CheckCircle,
  Sliders,
  CheckSquare,
  ShieldCheck,
  Trophy,
  Sparkles,
  Clock,
  AlertCircle
} from 'lucide-react';
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
import { motion, AnimatePresence } from 'framer-motion';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { isAdmin, isTeamLead } from '@/lib/auth-utils';
import { cn } from '@/lib/utils';

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
  type: 'TICKET' | 'CHAT' | 'MISCELLANEOUS';
  referenceId: string;
  status: 'SOLVED' | 'PENDING';
  note: string;
  pendingReason: string | null;
  feedback: Feedback[];
};

type ScoreEvent = {
  id: string;
  entryId: string | null;
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

  // Premium Split-Pane Auditing Workspace States
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [deductionAmount, setDeductionAmount] = useState<number>(0.5);
  const [error, setError] = useState('');
  const [auditCriteria, setAuditCriteria] = useState({
    tonePolite: true,
    slaDeadlineMet: true,
    resolutionAccurate: true,
    taggingCorrect: true,
  });

  useEffect(() => {
    if (report && report.entries && report.entries.length > 0 && !selectedEntryId) {
      setSelectedEntryId(report.entries[0].id);
    }
  }, [report, selectedEntryId]);

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
  const [isMarkingOk, setIsMarkingOk] = useState(false);
  const [isMarkingReviewed, setIsMarkingReviewed] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());
  const [reviewedEntries, setReviewedEntries] = useState<Set<string>>(new Set());
  const [hideReviewed, setHideReviewed] = useState(false);

  const isEntryReviewed = useCallback((entryId: string, feedbackLength: number) => {
    const hasFeedback = feedbackLength > 0;
    const hasDeduction = scoreEvents.some((event) => event.entryId === entryId);
    const wasMarkedOkLocally = reviewedEntries.has(entryId);
    return hasFeedback || hasDeduction || wasMarkedOkLocally;
  }, [scoreEvents, reviewedEntries]);

  const { user } = useCurrentUser();
  const isManager = user && (isAdmin({ user }) || isTeamLead({ user }));

  const fetchReport = useCallback(async () => {
    try {
      const response = await fetch(`/api/qa/reports/${reportId}`);
      const data = await response.json();
      setReport(data);
    } catch (error) {
      // Silently fail - report data will be empty
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
      // Silently fail - score events will be empty
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

  const toggleNote = (entryId: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
      return next;
    });
  };

  const toggleField = (entryId: string, field: string) => {
    setExpandedFields((prev) => {
      const next = new Set(prev);
      const key = `${entryId}-${field}`;
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
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
      setReviewedEntries((prev) => {
        const next = new Set(prev);
        next.add(deductEntryId);
        return next;
      });
      setShowDeductModal(false);
      setDeductSeverity('MINOR');
      setDeductReason('');
      setDeductAdminNote('');
      setDeductEntryId(null);
      showToast('Score deduction recorded', 'success');
    } catch (error) {
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
      setReviewedEntries((prev) => {
        const next = new Set(prev);
        next.add(entryId);
        return next;
      });
      showToast('Feedback added', 'success');
    } catch (error) {
      showToast('Failed to add feedback', 'error');
    } finally {
      setIsAddingFeedback(false);
    }
  };

  const handleMarkOk = async (entryId: string) => {
    setIsMarkingOk(true);
    try {
      const response = await fetch('/api/qa/entries/mark-ok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId,
        }),
      });

      if (!response.ok) {
        showToast('Failed to mark as OK', 'error');
        return;
      }

      await fetchReport();
      showToast('Marked as OK', 'success');
      setReviewedEntries((prev) => {
        const next = new Set(prev);
        next.add(entryId);
        return next;
      });
    } catch (error) {
      showToast('Failed to mark as OK', 'error');
    } finally {
      setIsMarkingOk(false);
    }
  };

  const handleMarkReviewed = async () => {
    if (!report) return;

    setIsMarkingReviewed(true);
    try {
      const response = await fetch(`/api/qa/reports/${report.id}/review`, {
        method: 'POST',
      });

      if (!response.ok) {
        showToast('Failed to mark as reviewed', 'error');
        return;
      }

      await fetchReport();
      showToast('Report marked as reviewed', 'success');
    } catch (error) {
      showToast('Failed to mark as reviewed', 'error');
    } finally {
      setIsMarkingReviewed(false);
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
          <div className="flex gap-2">
            {isManager && report.status === 'SUBMITTED' && (
              <Button
                size="sm"
                onClick={handleMarkReviewed}
                disabled={isMarkingReviewed}
                className="rounded-xl"
              >
                {isMarkingReviewed ? (
                  <Loader2 size={16} className="animate-spin mr-2" />
                ) : (
                  <CheckCircle size={16} className="mr-2" />
                )}
                Mark as Reviewed
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/dashboard/qa')}
              className="rounded-xl"
            >
              <ArrowLeft size={16} className="mr-2" />
              Back
            </Button>
          </div>
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

      {/* Enterprise Split-Pane Auditing Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Entries Listing (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-4">
          <GlassCard variant="default" padding="md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Entries List</h2>
              <Badge variant="info" label={`${report.entries.length} items`} />
            </div>
            
            <div className="space-y-3">
              {report.entries.map((entry) => {
                const reviewed = isEntryReviewed(entry.id, entry.feedback?.length || 0);
                const isSelected = selectedEntryId === entry.id;
                const scoreEvent = scoreEvents.find((e) => e.entryId === entry.id);

                return (
                  <div
                    key={entry.id}
                    onClick={() => {
                      setSelectedEntryId(entry.id);
                      setDeductEntryId(entry.id);
                      setError('');
                    }}
                    className={cn(
                      "group relative p-4 rounded-xl border transition-all duration-300 cursor-pointer select-none",
                      isSelected
                        ? "bg-primary/10 border-primary shadow-[0_0_15px_rgba(99,102,241,0.15)]"
                        : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                    )}
                  >
                    {isSelected && (
                      <div className="absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r bg-primary" />
                    )}

                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant={entry.type === 'TICKET' ? 'info' : entry.type === 'CHAT' ? 'success' : 'warning'}
                            label={entry.type}
                          />
                          <Badge variant={entry.status === 'SOLVED' ? 'success' : 'warning'} label={entry.status} />
                        </div>
                        <p className="text-xs font-semibold text-foreground mt-2 font-mono truncate max-w-[200px]">
                          Ref: {entry.referenceId}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {entry.note}
                        </p>
                      </div>

                      {/* Status Badges */}
                      <div className="flex flex-col items-end gap-1.5">
                        {scoreEvent ? (
                          <span className="text-[9px] font-bold tracking-wider text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20 shadow-sm flex items-center gap-1">
                            <MinusCircle size={10} /> -{scoreEvent.deduction}
                          </span>
                        ) : reviewed ? (
                          <span className="text-[9px] font-bold tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shadow-sm flex items-center gap-1">
                            <CheckCircle size={10} /> OK
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold tracking-wider text-muted-foreground bg-white/10 px-2 py-0.5 rounded-full border border-white/5 shadow-sm">
                            PENDING
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>

        {/* Right Side: Scorecard Console (lg:col-span-7) */}
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {selectedEntryId ? (() => {
              const entry = report.entries.find((e) => e.id === selectedEntryId);
              if (!entry) return null;
              const scoreEvent = scoreEvents.find((e) => e.entryId === entry.id);

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {/* Detailed Entry Description */}
                  <GlassCard variant="default" padding="md" className="relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
                      <div className="flex items-center gap-2">
                        <CheckSquare size={16} className="text-primary" />
                        <h3 className="text-sm font-bold text-foreground">Audit Worksheet: {entry.referenceId}</h3>
                      </div>
                      <Badge variant={entry.type === 'TICKET' ? 'info' : 'success'} label={entry.type} />
                    </div>

                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Internal Note</span>
                        <p className="text-sm text-foreground bg-white/5 border border-white/10 p-3.5 rounded-xl mt-1.5 whitespace-pre-wrap leading-relaxed shadow-inner">
                          {entry.note}
                        </p>
                      </div>

                      {entry.pendingReason && (
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pending Reason</span>
                          <p className="text-sm text-foreground bg-white/5 border border-white/10 p-3 rounded-xl mt-1 leading-relaxed">
                            {entry.pendingReason}
                          </p>
                        </div>
                      )}
                    </div>
                  </GlassCard>

                  {/* Auditing Form & Scorecard Console */}
                  <GlassCard variant="default" padding="md" className="relative border border-primary/20">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <ShieldCheck size={120} className="text-primary" />
                    </div>

                    <h3 className="text-base font-bold text-foreground flex items-center gap-2 mb-4">
                      <Sliders size={18} className="text-primary animate-pulse" />
                      Auditor Scorecard Console
                    </h3>

                    {scoreEvent ? (
                      /* Deducted State View */
                      <div className="bg-rose-500/10 border border-rose-500/25 p-5 rounded-2xl space-y-3 relative overflow-hidden">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-widest text-rose-400">Score Event Active</span>
                          <span className="text-lg font-extrabold text-rose-400 bg-rose-500/20 px-3 py-1 rounded-xl shadow-md border border-rose-500/20">
                            -{scoreEvent.deduction} Pts
                          </span>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-foreground">Reason: <span className="font-normal text-muted-foreground">{scoreEvent.reason}</span></p>
                          {scoreEvent.adminNote && (
                            <p className="text-xs text-muted-foreground border-t border-rose-500/10 pt-2 mt-2 italic">
                              " {scoreEvent.adminNote} "
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Audit Form (Manager Exclusive) */
                      isManager && report.status === 'SUBMITTED' ? (
                        <div className="space-y-6">
                          {/* 1. Checklist Criteria */}
                          <div className="space-y-3">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Compliance Checklist</span>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <label className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={auditCriteria.tonePolite}
                                  onChange={(e) => {
                                    const next = { ...auditCriteria, tonePolite: e.target.checked };
                                    setAuditCriteria(next);
                                    if (!e.target.checked) setDeductionAmount(0.5);
                                  }}
                                  className="accent-primary h-4 w-4 rounded"
                                />
                                <span className="text-xs font-medium text-foreground">Polite Tone & Greeting</span>
                              </label>
                              
                              <label className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={auditCriteria.slaDeadlineMet}
                                  onChange={(e) => {
                                    const next = { ...auditCriteria, slaDeadlineMet: e.target.checked };
                                    setAuditCriteria(next);
                                    if (!e.target.checked) setDeductionAmount(0.5);
                                  }}
                                  className="accent-primary h-4 w-4 rounded"
                                />
                                <span className="text-xs font-medium text-foreground">SLA Deadline Compliant</span>
                              </label>

                              <label className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={auditCriteria.resolutionAccurate}
                                  onChange={(e) => {
                                    const next = { ...auditCriteria, resolutionAccurate: e.target.checked };
                                    setAuditCriteria(next);
                                    if (!e.target.checked) setDeductionAmount(1.0);
                                  }}
                                  className="accent-primary h-4 w-4 rounded"
                                />
                                <span className="text-xs font-medium text-foreground">Resolution Accurate & Full</span>
                              </label>

                              <label className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={auditCriteria.taggingCorrect}
                                  onChange={(e) => {
                                    const next = { ...auditCriteria, taggingCorrect: e.target.checked };
                                    setAuditCriteria(next);
                                    if (!e.target.checked) setDeductionAmount(0.5);
                                  }}
                                  className="accent-primary h-4 w-4 rounded"
                                />
                                <span className="text-xs font-medium text-foreground">Correct Metadata Tags</span>
                              </label>
                            </div>
                          </div>

                          {/* 2. Interactive deduction slider */}
                          <div className="space-y-3 bg-white/5 border border-white/10 p-4 rounded-2xl shadow-inner">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Adjust Penalty Severity</span>
                              <span className={cn(
                                "text-xs font-bold px-3 py-1 rounded-full border",
                                deductionAmount <= 0.5 
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                                  : "bg-red-500/10 text-red-400 border-red-500/20"
                              )}>
                                {deductionAmount <= 0.5 ? 'MINOR DEDUCTION (-0.5 pts)' : 'MAJOR DEDUCTION (-1.0 pts)'}
                              </span>
                            </div>

                            <input
                              type="range"
                              min="0.1"
                              max="1.5"
                              step="0.1"
                              value={deductionAmount}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setDeductionAmount(val);
                                setDeductSeverity(val <= 0.5 ? 'MINOR' : 'MAJOR');
                              }}
                              className="w-full accent-primary bg-slate-200/50 dark:bg-slate-700/50 h-1.5 rounded-lg appearance-none cursor-pointer"
                            />

                            <div className="flex justify-between text-[10px] text-muted-foreground px-1 font-semibold">
                              <span>0.1 (Slight)</span>
                              <span>0.5 (Minor Limit)</span>
                              <span>1.0 (Major Limit)</span>
                              <span>1.5 (Extreme)</span>
                            </div>
                          </div>

                          {/* 3. Reason & Notes */}
                          <div className="space-y-4">
                            <div>
                              <label className="form-label text-xs uppercase tracking-widest text-muted-foreground mb-1 block">Deduction Reason</label>
                              <input
                                type="text"
                                value={deductReason}
                                onChange={(e) => setDeductReason(e.target.value)}
                                placeholder="e.g., Inaccurate tagging or SLA delay"
                                className="form-input h-10 w-full rounded-xl"
                              />
                            </div>

                            <div>
                              <label className="form-label text-xs uppercase tracking-widest text-muted-foreground mb-1 block">Auditor Private Notes</label>
                              <textarea
                                value={deductAdminNote}
                                onChange={(e) => setDeductAdminNote(e.target.value)}
                                placeholder="Optional internal coaching commentary"
                                className="form-input min-h-[80px] w-full rounded-xl py-2 resize-none"
                              />
                            </div>
                          </div>

                          {error && (
                            <div className="flex items-center gap-2 bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-2.5 rounded-xl text-xs font-medium">
                              <AlertCircle size={14} />
                              {error}
                            </div>
                          )}

                          {/* 4. Action Buttons */}
                          <div className="flex gap-2 justify-end border-t border-white/10 pt-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={async () => {
                                setIsMarkingOk(true);
                                try {
                                  setReviewedEntries((prev) => {
                                    const next = new Set(prev);
                                    next.add(entry.id);
                                    return next;
                                  });
                                  showToast('Entry marked as OK', 'success');
                                } finally {
                                  setIsMarkingOk(false);
                                }
                              }}
                              disabled={isMarkingOk}
                              className="rounded-xl h-10 px-5"
                            >
                              {isMarkingOk ? <Loader2 size={14} className="animate-spin" /> : 'Mark OK'}
                            </Button>

                            <Button
                              type="button"
                              variant="destructive"
                              onClick={async () => {
                                if (!deductReason.trim()) {
                                  setError('Please enter a reason for deduction');
                                  return;
                                }
                                setIsDeducting(true);
                                setError('');
                                try {
                                  const response = await fetch('/api/qa/score-events', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      userId: report.user.id,
                                      reportId: report.id,
                                      entryId: entry.id,
                                      severity: deductSeverity,
                                      reason: deductReason,
                                      adminNote: deductAdminNote,
                                    }),
                                  });

                                  if (!response.ok) {
                                    const err = await response.json();
                                    setError(err.error || 'Failed to submit deduction');
                                    return;
                                  }

                                  const data = await response.json();
                                  setScoreEvents((prev) => [...prev, data]);
                                  await fetchReport();
                                  setDeductReason('');
                                  setDeductAdminNote('');
                                  showToast('Deduction registered successfully', 'success');
                                } catch (e) {
                                  setError('Failed to submit deduction');
                                } finally {
                                  setIsDeducting(false);
                                }
                              }}
                              disabled={isDeducting}
                              className="rounded-xl h-10 px-5"
                            >
                              {isDeducting ? (
                                <Loader2 size={14} className="animate-spin mr-2" />
                              ) : (
                                <MinusCircle size={14} className="mr-2" />
                              )}
                              Deduct Score
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">You must be a manager or team lead to log score deductions on submitted reports.</p>
                      )
                    )}
                  </GlassCard>

                  {/* Feedback Chat Thread Card */}
                  <GlassCard variant="default" padding="md">
                    <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
                      <MessageSquare size={16} className="text-primary" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Coaching & Feedback Thread</h4>
                    </div>

                    <div className="space-y-4">
                      {entry.feedback && entry.feedback.length > 0 ? (
                        <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                          {entry.feedback.map((fb) => (
                            <div key={fb.id} className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-foreground">{fb.author.name}</span>
                                <span className="text-[9px] text-muted-foreground">{format(new Date(fb.createdAt), 'MMM d, h:mm a')}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">{fb.comment}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic py-2">No comments or feedback logged yet.</p>
                      )}

                      <div className="flex gap-2 items-center pt-2 border-t border-white/10">
                        <input
                          type="text"
                          placeholder="Add comment..."
                          value={feedbackComment}
                          onChange={(e) => setFeedbackComment(e.target.value)}
                          className="form-input h-9 flex-1 text-xs rounded-lg"
                        />
                        <Button
                          onClick={async () => {
                            if (!feedbackComment.trim()) return;
                            setIsAddingFeedback(true);
                            try {
                              const response = await fetch(`/api/qa/reports/${report.id}/entries/${entry.id}/feedback`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ comment: feedbackComment }),
                              });

                              if (!response.ok) {
                                showToast('Failed to add feedback', 'error');
                                return;
                              }

                              setFeedbackComment('');
                              await fetchReport();
                              showToast('Feedback posted', 'success');
                            } catch (e) {
                              showToast('Failed to add feedback', 'error');
                            } finally {
                              setIsAddingFeedback(false);
                            }
                          }}
                          disabled={isAddingFeedback}
                          size="sm"
                          className="rounded-lg h-9 px-4 text-xs font-semibold"
                        >
                          Send
                        </Button>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })() : (
              <GlassCard variant="default" padding="md" className="text-center py-12">
                <ShieldCheck size={48} className="mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Select an entry from the left column to begin auditing.</p>
              </GlassCard>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

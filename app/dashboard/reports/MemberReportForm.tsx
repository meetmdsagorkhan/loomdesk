'use client';

import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { format } from 'date-fns';
import { Trash2, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  flexRender,
  useReactTable,
  getCoreRowModel,
  ColumnDef,
} from '@tanstack/react-table';
import { entrySchema, type EntryFormData } from '@/lib/validations/report';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Badge from '@/components/shared/Badge';
import PageHeader from '@/components/shared/PageHeader';
import GlassCard from '@/components/shared/GlassCard';
import ConfirmModal from '@/components/shared/ConfirmModal';
import { showToast } from '@/components/shared/Toast';
import { handleApiError } from '@/lib/error-handler';

type ReportEntry = {
  id: string;
  type: 'TICKET' | 'CHAT' | 'MISCELLANEOUS';
  referenceId: string;
  status: 'SOLVED' | 'PENDING';
  note: string;
  pendingReason: string | null;
  createdAt: string;
};

type Report = {
  id: string;
  date: string;
  status: 'DRAFT' | 'SUBMITTED';
  entries: ReportEntry[];
};

const defaultEntryForm: EntryFormData = {
  type: 'TICKET',
  referenceId: '',
  status: 'SOLVED',
  note: '',
  pendingReason: '',
};

export default function MemberReportForm() {
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingEntry, setIsSubmittingEntry] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [entryForm, setEntryForm] = useState<EntryFormData>(defaultEntryForm);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof EntryFormData, string>>>({});
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [isUpdatingEntry, setIsUpdatingEntry] = useState(false);
  const [updateForm, setUpdateForm] = useState<{ status: 'SOLVED' | 'PENDING'; pendingReason?: string }>({
    status: 'SOLVED',
    pendingReason: '',
  });

  const handleFieldChange = (field: keyof EntryFormData, value: string) => {
    setEntryForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const fetchReport = useCallback(async () => {
    try {
      const response = await fetch('/api/reports/today');
      if (!response.ok) {
        handleApiError('Failed to fetch report', 'Daily Report');
        return;
      }
      const data = await response.json();
      setReport(data);
    } catch (error) {
      handleApiError(error, 'Daily Report');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchReport();
      }
    };

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchReport();
      }
    }, 30000);

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchReport]);

  const onAddEntry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = entrySchema.safeParse(entryForm);

    if (!parsed.success) {
      const nextErrors: Partial<Record<keyof EntryFormData, string>> = {};

      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0];

        if (
          field === 'type' ||
          field === 'referenceId' ||
          field === 'status' ||
          field === 'note' ||
          field === 'pendingReason'
        ) {
          nextErrors[field] = issue.message;
        }
      });

      setFieldErrors(nextErrors);
      return;
    }

    if (!report) return;

    const data = parsed.data;
    setIsSubmittingEntry(true);

    try {
      const response = await fetch(`/api/reports/${report.id}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        handleApiError(result.error || 'Failed to add entry', 'Daily Report');
        return;
      }

      const newEntry = await response.json();
      setReport({
        ...report,
        entries: [...report.entries, newEntry],
      });

      setEntryForm(defaultEntryForm);
      setFieldErrors({});
      setShowSavedIndicator(true);
      showToast('Entry added to today\'s report', 'success');
      setTimeout(() => setShowSavedIndicator(false), 2000);
    } catch (error) {
      handleApiError(error, 'Daily Report');
    } finally {
      setIsSubmittingEntry(false);
    }
  };

  const onDeleteEntry = async (entryId: string) => {
    if (!report) return;

    try {
      const response = await fetch(`/api/reports/${report.id}/entries/${entryId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        handleApiError('Failed to delete entry', 'Daily Report');
        return;
      }

      setReport({
        ...report,
        entries: report.entries.filter((entry) => entry.id !== entryId),
      });
      setDeleteEntryId(null);
      showToast('Entry removed', 'success');
    } catch (error) {
      handleApiError(error, 'Daily Report');
    }
  };

  const onSubmitReport = async () => {
    if (!report) return;

    setIsSubmittingReport(true);

    try {
      const response = await fetch(`/api/reports/${report.id}/submit`, {
        method: 'POST',
      });

      if (!response.ok) {
        const result = await response.json();
        handleApiError(result.error || 'Failed to submit report', 'Daily Report');
        return;
      }

      const updatedReport = await response.json();
      setReport(updatedReport);
      setShowSubmitConfirm(false);
      showToast('Report submitted successfully', 'success');
    } catch (error) {
      handleApiError(error, 'Daily Report');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const onUpdateEntryStatus = async (entryId: string) => {
    if (!report) return;

    setIsUpdatingEntry(true);

    try {
      const response = await fetch(`/api/reports/${report.id}/entries/${entryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: updateForm.status,
          pendingReason: updateForm.status === 'PENDING' ? updateForm.pendingReason : null,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        handleApiError(result.error || 'Failed to update entry', 'Daily Report');
        return;
      }

      const updatedEntry = await response.json();
      setReport({
        ...report,
        entries: report.entries.map((entry) =>
          entry.id === entryId ? updatedEntry : entry
        ),
      });
      setEditingEntryId(null);
      setUpdateForm({ status: 'SOLVED', pendingReason: '' });
      showToast('Entry status updated', 'success');
    } catch (error) {
      handleApiError(error, 'Daily Report');
    } finally {
      setIsUpdatingEntry(false);
    }
  };

  const onEditEntry = (entry: ReportEntry) => {
    setEditingEntryId(entry.id);
    setUpdateForm({
      status: entry.status,
      pendingReason: entry.pendingReason || '',
    });
  };

  const columns: ColumnDef<ReportEntry>[] = [
    {
      accessorKey: 'index',
      header: '#',
      cell: ({ row }) => row.index + 1,
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => {
        const variant = row.original.type === 'TICKET' ? 'info' : 
                       row.original.type === 'CHAT' ? 'success' : 'warning';
        return <Badge variant={variant} label={row.original.type} />;
      },
    },
    {
      accessorKey: 'referenceId',
      header: 'Reference ID',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge
          variant={row.original.status === 'SOLVED' ? 'success' : 'warning'}
          label={row.original.status}
        />
      ),
    },
    {
      accessorKey: 'note',
      header: 'Note',
      cell: ({ row }) => <div className="max-w-xs truncate">{row.original.note}</div>,
    },
    {
      accessorKey: 'pendingReason',
      header: 'Pending Reason',
      cell: ({ row }) => (
        <div className="max-w-xs truncate">{row.original.pendingReason || '-'}</div>
      ),
    },
    {
      accessorKey: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEditEntry(row.original)}
            className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-colors"
            title="Update status"
          >
            <CheckCircle2 size={16} />
          </button>
          <button
            onClick={() => setDeleteEntryId(row.original.id)}
            className="p-2 text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
            disabled={report?.status === 'SUBMITTED'}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: report?.entries || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isSubmitted = report?.status === 'SUBMITTED';
  const entryCount = report?.entries.length || 0;
  const segmentClassName =
    'rounded-xl border border-white/20 bg-gradient-to-br from-white/40 via-white/20 to-white/40 px-4 py-3 text-center text-sm font-medium text-muted-foreground transition-all cursor-pointer hover:from-primary/15 hover:via-primary/10 hover:to-primary/15 hover:text-primary backdrop-blur-sm shadow-sm peer-checked:border-purple-500 peer-checked:bg-purple-500 peer-checked:text-white peer-checked:shadow-[0_8px_24px_rgba(168,85,247,0.5)] dark:border-white/10 dark:from-slate-800/40 dark:via-slate-900/20 dark:to-slate-800/40 dark:hover:from-primary/20 dark:hover:via-primary/15 dark:hover:to-primary/20 dark:hover:text-primary peer-checked:bg-purple-600 peer-focus-visible:ring-2 peer-focus-visible:ring-purple-500';

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Daily Report"
        title={format(new Date(), 'EEEE, MMMM d, yyyy')}
        subtitle="Track your daily work entries, add tickets and chats, and submit your report for review."
        actions={
          <Badge
            variant={isSubmitted ? 'success' : 'warning'}
            label={isSubmitted ? 'SUBMITTED' : 'DRAFT'}
          />
        }
      />

      {isSubmitted && (
        <GlassCard variant="panel" padding="sm" className="border border-info/30 bg-info/10">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={20} className="text-info" />
            <span className="text-sm text-foreground">Report submitted. You can still update ticket statuses using the edit button.</span>
          </div>
        </GlassCard>
      )}

      {!isSubmitted && (
        <GlassCard variant="panel" padding="none" className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/15 px-5 py-4 md:px-6">
            <h2 className="text-lg font-semibold text-foreground">Add Entry</h2>
            <span className="glass-pill rounded-full px-3 py-1 text-xs font-semibold text-muted-foreground">
              Saved to database
            </span>
          </div>
          <form onSubmit={onAddEntry} className="space-y-5 p-5 md:p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <Label className="mb-2">Type</Label>
                <div className="flex gap-2">
                  <label className="flex-1">
                    <input
                      type="radio"
                      value="TICKET"
                      checked={entryForm.type === 'TICKET'}
                      onChange={(event) => handleFieldChange('type', event.target.value)}
                      className="peer sr-only"
                    />
                    <div className={segmentClassName}>
                      Ticket
                    </div>
                  </label>
                  <label className="flex-1">
                    <input
                      type="radio"
                      value="CHAT"
                      checked={entryForm.type === 'CHAT'}
                      onChange={(event) => handleFieldChange('type', event.target.value)}
                      className="peer sr-only"
                    />
                    <div className={segmentClassName}>
                      Chat
                    </div>
                  </label>
                  <label className="flex-1">
                    <input
                      type="radio"
                      value="MISCELLANEOUS"
                      checked={entryForm.type === 'MISCELLANEOUS'}
                      onChange={(event) => handleFieldChange('type', event.target.value)}
                      className="peer sr-only"
                    />
                    <div className={segmentClassName}>
                      Misc
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <Label className="mb-2">
                  Reference ID
                </Label>
                <Input
                  type="text"
                  value={entryForm.referenceId}
                  onChange={(event) => handleFieldChange('referenceId', event.target.value)}
                  placeholder="e.g. TKT-1042"
                />
                {fieldErrors.referenceId && (
                  <p className="text-destructive text-xs mt-1">{fieldErrors.referenceId}</p>
                )}
              </div>

              <div>
                <Label className="mb-2">Status</Label>
                <div className="flex gap-2">
                  <label className="flex-1">
                    <input
                      type="radio"
                      value="SOLVED"
                      checked={entryForm.status === 'SOLVED'}
                      onChange={(event) => handleFieldChange('status', event.target.value)}
                      className="peer sr-only"
                    />
                    <div className={segmentClassName}>
                      Solved
                    </div>
                  </label>
                  <label className="flex-1">
                    <input
                      type="radio"
                      value="PENDING"
                      checked={entryForm.status === 'PENDING'}
                      onChange={(event) => handleFieldChange('status', event.target.value)}
                      className="peer sr-only"
                    />
                    <div className={segmentClassName}>
                      Pending
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <Label className="mb-2">Note</Label>
              <textarea
                value={entryForm.note}
                onChange={(event) => handleFieldChange('note', event.target.value)}
                rows={2}
                className="form-input resize-none"
                placeholder="Describe the work done..."
              />
              {fieldErrors.note && (
                <p className="text-destructive text-xs mt-1">{fieldErrors.note}</p>
              )}
            </div>

            {entryForm.status === 'PENDING' && (
              <div>
                <Label className="mb-2">
                  Pending Reason <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="text"
                  value={entryForm.pendingReason ?? ''}
                  onChange={(event) => handleFieldChange('pendingReason', event.target.value)}
                  placeholder="Why is this pending?"
                />
                {fieldErrors.pendingReason && (
                  <p className="text-destructive text-xs mt-1">{fieldErrors.pendingReason}</p>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmittingEntry} className="min-w-[120px] rounded-xl">
                {isSubmittingEntry ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Entry'
                )}
              </Button>
            </div>
          </form>
        </GlassCard>
      )}

      {showSavedIndicator && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/90 via-emerald-600/90 to-emerald-500/90 px-4 py-2 text-white backdrop-blur-md shadow-[0_8px_32px_rgba(16,185,129,0.3)] animate-in slide-in-from-bottom-4">
          <CheckCircle2 size={16} />
          <span className="text-sm font-medium">Saved</span>
        </div>
      )}

      <GlassCard variant="panel" padding="none" className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/15 px-5 py-4 md:px-6">
          <h2 className="text-lg font-semibold text-foreground">Entries</h2>
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {entryCount} Total
          </span>
        </div>

        {entryCount === 0 ? (
          <div className="p-12 text-center">
            <div className="rounded-2xl border border-dashed border-slate-300/50 p-8 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.8),inset_0_-1px_0_rgba(0,0,0,0.05),0_8px_32px_rgba(0,0,0,0.05)] dark:border-slate-700/50 dark:bg-slate-800/50 dark:backdrop-blur-sm dark:shadow-none">
              <p className="text-muted-foreground">No entries yet. Add your first entry above.</p>
            </div>
          </div>
        ) : (
          <div className="p-4 md:p-6">
            <div className="overflow-x-auto rounded-2xl border border-white/20 bg-white/25 shadow-[0_16px_48px_rgba(76,92,148,0.16)] dark:bg-slate-900/30 backdrop-blur-sm">
              <table className="w-full">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id} className="border-b border-white/20 bg-white/35 dark:bg-white/5 backdrop-blur-sm">
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-white/15 text-foreground transition-colors last:border-0 hover:bg-white/35 dark:hover:bg-white/5 backdrop-blur-sm"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-5 py-3.5 text-sm">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </GlassCard>

      <section className="glass-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/20 bg-gradient-to-br from-white/30 via-white/15 to-white/30 px-5 py-4 dark:from-slate-800/30 dark:via-slate-900/15 dark:to-slate-800/30 backdrop-blur-sm shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">
          {entryCount} {entryCount === 1 ? 'entry' : 'entries'} added
        </p>
        {!isSubmitted && (
          <Button
            onClick={() => setShowSubmitConfirm(true)}
            disabled={entryCount === 0 || isSubmittingReport}
            className="min-w-[140px] rounded-xl"
          >
            {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
          </Button>
        )}
      </section>

      <ConfirmModal
        isOpen={!!deleteEntryId}
        onCancel={() => setDeleteEntryId(null)}
        onConfirm={() => deleteEntryId && onDeleteEntry(deleteEntryId)}
        title="Delete Entry"
        description="Are you sure you want to delete this entry? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />

      <ConfirmModal
        isOpen={showSubmitConfirm}
        onCancel={() => setShowSubmitConfirm(false)}
        onConfirm={onSubmitReport}
        title="Submit Report"
        description={`You are about to submit ${entryCount} ${entryCount === 1 ? 'entry' : 'entries'}. This cannot be undone.`}
        confirmLabel="Submit"
      />

      <ConfirmModal
        isOpen={!!editingEntryId}
        onCancel={() => {
          setEditingEntryId(null);
          setUpdateForm({ status: 'SOLVED', pendingReason: '' });
        }}
        onConfirm={() => editingEntryId && onUpdateEntryStatus(editingEntryId)}
        title="Update Ticket Status"
        description={`Update the status of this ticket. Current status: ${updateForm.status}. ${updateForm.status === 'PENDING' ? 'Pending reason: ' + (updateForm.pendingReason || 'None') : ''}`}
        confirmLabel="Update"
        variant="default"
      />
    </div>
  );
}

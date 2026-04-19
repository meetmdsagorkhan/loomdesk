'use client';

import { useState, useEffect, type FormEvent } from 'react';
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
import Badge from '@/components/shared/Badge';
import ConfirmModal from '@/components/shared/ConfirmModal';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type ReportEntry = {
  id: string;
  type: 'TICKET' | 'CHAT';
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

export default function ReportsPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingEntry, setIsSubmittingEntry] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [entryForm, setEntryForm] = useState<EntryFormData>(defaultEntryForm);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof EntryFormData, string>>>({});

  const handleFieldChange = (field: keyof EntryFormData, value: string) => {
    setEntryForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      const response = await fetch('/api/reports/today');
      const data = await response.json();
      setReport(data);
    } catch (error) {
      console.error('Failed to fetch report:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
        alert(result.error || 'Failed to add entry');
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
      setTimeout(() => setShowSavedIndicator(false), 2000);
    } catch (error) {
      console.error('Failed to add entry:', error);
      alert('Failed to add entry');
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
        alert('Failed to delete entry');
        return;
      }

      setReport({
        ...report,
        entries: report.entries.filter((entry) => entry.id !== entryId),
      });
      setDeleteEntryId(null);
    } catch (error) {
      console.error('Failed to delete entry:', error);
      alert('Failed to delete entry');
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
        alert(result.error || 'Failed to submit report');
        return;
      }

      const updatedReport = await response.json();
      setReport(updatedReport);
      setShowSubmitConfirm(false);
    } catch (error) {
      console.error('Failed to submit report:', error);
      alert('Failed to submit report');
    } finally {
      setIsSubmittingReport(false);
    }
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
      cell: ({ row }) => (
        <Badge
          variant={row.original.type === 'TICKET' ? 'info' : 'success'}
          label={row.original.type}
        />
      ),
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
        <button
          onClick={() => setDeleteEntryId(row.original.id)}
          className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
          disabled={report?.status === 'SUBMITTED'}
        >
          <Trash2 size={16} />
        </button>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Daily Report</h1>
          <p className="text-muted-foreground mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <Badge
          variant={isSubmitted ? 'success' : 'warning'}
          label={isSubmitted ? 'SUBMITTED' : 'DRAFT'}
        />
      </div>

      {isSubmitted && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} />
          <span className="text-sm">Report submitted. Contact admin to unlock.</span>
        </div>
      )}

      {!isSubmitted && (
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="text-lg font-medium text-foreground mb-4">Add Entry</h2>
          <form onSubmit={onAddEntry} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Type</label>
                <div className="flex gap-2">
                  <label className="flex-1">
                    <input
                      type="radio"
                      value="TICKET"
                      checked={entryForm.type === 'TICKET'}
                      onChange={(event) => handleFieldChange('type', event.target.value)}
                      className="peer sr-only"
                    />
                    <div className="px-4 py-2.5 rounded-xl border border-input text-center cursor-pointer peer-checked:bg-primary peer-checked:text-primary-foreground peer-checked:border-primary transition-all">
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
                    <div className="px-4 py-2.5 rounded-xl border border-input text-center cursor-pointer peer-checked:bg-primary peer-checked:text-primary-foreground peer-checked:border-primary transition-all">
                      Chat
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Reference ID
                </label>
                <input
                  value={entryForm.referenceId}
                  onChange={(event) => handleFieldChange('referenceId', event.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  placeholder="e.g. TKT-1042"
                />
                {fieldErrors.referenceId && (
                  <p className="text-destructive text-xs mt-1">{fieldErrors.referenceId}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Status</label>
                <div className="flex gap-2">
                  <label className="flex-1">
                    <input
                      type="radio"
                      value="SOLVED"
                      checked={entryForm.status === 'SOLVED'}
                      onChange={(event) => handleFieldChange('status', event.target.value)}
                      className="peer sr-only"
                    />
                    <div className="px-4 py-2.5 rounded-xl border border-input text-center cursor-pointer peer-checked:bg-primary peer-checked:text-primary-foreground peer-checked:border-primary transition-all">
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
                    <div className="px-4 py-2.5 rounded-xl border border-input text-center cursor-pointer peer-checked:bg-primary peer-checked:text-primary-foreground peer-checked:border-primary transition-all">
                      Pending
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Note</label>
              <textarea
                value={entryForm.note}
                onChange={(event) => handleFieldChange('note', event.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                placeholder="Describe the work done..."
              />
              {fieldErrors.note && (
                <p className="text-destructive text-xs mt-1">{fieldErrors.note}</p>
              )}
            </div>

            {entryForm.status === 'PENDING' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Pending Reason <span className="text-destructive">*</span>
                </label>
                <input
                  value={entryForm.pendingReason ?? ''}
                  onChange={(event) => handleFieldChange('pendingReason', event.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  placeholder="Why is this pending?"
                />
                {fieldErrors.pendingReason && (
                  <p className="text-destructive text-xs mt-1">{fieldErrors.pendingReason}</p>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmittingEntry} className="min-w-[120px]">
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
        </div>
      )}

      {showSavedIndicator && (
        <div className="fixed bottom-6 right-6 bg-success text-success-foreground px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg animate-in slide-in-from-bottom-4">
          <CheckCircle2 size={16} />
          <span className="text-sm font-medium">Saved</span>
        </div>
      )}

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-medium text-foreground">Entries</h2>
        </div>

        {entryCount === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">No entries yet. Add your first entry above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-6 py-3 text-left text-sm font-medium text-muted-foreground"
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
                  <tr key={row.id} className="border-b border-border last:border-0">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-6 py-4 text-sm">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {entryCount} {entryCount === 1 ? 'entry' : 'entries'} added
        </p>
        {!isSubmitted && (
          <Button
            onClick={() => setShowSubmitConfirm(true)}
            disabled={entryCount === 0 || isSubmittingReport}
            className="min-w-[140px]"
          >
            {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
          </Button>
        )}
      </div>

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
    </div>
  );
}

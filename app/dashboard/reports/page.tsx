'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Loader2, Filter, Eye, FileText, Calendar as CalendarIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  flexRender,
  useReactTable,
  getCoreRowModel,
  ColumnDef,
} from '@tanstack/react-table';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { isAdmin, isTeamLead } from '@/lib/auth-utils';
import PageHeader from '@/components/shared/PageHeader';
import GlassCard from '@/components/shared/GlassCard';
import Badge from '@/components/shared/Badge';
import { Button, buttonVariants } from '@/components/ui/button';
import MemberReportForm from './MemberReportForm';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type ReportSummary = {
  id: string;
  date: string;
  status: 'DRAFT' | 'SUBMITTED';
  user: {
    name: string;
    email: string;
  };
  _count: {
    entries: number;
  };
};

export default function ReportsPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useCurrentUser();
  const [mounted, setMounted] = useState(false);
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');

  const isManager = user && (isAdmin({ user }) || isTeamLead({ user }));

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchTeamReports = useCallback(async () => {
    if (!isManager) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDate) params.append('date', selectedDate);
      const response = await fetch(`/api/reports?${params}`);
      const data = await response.json();
      setReports(data.reports || []);
    } catch (error) {
      // Silently fail - reports list will be empty
    } finally {
      setIsLoading(false);
    }
  }, [isManager, selectedDate]);

  useEffect(() => {
    if (!mounted || userLoading) return;
    if (isManager) {
      fetchTeamReports();
    }
  }, [mounted, userLoading, isManager, fetchTeamReports]);

  useEffect(() => {
    if (!mounted || userLoading || !isManager) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchTeamReports();
      }
    };

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchTeamReports();
      }
    }, 30000);

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [mounted, userLoading, isManager, fetchTeamReports]);

  const columns: ColumnDef<ReportSummary>[] = [
    {
      accessorKey: 'user.name',
      header: 'Member',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{row.original.user.name}</span>
          <span className="text-xs text-muted-foreground">{row.original.user.email}</span>
        </div>
      ),
    },
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => format(new Date(row.original.date), 'MMM d, yyyy'),
    },
    {
      accessorKey: '_count.entries',
      header: 'Entries',
      cell: ({ row }) => (
        <Badge variant="info" label={`${row.original._count.entries} entries`} />
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge
          variant={row.original.status === 'SUBMITTED' ? 'success' : 'warning'}
          label={row.original.status}
        />
      ),
    },
    {
      accessorKey: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => router.push(`/dashboard/qa/${row.original.id}`)}
          className="rounded-xl"
        >
          <Eye size={14} className="mr-2" />
          Review
        </Button>
      ),
    },
  ];

  const table = useReactTable({
    data: reports,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!mounted || userLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isManager) {
    return <MemberReportForm />;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Reporting Hub"
        title="Team Reports"
        subtitle="Monitor and review daily activity logs from all team members."
      />

      {/* Filters */}
      <GlassCard variant="panel" padding="md">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-full md:w-64">
            <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Filter by Date</label>
            <Popover>
              <PopoverTrigger
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "w-full justify-start text-left font-normal rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-foreground py-2.5",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(new Date(selectedDate), "PPP") : <span>Pick a date</span>}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 border border-white/10" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate ? (() => {
                    const [y, m, d] = selectedDate.split('-').map(Number);
                    return new Date(y, m - 1, d);
                  })() : undefined}
                  onSelect={(date) => {
                    if (date) {
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      setSelectedDate(`${year}-${month}-${day}`);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <Button onClick={fetchTeamReports} disabled={isLoading} className="rounded-xl">
            {isLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Filter size={16} className="mr-2" />}
            Refresh
          </Button>
        </div>
      </GlassCard>

      {/* Reports Table */}
      <GlassCard variant="panel" padding="none" className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Submissions</h2>
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {reports.length} Total
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center">
            <div className="max-w-xs mx-auto space-y-3">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <FileText size={20} className="text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">No reports found for this date.</p>
            </div>
          </div>
        ) : (
          <div className="p-4 md:p-6">
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    {table.getHeaderGroups().map(headerGroup => (
                      headerGroup.headers.map(header => (
                        <th key={header.id} className="px-6 py-4 font-bold uppercase tracking-widest text-[10px] text-muted-foreground">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.getRowModel().rows.map(row => (
                    <tr key={row.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="px-6 py-4">
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
    </div>
  );
}

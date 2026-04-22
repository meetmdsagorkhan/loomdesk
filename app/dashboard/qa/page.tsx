'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Eye, Loader2, Filter } from 'lucide-react';
import {
  flexRender,
  useReactTable,
  getCoreRowModel,
  ColumnDef,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import Badge from '@/components/shared/Badge';
import PageHeader from '@/components/shared/PageHeader';
import GlassCard from '@/components/shared/GlassCard';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { isAdmin, isTeamLead } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type Report = {
  id: string;
  date: string;
  status: string;
  score: number;
  user: {
    id: string;
    name: string;
    email: string;
  };
  _count: {
    entries: number;
  };
};

export default function QAPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useCurrentUser();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('SUBMITTED');
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      setMembers(data.users || []);
    } catch (error) {
      console.error('Failed to fetch members:', error);
    }
  };

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDate) params.append('date', selectedDate);
      if (selectedUserId) params.append('userId', selectedUserId);
      if (selectedStatus) params.append('status', selectedStatus);

      const response = await fetch(`/api/qa/reports?${params}`);
      const data = await response.json();
      setReports(data.reports || []);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, selectedUserId, selectedStatus]);

  const handleApplyFilters = async () => {
    setIsFilterLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDate) params.append('date', selectedDate);
      if (selectedUserId) params.append('userId', selectedUserId);
      if (selectedStatus) params.append('status', selectedStatus);

      const response = await fetch(`/api/qa/reports?${params}`);
      const data = await response.json();
      setReports(data.reports || []);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setIsFilterLoading(false);
    }
  };

  useEffect(() => {
    if (userLoading) return;
    if (!mounted) return;

    if (!user || (!isAdmin({ user }) && !isTeamLead({ user }))) {
      router.push('/dashboard');
      return;
    }

    fetchMembers();
    fetchReports();
  }, [user, userLoading, router, fetchReports, mounted]);

  const columns: ColumnDef<Report>[] = [
    {
      accessorKey: 'user.name',
      header: 'Member Name',
    },
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => format(new Date(row.original.date), 'MMM d, yyyy'),
    },
    {
      accessorKey: '_count.entries',
      header: 'Entries',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'SUBMITTED' ? 'success' : 'warning'} label={row.original.status} />
      ),
    },
    {
      accessorKey: 'score',
      header: 'Score',
      cell: ({ row }) => (
        <span className={row.original.score < 90 ? 'text-destructive font-medium' : 'text-foreground'}>
          {row.original.score}
        </span>
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
        >
          <Eye size={16} className="mr-2" />
          View
        </Button>
      ),
    },
  ];

  const table = useReactTable({
    data: reports,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
  const filterInputClass =
    'w-full rounded-xl border border-slate-300/50 bg-gradient-to-br from-white/90 via-white/70 to-white/90 px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 backdrop-blur-md transition-all dark:border-slate-600/50 dark:from-slate-800/90 dark:via-slate-900/70 dark:to-slate-800/90';

  // Prevent SSR rendering
  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (userLoading || isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader
          badge="QA Review"
          title="Review submitted reports"
          subtitle="Review and score team member reports to ensure quality and provide feedback."
        />
        <GlassCard variant="panel" padding="md">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Date Picker */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className={filterInputClass}
              />
            </div>

            {/* Member Dropdown */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Member</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className={filterInputClass}
              >
                <option value="">All Members</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className={filterInputClass}
              >
                <option value="SUBMITTED">Submitted</option>
                <option value="DRAFT">Draft</option>
                <option value="all">All</option>
              </select>
            </div>

            {/* Apply Button */}
            <div className="flex items-end">
              <Button onClick={handleApplyFilters} disabled={isFilterLoading} className="w-full">
                {isFilterLoading ? (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                ) : (
                  <Filter size={16} className="mr-2" />
                )}
                {isFilterLoading ? 'Applying...' : 'Apply Filters'}
              </Button>
            </div>
          </div>
        </GlassCard>

        {/* Reports Table */}
        <GlassCard variant="panel" padding="none" className="overflow-hidden">
          <div className="border-b border-white/15 px-5 py-4 md:px-6">
            <h2 className="text-lg font-semibold text-foreground">Submitted Reports</h2>
          </div>
          {reports.length === 0 ? (
            <div className="p-12 text-center">
              <div className="rounded-2xl border border-dashed border-slate-300/50 p-8 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.8),inset_0_-1px_0_rgba(0,0,0,0.05),0_8px_32px_rgba(0,0,0,0.05)] dark:border-slate-700/50 dark:bg-slate-800/50 dark:backdrop-blur-sm dark:shadow-none">
                <p className="text-muted-foreground">No reports found matching your filters.</p>
              </div>
            </div>
          ) : (
            <div className="p-4 md:p-6">
              <div className="overflow-x-auto rounded-2xl border border-white/20 bg-white/25 shadow-[0_16px_48px_rgba(76,92,148,0.16)] dark:bg-slate-900/30 backdrop-blur-sm">
              <table className="w-full">
                <thead className="border-b border-white/20 bg-white/35 dark:bg-white/5 backdrop-blur-sm">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
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
                    <tr key={row.id} className="border-b border-white/15 last:border-0 hover:bg-white/35 dark:hover:bg-white/5 backdrop-blur-sm">
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
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        badge="QA Review"
        title="Review submitted reports"
        subtitle="Review and score team member reports to ensure quality and provide feedback."
      />
      <GlassCard variant="panel" padding="md">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Date Picker */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={filterInputClass}
            />
          </div>

          {/* Member Dropdown */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Member</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className={filterInputClass}
            >
              <option value="">All Members</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className={filterInputClass}
            >
              <option value="SUBMITTED">Submitted</option>
              <option value="DRAFT">Draft</option>
              <option value="all">All</option>
            </select>
          </div>

          {/* Apply Button */}
          <div className="flex items-end">
            <Button onClick={handleApplyFilters} disabled={isFilterLoading} className="w-full">
              {isFilterLoading ? (
                <Loader2 size={16} className="mr-2 animate-spin" />
              ) : (
                <Filter size={16} className="mr-2" />
              )}
              {isFilterLoading ? 'Applying...' : 'Apply Filters'}
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* Reports Table */}
      <GlassCard variant="panel" padding="none" className="overflow-hidden">
        <div className="border-b border-white/15 px-5 py-4 md:px-6">
          <h2 className="text-lg font-semibold text-foreground">Submitted Reports</h2>
        </div>
        {reports.length === 0 ? (
          <div className="p-12 text-center">
            <div className="rounded-2xl border border-dashed border-slate-300/50 p-8 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.8),inset_0_-1px_0_rgba(0,0,0,0.05),0_8px_32px_rgba(0,0,0,0.05)] dark:border-slate-700/50 dark:bg-slate-800/50 dark:backdrop-blur-sm dark:shadow-none">
              <p className="text-muted-foreground">No reports found matching your filters.</p>
            </div>
          </div>
        ) : (
          <div className="p-4 md:p-6">
            <div className="overflow-x-auto rounded-2xl border border-white/20 bg-white/25 shadow-[0_16px_48px_rgba(76,92,148,0.16)] dark:bg-slate-900/30 backdrop-blur-sm">
            <table className="w-full">
              <thead className="border-b border-white/20 bg-white/35 dark:bg-white/5 backdrop-blur-sm">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
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
                  <tr key={row.id} className="border-b border-white/15 last:border-0 hover:bg-white/35 dark:hover:bg-white/5 backdrop-blur-sm">
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
    </div>
  );
}

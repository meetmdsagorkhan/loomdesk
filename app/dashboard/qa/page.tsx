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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Badge from '@/components/shared/Badge';
import PageHeader from '@/components/shared/PageHeader';
import GlassCard from '@/components/shared/GlassCard';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { isAdmin, isTeamLead } from '@/lib/auth-utils';
import { showToast } from '@/components/shared/Toast';


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
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  interface SavedFilter {
    id: string;
    name: string;
    date: string;
    userId: string;
    status: string;
  }
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [newFilterName, setNewFilterName] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('loomdesk_qa_filters');
    if (stored) {
      try {
        setSavedFilters(JSON.parse(stored));
      } catch (e) {}
    }
  }, []);

  const handleSaveFilter = () => {
    if (!newFilterName.trim()) return;
    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: newFilterName.trim(),
      date: selectedDate,
      userId: selectedUserId,
      status: selectedStatus,
    };
    const next = [...savedFilters, newFilter];
    setSavedFilters(next);
    localStorage.setItem('loomdesk_qa_filters', JSON.stringify(next));
    setNewFilterName('');
    showToast(`Filter preset "${newFilter.name}" saved`, 'success');
  };

  const handleDeleteFilter = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = savedFilters.filter((f) => f.id !== id);
    setSavedFilters(next);
    localStorage.setItem('loomdesk_qa_filters', JSON.stringify(next));
    showToast('Filter preset deleted', 'success');
  };

  const handleApplyPreset = (preset: SavedFilter) => {
    setSelectedDate(preset.date);
    setSelectedUserId(preset.userId);
    setSelectedStatus(preset.status);
    showToast(`Loaded view: ${preset.name}`, 'info');
  };
  const [currentPage, setCurrentPage] = useState(1);
  const [totalReports, setTotalReports] = useState(0);
  const limit = 10;
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      // Filter out ADMIN users from the member list
      setMembers((data.users || []).filter((u: { role: string }) => u.role !== 'ADMIN'));
    } catch (error) {
      // Silently fail - members list will be empty
    }
  };

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDate) params.append('date', selectedDate);
      if (selectedUserId && selectedUserId !== 'all') params.append('userId', selectedUserId);
      if (selectedStatus && selectedStatus !== 'all') params.append('status', selectedStatus);
      params.append('limit', limit.toString());
      params.append('offset', ((currentPage - 1) * limit).toString());

      const response = await fetch(`/api/qa/reports?${params}`);
      const data = await response.json();
      setReports(data.reports || []);
      setTotalReports(data.total || 0);
    } catch (error) {
      // Silently fail - reports list will be empty
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, selectedUserId, selectedStatus, currentPage, limit]);

  const handleApplyFilters = async () => {
    setIsFilterLoading(true);
    setCurrentPage(1); // Reset to first page on filter apply
    try {
      const params = new URLSearchParams();
      if (selectedDate) params.append('date', selectedDate);
      if (selectedUserId && selectedUserId !== 'all') params.append('userId', selectedUserId);
      if (selectedStatus && selectedStatus !== 'all') params.append('status', selectedStatus);
      params.append('limit', limit.toString());
      params.append('offset', '0');

      const response = await fetch(`/api/qa/reports?${params}`);
      const data = await response.json();
      setReports(data.reports || []);
      setTotalReports(data.total || 0);
    } catch (error) {
      // Silently fail - reports list will be empty
    } finally {
      setIsFilterLoading(false);
    }
  };

  useEffect(() => {
    if (userLoading) return;
    if (!mounted) return;

    if (!user) {
      router.push('/dashboard');
      return;
    }

    if (isAdmin({ user }) || isTeamLead({ user })) {
      fetchMembers();
    }
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
      cell: ({ row }) => {
        const score = row.original.score;
        return (
          <span className={score < 90 ? 'text-destructive font-medium' : 'text-foreground'}>
            {score === 100 ? 'No deductions' : `-${100 - score}`}
          </span>
        );
      },
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
    'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all';

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
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isManager = user && (isAdmin({ user }) || isTeamLead({ user }));

  return (
    <div className="space-y-8">
      <PageHeader
        badge={isManager ? "QA Review" : "My Feedback"}
        title={isManager ? "Review submitted reports" : "Quality and feedback history"}
        subtitle={isManager 
          ? "Review and score team member reports to ensure quality and provide feedback." 
          : "View your performance scores and review feedback from your team leads."
        }
      />

      {isManager && (
        <GlassCard variant="panel" padding="md">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Date Picker */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Date</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-10 rounded-xl bg-white/5 border-white/10 text-foreground"
              />
            </div>

            {/* Member Dropdown */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Member</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="w-full h-10 rounded-xl bg-white/5 border-white/10 text-foreground">
                  <SelectValue placeholder="All Members" />
                </SelectTrigger>
                <SelectContent className="border border-white/10">
                  <SelectItem value="all">All Members</SelectItem>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full h-10 rounded-xl bg-white/5 border-white/10 text-foreground">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="border border-white/10">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="SUBMITTED">Submitted</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Apply Button */}
            <div className="flex items-end">
              <Button onClick={handleApplyFilters} disabled={isFilterLoading} className="w-full rounded-xl">
                {isFilterLoading ? (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                ) : (
                  <Filter size={16} className="mr-2" />
                )}
                {isFilterLoading ? 'Applying...' : 'Apply Filters'}
              </Button>
            </div>
          </div>

          {/* Saved Views Preset Bar */}
          {savedFilters.length > 0 && (
            <div className="mt-4 border-t border-white/10 pt-4">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2 select-none">Saved Views</span>
              <div className="flex flex-wrap gap-2">
                {savedFilters.map((preset) => (
                  <div
                    key={preset.id}
                    onClick={() => handleApplyPreset(preset)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary-foreground cursor-pointer transition-all"
                  >
                    <span>{preset.name}</span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteFilter(preset.id, e)}
                      className="text-muted-foreground hover:text-red-400 font-bold transition-colors ml-1"
                      title="Delete View"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save Current View Form */}
          <div className="mt-4 flex gap-2 items-center justify-end border-t border-white/10 pt-4">
            <Input
              type="text"
              placeholder="Name current filter view..."
              value={newFilterName}
              onChange={(e) => setNewFilterName(e.target.value)}
              className="h-8 text-xs max-w-[200px] rounded-lg"
            />
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={handleSaveFilter}
              disabled={!newFilterName.trim()}
              className="text-xs h-8 px-3 rounded-lg border-white/20 hover:bg-white/5"
            >
              Save Preset
            </Button>
          </div>
        </GlassCard>
      )}

      {/* Reports Table */}
      <GlassCard variant="panel" padding="none" className="overflow-hidden">
        <div className="border-b border-white/10 px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">
            {isManager ? "Submitted Reports" : "My Recent Reports"}
          </h2>
        </div>
        {reports.length === 0 ? (
          <div className="p-12 text-center">
            <div className="rounded-2xl border border-dashed border-slate-300/50 p-8 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.8),inset_0_-1px_0_rgba(0,0,0,0.05),0_8px_32px_rgba(0,0,0,0.05)] dark:border-slate-700/50 dark:bg-slate-800/50 dark:backdrop-blur-sm dark:shadow-none">
              <p className="text-muted-foreground">No reports found.</p>
            </div>
          </div>
        ) : (
          <div className="p-4 md:p-6">
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  {table.getHeaderGroups().map((headerGroup) => (
                    headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-6 py-4 font-bold uppercase tracking-widest text-[10px] text-muted-foreground"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-6 py-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            {/* Pagination Controls */}
            {totalReports > limit && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, totalReports)} of {totalReports} reports
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="rounded-xl"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => p + 1)}
                    disabled={currentPage * limit >= totalReports}
                    className="rounded-xl"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

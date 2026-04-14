'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Eye, Loader2, Filter } from 'lucide-react';
import {
  useReactTable,
  getCoreRowModel,
  ColumnDef,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import Badge from '@/components/shared/Badge';
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
  // Prevent SSR completely
  if (typeof window === 'undefined') {
    return null;
  }

  const router = useRouter();
  const { user, isLoading: userLoading } = useCurrentUser();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('SUBMITTED');
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (userLoading) return;
    if (!mounted) return;

    if (!user || (!isAdmin({ user }) && !isTeamLead({ user }))) {
      router.push('/dashboard');
      return;
    }

    fetchMembers();
    fetchReports();
  }, [user, userLoading, router, selectedDate, selectedUserId, selectedStatus, mounted]);

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      setMembers(data.users || []);
    } catch (error) {
      console.error('Failed to fetch members:', error);
    }
  };

  const fetchReports = async () => {
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
  };

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">QA Review</h1>
        <p className="text-muted-foreground mt-1">Review and score submitted reports</p>
      </div>

      {/* Filter Bar */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Date Picker */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            />
          </div>

          {/* Member Dropdown */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Member</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
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
              className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            >
              <option value="SUBMITTED">Submitted</option>
              <option value="DRAFT">Draft</option>
              <option value="all">All</option>
            </select>
          </div>

          {/* Apply Button */}
          <div className="flex items-end">
            <Button onClick={fetchReports} className="w-full">
              <Filter size={16} className="mr-2" />
              Apply Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {reports.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">No reports found matching your filters.</p>
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
    </div>
  );
}

function flexRender(...args: any[]) {
  return args[0] instanceof Function ? args[0](...args.slice(1)) : args[0];
}

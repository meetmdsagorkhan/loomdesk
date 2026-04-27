'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format, differenceInDays } from 'date-fns';
import { Check, X, Loader2, Calendar, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Badge from '@/components/shared/Badge';
import ConfirmModal from '@/components/shared/ConfirmModal';
import PageHeader from '@/components/shared/PageHeader';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { isAdmin } from '@/lib/auth-utils';
import { showToast } from '@/components/shared/Toast';
import { handleApiError } from '@/lib/error-handler';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type LeaveRequest = {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
};

export default function LeaveAdminPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useCurrentUser();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('PENDING');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [actionLeaveId, setActionLeaveId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        handleApiError('Failed to fetch members', 'Leave Admin');
        return;
      }
      const data = await response.json();
      // Filter out ADMIN users from the member list
      setMembers((data.users || []).filter((u: { role: string }) => u.role !== 'ADMIN'));
    } catch (error) {
      handleApiError(error, 'Leave Admin');
    }
  };

  const fetchLeaveRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedUserId) params.append('userId', selectedUserId);

      const response = await fetch(`/api/leave?${params}`);
      if (!response.ok) {
        handleApiError('Failed to fetch leave requests', 'Leave Admin');
        return;
      }
      const data = await response.json();
      setLeaveRequests(data.leaveRequests || []);
    } catch (error) {
      handleApiError(error, 'Leave Admin');
    } finally {
      setIsLoading(false);
    }
  }, [selectedStatus, selectedUserId]);

  useEffect(() => {
    if (userLoading) return;
    if (!mounted) return;

    if (!user || !isAdmin({ user })) {
      router.push('/dashboard');
      return;
    }

    fetchMembers();
    fetchLeaveRequests();
  }, [user, userLoading, router, fetchLeaveRequests, mounted]);

  const handleAction = async () => {
    if (!actionLeaveId || !actionType) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/leave/${actionLeaveId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: actionType === 'approve' ? 'APPROVED' : 'REJECTED',
        }),
      });

      if (!response.ok) {
        handleApiError('Failed to update leave request', 'Leave Admin');
        return;
      }

      await fetchLeaveRequests();
      setActionLeaveId(null);
      setActionType(null);
      showToast(
        actionType === 'approve' ? 'Leave request approved' : 'Leave request rejected',
        'success'
      );
    } catch (error) {
      handleApiError(error, 'Leave Admin');
    } finally {
      setIsProcessing(false);
    }
  };

  const getDaysCount = (start: string, end: string) => {
    return differenceInDays(new Date(end), new Date(start)) + 1;
  };

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

  const pendingRequests = leaveRequests.filter((r) => r.status === 'PENDING');

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Leave Management"
        title="Review and manage leave requests"
        subtitle="Approve or reject pending requests, filter by status or member, and track team leave from one place."
      />

      {/* Filter Bar */}
      <section className="glass-card rounded-3xl p-4 card-elevation-md md:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Status</label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="form-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Member Filter */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Member</label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="form-input">
                <SelectValue placeholder="All Members" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Members</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Apply Button */}
          <div className="flex items-end">
            <Button onClick={fetchLeaveRequests} className="w-full rounded-xl">
              <Filter size={16} className="mr-2" />
              Apply Filters
            </Button>
          </div>
        </div>
      </section>

      {/* Pending Requests Section */}
      {selectedStatus === 'PENDING' && pendingRequests.length > 0 && (
        <section className="glass-card rounded-3xl overflow-hidden card-elevation-md">
          <div className="border-b border-border/60 bg-warning/5 p-4 md:p-6">
            <h2 className="text-lg font-semibold text-foreground">
              Pending Requests ({pendingRequests.length})
            </h2>
          </div>
          <div className="divide-y divide-border/40">
            {pendingRequests.map((leave) => (
              <div key={leave.id} className="p-4 md:p-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                      <h3 className="font-medium text-foreground">{leave.user.name}</h3>
                      <span className="text-sm text-muted-foreground">{leave.user.email}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
                      <div>
                        <span className="text-muted-foreground">Dates:</span>{' '}
                        <span className="text-foreground">
                          {format(new Date(leave.startDate), 'MMM d')} -{' '}
                          {format(new Date(leave.endDate), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Duration:</span>{' '}
                        <span className="text-foreground">{getDaysCount(leave.startDate, leave.endDate)} days</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Applied:</span>{' '}
                        <span className="text-foreground">
                          {format(new Date(leave.createdAt), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="text-sm text-muted-foreground">Reason: </span>
                      <span className="text-sm text-foreground break-words">{leave.reason}</span>
                    </div>
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full rounded-xl border-destructive text-destructive hover:bg-destructive/10 sm:w-auto"
                      disabled={isProcessing}
                      onClick={() => {
                        setActionLeaveId(leave.id);
                        setActionType('reject');
                      }}
                    >
                      <X size={16} className="mr-2" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      className="w-full rounded-xl bg-success text-success-foreground hover:bg-success/90 sm:w-auto"
                      disabled={isProcessing}
                      onClick={() => {
                        setActionLeaveId(leave.id);
                        setActionType('approve');
                      }}
                    >
                      <Check size={16} className="mr-2" />
                      Approve
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* All Requests Table */}
      <section className="glass-card rounded-3xl overflow-hidden card-elevation-md">
        <div className="border-b border-border/60 p-4 md:p-6">
          <h2 className="text-lg font-semibold text-foreground">
            All Requests ({leaveRequests.length})
          </h2>
        </div>
        {leaveRequests.length === 0 ? (
          <div className="p-12 text-center">
            <div className="rounded-2xl border border-dashed border-slate-300/50 p-8 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.8),inset_0_-1px_0_rgba(0,0,0,0.05),0_8px_32px_rgba(0,0,0,0.05)] dark:border-slate-700/50 dark:bg-slate-800/50 dark:backdrop-blur-sm dark:shadow-none">
              <Calendar size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No leave requests found</p>
            </div>
          </div>
        ) : (
          <div className="p-4 md:p-6">
            <div className="hidden lg:block">
              <div className="overflow-x-auto rounded-2xl border border-border/40 bg-background/30 backdrop-blur-sm">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/60 backdrop-blur-sm">
                      <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Member</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Start Date</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">End Date</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Days</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Reason</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Applied On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveRequests.map((leave) => (
                      <tr key={leave.id} className="border-b border-border/40 last:border-0 hover:bg-muted/30 backdrop-blur-sm">
                        <td className="px-6 py-4 text-sm text-foreground">{leave.user.name}</td>
                        <td className="px-6 py-4 text-sm text-foreground">
                          {format(new Date(leave.startDate), 'MMM d, yyyy')}
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground">
                          {format(new Date(leave.endDate), 'MMM d, yyyy')}
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground">
                          {getDaysCount(leave.startDate, leave.endDate)}
                        </td>
                        <td className="max-w-xs truncate px-6 py-4 text-sm text-muted-foreground">
                          {leave.reason}
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant={
                              leave.status === 'APPROVED'
                                ? 'success'
                                : leave.status === 'REJECTED'
                                ? 'danger'
                                : 'warning'
                            }
                            label={leave.status}
                          />
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {format(new Date(leave.createdAt), 'MMM d, yyyy')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-3 lg:hidden">
              {leaveRequests.map((leave) => (
                <div
                  key={leave.id}
                  className="rounded-2xl border border-border/40 bg-background/35 p-4 backdrop-blur-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{leave.user.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{leave.user.email}</p>
                    </div>
                    <Badge
                      variant={
                        leave.status === 'APPROVED'
                          ? 'success'
                          : leave.status === 'REJECTED'
                          ? 'danger'
                          : 'warning'
                      }
                      label={leave.status}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Dates
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        {format(new Date(leave.startDate), 'MMM d')} - {format(new Date(leave.endDate), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Duration
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        {getDaysCount(leave.startDate, leave.endDate)} days
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Reason
                      </p>
                      <p className="mt-1 text-sm text-foreground break-words">{leave.reason}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Applied
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        {format(new Date(leave.createdAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={!!actionLeaveId && !!actionType}
        onCancel={() => {
          setActionLeaveId(null);
          setActionType(null);
        }}
        onConfirm={handleAction}
        title={actionType === 'approve' ? 'Approve Leave Request' : 'Reject Leave Request'}
        description={`Are you sure you want to ${actionType} this leave request? This action cannot be undone.`}
        confirmLabel={actionType === 'approve' ? 'Approve' : 'Reject'}
        variant={actionType === 'approve' ? 'default' : 'danger'}
      />
    </div>
  );
}

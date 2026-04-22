'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format, differenceInDays } from 'date-fns';
import { Check, X, Loader2, Calendar, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import Badge from '@/components/shared/Badge';
import ConfirmModal from '@/components/shared/ConfirmModal';
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
      setMembers(data.users || []);
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
      {/* Header */}
      <section className="glass-card rounded-3xl p-6 card-elevation-md">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
            Leave Management
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            Review and manage leave requests
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Approve or reject pending requests, filter by status or member, and track team leave from one place.
          </p>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="glass-card rounded-3xl p-6 card-elevation-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Status</label>
            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="form-input"
            >
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="all">All</option>
            </Select>
          </div>

          {/* Member Filter */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Member</label>
            <Select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="form-input"
            >
              <option value="">All Members</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
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
          <div className="border-b border-border/60 p-6 bg-warning/5">
            <h2 className="text-lg font-semibold text-foreground">
              Pending Requests ({pendingRequests.length})
            </h2>
          </div>
          <div className="divide-y divide-border/40">
            {pendingRequests.map((leave) => (
              <div key={leave.id} className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-foreground">{leave.user.name}</h3>
                      <span className="text-sm text-muted-foreground">{leave.user.email}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
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
                      <span className="text-sm text-foreground">{leave.reason}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive hover:bg-destructive/10 rounded-xl"
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
                      className="bg-success text-success-foreground hover:bg-success/90 rounded-xl"
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
        <div className="border-b border-border/60 p-6">
          <h2 className="text-lg font-semibold text-foreground">
            All Requests ({leaveRequests.length})
          </h2>
        </div>
        {leaveRequests.length === 0 ? (
          <div className="p-12 text-center">
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8">
              <Calendar size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No leave requests found</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto p-6">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60">
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
                  <tr key={leave.id} className="border-b border-border/40 last:border-0 hover:bg-muted/30">
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
                    <td className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate">
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

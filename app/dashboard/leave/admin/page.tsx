'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format, differenceInDays } from 'date-fns';
import { Check, X, Loader2, Calendar, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Badge from '@/components/shared/Badge';
import ConfirmModal from '@/components/shared/ConfirmModal';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { isAdmin } from '@/lib/auth-utils';

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
      const data = await response.json();
      setMembers(data.users || []);
    } catch (error) {
      console.error('Failed to fetch members:', error);
    }
  };

  const fetchLeaveRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedUserId) params.append('userId', selectedUserId);

      const response = await fetch(`/api/leave?${params}`);
      const data = await response.json();
      setLeaveRequests(data.leaveRequests || []);
    } catch (error) {
      console.error('Failed to fetch leave requests:', error);
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
        alert('Failed to update leave request');
        return;
      }

      await fetchLeaveRequests();
      setActionLeaveId(null);
      setActionType(null);
    } catch (error) {
      console.error('Failed to update leave request:', error);
      alert('Failed to update leave request');
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Leave Management (Admin)</h1>
        <p className="text-muted-foreground mt-1">Review and manage leave requests</p>
      </div>

      {/* Filter Bar */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            >
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="all">All</option>
            </select>
          </div>

          {/* Member Filter */}
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

          {/* Apply Button */}
          <div className="flex items-end">
            <Button onClick={fetchLeaveRequests} className="w-full">
              <Filter size={16} className="mr-2" />
              Apply Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Pending Requests Section */}
      {selectedStatus === 'PENDING' && pendingRequests.length > 0 && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="p-6 border-b border-border bg-amber-50/50">
            <h2 className="text-lg font-medium text-foreground">
              Pending Requests ({pendingRequests.length})
            </h2>
          </div>
          <div className="divide-y divide-border">
            {pendingRequests.map((leave) => (
              <div key={leave.id} className="p-6">
                <div className="flex items-start justify-between">
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
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive hover:bg-destructive/10"
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
                      className="bg-success text-success-foreground hover:bg-success/90"
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
        </div>
      )}

      {/* All Requests Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-medium text-foreground">
            All Requests ({leaveRequests.length})
          </h2>
        </div>
        {leaveRequests.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No leave requests found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
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
                  <tr key={leave.id} className="border-b border-border last:border-0">
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
      </div>

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

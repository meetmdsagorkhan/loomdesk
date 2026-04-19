'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Badge from '@/components/shared/Badge';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type LeaveRequest = {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
};

export default function LeavePage() {
  const { user, isLoading: userLoading } = useCurrentUser();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newLeave, setNewLeave] = useState({
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (userLoading) return;
    if (!mounted) return;

    if (!user) {
      return;
    }

    fetchLeaveRequests();
  }, [user, userLoading, mounted]);

  const fetchLeaveRequests = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/leave');
      const data = await response.json();
      setLeaveRequests(data.leaveRequests || []);
    } catch (error) {
      console.error('Failed to fetch leave requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLeave),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Failed to submit leave request');
        return;
      }

      await fetchLeaveRequests();
      setNewLeave({ startDate: '', endDate: '', reason: '' });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to submit leave request:', error);
      alert('Failed to submit leave request');
    } finally {
      setIsSubmitting(false);
    }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Leave Management</h1>
          <p className="text-muted-foreground mt-1">View and manage your leave requests</p>
        </div>
        {!showCreateForm && (
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus size={16} className="mr-2" />
            New Request
          </Button>
        )}
      </div>

      {/* Create Leave Form */}
      {showCreateForm && (
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="text-lg font-medium text-foreground mb-4">Submit Leave Request</h2>
          <form onSubmit={handleSubmitLeave} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Start Date</label>
              <input
                type="date"
                value={newLeave.startDate}
                onChange={(e) => setNewLeave({ ...newLeave, startDate: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">End Date</label>
              <input
                type="date"
                value={newLeave.endDate}
                onChange={(e) => setNewLeave({ ...newLeave, endDate: e.target.value })}
                min={newLeave.startDate}
                className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Reason</label>
              <textarea
                value={newLeave.reason}
                onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                placeholder="Provide reason for leave"
                className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all min-h-[100px]"
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewLeave({ startDate: '', endDate: '', reason: '' });
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Leave Requests Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-medium text-foreground">My Leave Requests</h2>
        </div>
        {leaveRequests.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">No leave requests found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Start Date</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">End Date</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Reason</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Applied On</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.map((leave) => (
                  <tr key={leave.id} className="border-b border-border last:border-0">
                    <td className="px-6 py-4 text-sm text-foreground">
                      {format(new Date(leave.startDate), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {format(new Date(leave.endDate), 'MMM d, yyyy')}
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
    </div>
  );
}

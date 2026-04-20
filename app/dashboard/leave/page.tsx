'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Badge from '@/components/shared/Badge';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { CardContent } from '@/components/ui/card';

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

      {/* Calendar View */}
      {!showCreateForm && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="bg-card rounded-2xl p-6 shadow-lg">
            <h2 className="text-lg font-medium text-foreground mb-4">Leave Calendar</h2>
            <Calendar
              mode="single"
              selected={newLeave.startDate ? new Date(newLeave.startDate) : undefined}
              onSelect={(date) => {
                if (date) {
                  setNewLeave({ ...newLeave, startDate: date.toISOString().split('T')[0] });
                  setShowCreateForm(true);
                }
              }}
              className="rounded-md border-0"
              modifiers={{
                booked: leaveRequests
                  .filter((leave) => leave.status === 'APPROVED')
                  .flatMap((leave) => {
                    const dates = [];
                    const start = new Date(leave.startDate);
                    const end = new Date(leave.endDate);
                    const current = new Date(start);
                    while (current <= end) {
                      dates.push(new Date(current));
                      current.setDate(current.getDate() + 1);
                    }
                    return dates;
                  }),
              }}
              modifiersStyles={{
                booked: {
                  backgroundColor: 'rgb(59 130 246 / 0.2)',
                  color: 'rgb(37 99 235)',
                  fontWeight: 'bold',
                },
              }}
            />
          </div>

          <div className="bg-card rounded-2xl p-6 shadow-lg">
            <h2 className="text-lg font-medium text-foreground mb-4">Upcoming Leave</h2>
            <div className="space-y-3">
              {leaveRequests
                .filter((leave) => leave.status === 'APPROVED' && new Date(leave.startDate) >= new Date())
                .slice(0, 5)
                .map((leave) => (
                  <div key={leave.id} className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 shadow-sm">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                      <Plus size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{leave.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(leave.startDate), 'MMM d')} - {format(new Date(leave.endDate), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                ))}
              {leaveRequests.filter((leave) => leave.status === 'APPROVED' && new Date(leave.startDate) >= new Date()).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No upcoming leave</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Leave Form */}
      {showCreateForm && (
        <div className="bg-card rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-medium text-foreground mb-4">Submit Leave Request</h2>
          <form onSubmit={handleSubmitLeave} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Start Date</label>
              <input
                type="date"
                value={newLeave.startDate}
                onChange={(e) => setNewLeave({ ...newLeave, startDate: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
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
                className="w-full px-4 py-2.5 rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Reason</label>
              <textarea
                value={newLeave.reason}
                onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                placeholder="Provide reason for leave"
                className="w-full px-4 py-2.5 rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all min-h-[100px]"
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
      <div className="bg-card rounded-2xl overflow-hidden shadow-lg">
        <div className="p-6 shadow-sm">
          <h2 className="text-lg font-medium text-foreground">My Leave Requests</h2>
        </div>
        {leaveRequests.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">No leave requests found</p>
          </div>
        ) : (
          <div className="overflow-x-auto px-6 pb-6">
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

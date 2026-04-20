'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Plus, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Badge from '@/components/shared/Badge';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Calendar } from '@/components/ui/calendar';
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
      if (!response.ok) {
        handleApiError('Failed to fetch leave requests', 'Leave Requests');
        return;
      }
      const data = await response.json();
      setLeaveRequests(data.leaveRequests || []);
    } catch (error) {
      handleApiError(error, 'Leave Requests');
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
        handleApiError(data.error || 'Failed to submit leave request', 'Leave Request');
        return;
      }

      await fetchLeaveRequests();
      setNewLeave({ startDate: '', endDate: '', reason: '' });
      setShowCreateForm(false);
      showToast('Leave request submitted', 'success');
    } catch (error) {
      handleApiError(error, 'Leave Request');
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
    <div className="space-y-8">
      {/* Header */}
      <section className="rounded-3xl border border-border/60 bg-card/80 p-6 card-elevation-md backdrop-blur-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
              Leave Management
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              View and manage your leave requests
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Submit new requests, track approval status, and view your leave history from one place.
            </p>
          </div>
          {!showCreateForm && (
            <Button onClick={() => setShowCreateForm(true)} className="rounded-xl">
              <Plus size={16} className="mr-2" />
              New Request
            </Button>
          )}
        </div>
      </section>

      {/* Calendar View */}
      {!showCreateForm && (
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="rounded-3xl border border-border/60 bg-card/80 p-6 card-elevation-md backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-foreground mb-4">Leave Calendar</h2>
            <Calendar
              mode="single"
              selected={newLeave.startDate ? new Date(newLeave.startDate) : undefined}
              onSelect={(date) => {
                if (date) {
                  setNewLeave({ ...newLeave, startDate: date.toISOString().split('T')[0] });
                  setShowCreateForm(true);
                }
              }}
              className="rounded-2xl border-0"
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
                  backgroundColor: 'hsl(var(--primary) / 0.15)',
                  color: 'hsl(var(--primary))',
                  fontWeight: 'bold',
                },
              }}
            />
          </div>

          <div className="rounded-3xl border border-border/60 bg-card/80 p-6 card-elevation-md backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-foreground mb-4">Upcoming Leave</h2>
            <div className="space-y-3">
              {leaveRequests
                .filter((leave) => leave.status === 'APPROVED' && new Date(leave.startDate) >= new Date())
                .slice(0, 5)
                .map((leave) => (
                  <div key={leave.id} className="flex items-start gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/10">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <CalendarIcon size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{leave.reason}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {format(new Date(leave.startDate), 'MMM d')} - {format(new Date(leave.endDate), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                ))}
              {leaveRequests.filter((leave) => leave.status === 'APPROVED' && new Date(leave.startDate) >= new Date()).length === 0 && (
                <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center">
                  <p className="text-sm text-muted-foreground">No upcoming leave</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Create Leave Form */}
      {showCreateForm && (
        <section className="rounded-3xl border border-border/60 bg-card/80 p-6 card-elevation-md backdrop-blur-sm">
          <h2 className="text-lg font-semibold text-foreground mb-6">Submit Leave Request</h2>
          <form onSubmit={handleSubmitLeave} className="space-y-6 max-w-md">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Start Date</label>
              <input
                type="date"
                value={newLeave.startDate}
                onChange={(e) => setNewLeave({ ...newLeave, startDate: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
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
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Reason</label>
              <textarea
                value={newLeave.reason}
                onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                placeholder="Provide reason for leave"
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all min-h-[100px] resize-none"
                required
              />
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={isSubmitting} className="rounded-xl">
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
                className="rounded-xl"
              >
                Cancel
              </Button>
            </div>
          </form>
        </section>
      )}

      {/* Leave Requests Table */}
      <section className="rounded-3xl border border-border/60 bg-card/80 overflow-hidden card-elevation-md backdrop-blur-sm">
        <div className="border-b border-border/60 p-6">
          <h2 className="text-lg font-semibold text-foreground">My Leave Requests</h2>
        </div>
        {leaveRequests.length === 0 ? (
          <div className="p-12 text-center">
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8">
              <p className="text-sm text-muted-foreground">No leave requests found</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto p-6">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Start Date</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">End Date</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Reason</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Applied On</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.map((leave) => (
                  <tr key={leave.id} className="border-b border-border/40 last:border-0 hover:bg-muted/30">
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
      </section>
    </div>
  );
}

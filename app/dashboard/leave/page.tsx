'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Plus, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Badge from '@/components/shared/Badge';
import PageHeader from '@/components/shared/PageHeader';
import GlassCard from '@/components/shared/GlassCard';
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

  const inputClassName =
    'w-full rounded-xl border border-white/20 bg-background/70 px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all';

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Leave Management"
        title="View and manage your leave requests"
        subtitle="Submit new requests, track approval status, and view your leave history from one place."
        actions={
          !showCreateForm && (
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus size={16} className="mr-2" />
              New Request
            </Button>
          )
        }
      />

      {/* Calendar View */}
      {!showCreateForm && (
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <GlassCard variant="panel" padding="md">
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
          </GlassCard>

          <GlassCard variant="panel" padding="md">
            <h2 className="text-lg font-semibold text-foreground mb-4">Upcoming Leave</h2>
            <div className="space-y-3">
              {leaveRequests
                .filter((leave) => leave.status === 'APPROVED' && new Date(leave.startDate) >= new Date())
                .slice(0, 5)
                .map((leave) => (
                  <div key={leave.id} className="flex items-start gap-3 rounded-2xl border border-white/20 bg-white/25 p-4 dark:bg-slate-900/30">
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
                <div className="rounded-2xl border border-dashed border-white/25 bg-white/20 p-8 text-center">
                  <p className="text-sm text-muted-foreground">No upcoming leave</p>
                </div>
              )}
            </div>
          </GlassCard>
        </section>
      )}

      {/* Create Leave Form */}
      {showCreateForm && (
        <GlassCard variant="panel" padding="none" className="overflow-hidden">
          <div className="border-b border-white/15 px-5 py-4 md:px-6">
            <h2 className="text-lg font-semibold text-foreground">Submit Leave Request</h2>
          </div>
          <form onSubmit={handleSubmitLeave} className="max-w-md space-y-6 p-5 md:p-6">
            <div>
              <Label className="block text-sm font-medium text-foreground mb-2">Start Date</Label>
              <Input
                type="date"
                value={newLeave.startDate}
                onChange={(e) => setNewLeave({ ...newLeave, startDate: e.target.value })}
                className={inputClassName}
                required
              />
            </div>
            <div>
              <Label className="block text-sm font-medium text-foreground mb-2">End Date</Label>
              <Input
                type="date"
                value={newLeave.endDate}
                onChange={(e) => setNewLeave({ ...newLeave, endDate: e.target.value })}
                min={newLeave.startDate}
                className={inputClassName}
                required
              />
            </div>
            <div>
              <Label className="block text-sm font-medium text-foreground mb-2">Reason</Label>
              <textarea
                value={newLeave.reason}
                onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                placeholder="Provide reason for leave"
                className={`${inputClassName} min-h-[100px] resize-none`}
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
        </GlassCard>
      )}

      {/* Leave Requests Table */}
      <GlassCard variant="panel" padding="none" className="overflow-hidden">
        <div className="border-b border-white/15 px-5 py-4 md:px-6">
          <h2 className="text-lg font-semibold text-foreground">My Leave Requests</h2>
        </div>
        {leaveRequests.length === 0 ? (
          <div className="p-12 text-center">
            <div className="rounded-2xl border border-dashed border-white/25 bg-white/20 p-8">
              <p className="text-sm text-muted-foreground">No leave requests found</p>
            </div>
          </div>
        ) : (
          <div className="p-4 md:p-6">
            <div className="overflow-x-auto rounded-2xl border border-white/20 bg-white/25 shadow-[0_16px_48px_rgba(76,92,148,0.16)] dark:bg-slate-900/30">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/20 bg-white/35 dark:bg-white/5">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Start Date</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">End Date</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Reason</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Applied On</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.map((leave) => (
                  <tr key={leave.id} className="border-b border-white/15 last:border-0 hover:bg-white/35 dark:hover:bg-white/5">
                    <td className="px-5 py-3.5 text-sm text-foreground">
                      {format(new Date(leave.startDate), 'MMM d, yyyy')}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-foreground">
                      {format(new Date(leave.endDate), 'MMM d, yyyy')}
                    </td>
                    <td className="max-w-xs truncate px-5 py-3.5 text-sm text-muted-foreground">
                      {leave.reason}
                    </td>
                    <td className="px-5 py-3.5">
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
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">
                      {format(new Date(leave.createdAt), 'MMM d, yyyy')}
                    </td>
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

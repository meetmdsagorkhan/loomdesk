'use client';

import { useState, useEffect, useCallback, type ComponentProps } from 'react';
import { useRouter } from 'next/navigation';
import { format, differenceInDays } from 'date-fns';
import { Plus, Loader2, Calendar as CalendarIcon, Check, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Badge from '@/components/shared/Badge';
import PageHeader from '@/components/shared/PageHeader';
import GlassCard from '@/components/shared/GlassCard';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Calendar } from '@/components/ui/calendar';
import { CalendarDayButton } from '@/components/ui/calendar';
import { showToast } from '@/components/shared/Toast';
import { handleApiError } from '@/lib/error-handler';
import { cn } from '@/lib/utils';

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

type Holiday = {
  date: string;
  name: string;
  description?: string;
};

type GoogleCalendarEvent = {
  start?: {
    date?: string;
    dateTime?: string;
  };
  end?: {
    date?: string;
    dateTime?: string;
  };
  summary?: string;
  description?: string;
};

export default function LeavePage() {
  const router = useRouter();
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
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [fetchedYears, setFetchedYears] = useState<number[]>([]);
  const [calendarMonths, setCalendarMonths] = useState(1);

  // Custom DayButton to show holiday name on hover
  const HolidayAwareDayButton = ({
    className,
    day,
    modifiers,
    locale,
    ...props
  }: ComponentProps<typeof CalendarDayButton>) => {
    const dayDateStr = day?.date ? format(day.date, 'yyyy-MM-dd') : null;
    const matchedHoliday = dayDateStr ? holidays.find((h: Holiday) => h.date === dayDateStr) : undefined;
    const holidayName = matchedHoliday?.name;
    const isHoliday = modifiers.holiday || !!matchedHoliday;

    return (
      <CalendarDayButton
        className={className}
        day={day}
        modifiers={{ ...modifiers, holiday: isHoliday }}
        locale={locale}
        title={holidayName}
        {...props}
      />
    );
  };

  const fetchHolidays = useCallback(async (year: number) => {
    // If we've already fetched holidays for this year, skip it.
    if (fetchedYears.includes(year)) return;

    // Add year to state immediately to prevent duplicate concurrent calls
    setFetchedYears((prev) => [...prev, year]);

    try {
      const response = await fetch(`/api/holidays?year=${year}`);
      if (!response.ok) {
        return;
      }

      const data = await response.json();
      setHolidays((prev) => [...prev, ...(data.holidays || [])]);
    } catch (error) {
      // Silently fail - holidays are optional
    }
  }, [fetchedYears]);

  useEffect(() => {
    setMounted(true);
    const currentYear = new Date().getFullYear();
    fetchHolidays(currentYear);
  }, [fetchHolidays]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(min-width: 1280px)');
    const updateCalendarMonths = () => {
      setCalendarMonths(mediaQuery.matches ? 2 : 1);
    };

    updateCalendarMonths();
    mediaQuery.addEventListener('change', updateCalendarMonths);

    return () => {
      mediaQuery.removeEventListener('change', updateCalendarMonths);
    };
  }, []);

  useEffect(() => {
    if (userLoading) return;
    if (!mounted) return;

    if (!user) {
      return;
    }

    if (user.role === 'ADMIN' || user.role === 'TEAM_LEAD') {
      router.push('/dashboard/leave/admin');
      return;
    }

    fetchLeaveRequests();
  }, [user, userLoading, mounted, router]);

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
    'w-full rounded-xl border border-slate-300/50 bg-gradient-to-br from-white/90 via-white/70 to-white/90 px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 backdrop-blur-md transition-all dark:border-slate-600/50 dark:from-slate-800/90 dark:via-slate-900/70 dark:to-slate-800/90';
  const upcomingApprovedLeaves = leaveRequests
    .filter((leave) => leave.status === 'APPROVED' && new Date(leave.startDate) >= new Date())
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Leave Management"
        title="View and manage your leave requests"
        subtitle="Submit new requests, track approval status, and view your leave history from one place."
        actions={
          !showCreateForm && (
            <Button onClick={() => setShowCreateForm(true)} className="w-full sm:w-auto">
              <Plus size={16} className="mr-2" />
              New Request
            </Button>
          )
        }
      />

      {/* Calendar View */}
      {!showCreateForm && (
        <section className="grid gap-4 md:gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
          <GlassCard variant="panel" padding="md" className="overflow-hidden">
            <h2 className="text-lg font-semibold text-foreground mb-4">Leave Calendar</h2>
            <Calendar
              mode="single"
              selected={newLeave.startDate ? new Date(newLeave.startDate) : undefined}
              components={{
                DayButton: HolidayAwareDayButton,
              }}
              onMonthChange={(newMonth) => {
                if (newMonth) {
                  fetchHolidays(newMonth.getFullYear());
                }
              }}
              onSelect={(date) => {
                if (date) {
                  const formatDate = (d: Date) => {
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                  };
                  const dateStr = formatDate(date);
                  if (!newLeave.startDate) {
                    setNewLeave({ ...newLeave, startDate: dateStr });
                  } else if (!newLeave.endDate && new Date(dateStr) >= new Date(newLeave.startDate)) {
                    setNewLeave({ ...newLeave, endDate: dateStr });
                    setShowCreateForm(true);
                  } else {
                    setNewLeave({ ...newLeave, startDate: dateStr, endDate: '' });
                  }
                }
              }}
              className="w-full rounded-2xl border-0 [--cell-size:1.8rem] sm:[--cell-size:2rem] md:[--cell-size:2.15rem] lg:[--cell-size:2.5rem]"
              numberOfMonths={calendarMonths}
              classNames={{
                root: 'w-full',
                months: cn(
                  'w-full !flex !flex-row !gap-6 !items-start !justify-start'
                ),
                month: 'min-w-0 flex-shrink-0',
                table: 'w-full table-fixed border-collapse',
                day: "h-full w-full aspect-square p-0 hover:bg-primary/10 transition-colors",
                day_button: "h-full w-full aspect-square hover:bg-primary/10",
              }}
              modifiers={{
                selected: newLeave.startDate ? new Date(newLeave.startDate) : undefined,
                end: newLeave.endDate ? new Date(newLeave.endDate) : undefined,
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
                  holiday: holidays.map((holiday) => {
                    const [year, month, day] = holiday.date.split('-').map(Number);
                    return new Date(year, month - 1, day);
                  }),
              }}
              modifiersStyles={{
                selected: {
                  backgroundColor: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground))',
                  fontWeight: 'bold',
                  borderRadius: '50%',
                },
                end: {
                  backgroundColor: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground))',
                  fontWeight: 'bold',
                  borderRadius: '50%',
                },
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
              {upcomingApprovedLeaves.map((leave) => (
                <div key={leave.id} className="flex items-start gap-3 rounded-2xl border border-white/20 bg-white/25 p-4 dark:bg-slate-900/30 backdrop-blur-sm">
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
              {upcomingApprovedLeaves.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300/50 p-8 text-center backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.8),inset_0_-1px_0_rgba(0,0,0,0.05),0_8px_32px_rgba(0,0,0,0.05)] dark:border-slate-700/50 dark:bg-slate-800/50 dark:backdrop-blur-sm dark:shadow-none">
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
          <form onSubmit={handleSubmitLeave} className="grid gap-5 p-5 md:grid-cols-2 md:gap-6 md:p-6">
            <div className="min-w-0">
              <Label className="block text-sm font-medium text-foreground mb-2">Start Date</Label>
              <Input
                type="date"
                value={newLeave.startDate}
                onChange={(e) => setNewLeave({ ...newLeave, startDate: e.target.value })}
                className={inputClassName}
                required
              />
            </div>
            <div className="min-w-0">
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
            <div className="min-w-0 md:col-span-2">
              <Label className="block text-sm font-medium text-foreground mb-2">Reason</Label>
              <textarea
                value={newLeave.reason}
                onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                placeholder="Provide reason for leave"
                className={`${inputClassName} min-h-[100px] resize-none`}
                required
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row md:col-span-2">
              <Button type="submit" disabled={isSubmitting} className="w-full rounded-xl sm:w-auto">
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
                className="w-full rounded-xl sm:w-auto"
              >
                Cancel
              </Button>
            </div>
          </form>
        </GlassCard>
      )}

      {/* Leave Requests Table */}
      {/* My Leave Requests Progress Tracker */}
      <GlassCard variant="panel" padding="none" className="overflow-hidden">
        <div className="border-b border-white/15 px-5 py-4 md:px-6">
          <h2 className="text-lg font-semibold text-foreground">My Leave Requests</h2>
        </div>
        {leaveRequests.length === 0 ? (
          <div className="p-12 text-center">
            <div className="rounded-2xl border border-dashed border-white/25 bg-white/20 p-8 backdrop-blur-sm">
              <p className="text-sm text-muted-foreground">No leave requests found</p>
            </div>
          </div>
        ) : (
          <div className="p-4 md:p-6 grid gap-6">
            {leaveRequests.map((leave) => {
              const start = new Date(leave.startDate);
              const end = new Date(leave.endDate);
              const daysCount = differenceInDays(end, start) + 1;

              return (
                <div
                  key={leave.id}
                  className="rounded-3xl border border-white/20 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-6 shadow-xl backdrop-blur-md hover:border-white/30 transition-all duration-300"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="font-bold text-foreground text-base">{leave.reason}</h3>
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
                      <div className="mt-2 grid grid-cols-2 gap-4 text-xs text-muted-foreground sm:grid-cols-3">
                        <div>
                          <span className="font-semibold text-foreground">Dates:</span>{' '}
                          {format(start, 'MMM d, yyyy')} - {format(end, 'MMM d, yyyy')}
                        </div>
                        <div>
                          <span className="font-semibold text-foreground">Duration:</span>{' '}
                          {daysCount} {daysCount === 1 ? 'day' : 'days'}
                        </div>
                        <div>
                          <span className="font-semibold text-foreground">Applied:</span>{' '}
                          {format(new Date(leave.createdAt), 'MMM d, yyyy')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Horizontal Progress Timeline */}
                  <div className="mt-8 relative">
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 -translate-y-1/2 bg-white/10 rounded-full" />
                    
                    <div className="relative flex justify-between">
                      {/* Step 1: Submitted */}
                      <div className="flex flex-col items-center text-center">
                        <div className="z-10 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md">
                          <Check size={14} />
                        </div>
                        <span className="mt-2 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                          Submitted
                        </span>
                      </div>

                      {/* Step 2: Under Review */}
                      <div className="flex flex-col items-center text-center">
                        <div className={`z-10 flex h-7 w-7 items-center justify-center rounded-full shadow-md ${
                          leave.status === 'PENDING'
                            ? 'bg-amber-500 text-white animate-pulse'
                            : 'bg-emerald-500 text-white'
                        }`}>
                          {leave.status === 'PENDING' ? (
                            <Clock size={14} />
                          ) : (
                            <Check size={14} />
                          )}
                        </div>
                        <span className={`mt-2 text-[10px] font-bold uppercase tracking-wider ${
                          leave.status === 'PENDING' ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          Under Review
                        </span>
                      </div>

                      {/* Step 3: Resolution */}
                      <div className="flex flex-col items-center text-center">
                        <div className={`z-10 flex h-7 w-7 items-center justify-center rounded-full shadow-md ${
                          leave.status === 'APPROVED'
                            ? 'bg-emerald-500 text-white'
                            : leave.status === 'REJECTED'
                            ? 'bg-rose-500 text-white'
                            : 'bg-white/10 text-muted-foreground'
                        }`}>
                          {leave.status === 'APPROVED' ? (
                            <Check size={14} />
                          ) : leave.status === 'REJECTED' ? (
                            <X size={14} />
                          ) : (
                            <Clock size={14} />
                          )}
                        </div>
                        <span className={`mt-2 text-[10px] font-bold uppercase tracking-wider ${
                          leave.status === 'APPROVED'
                            ? 'text-emerald-400'
                            : leave.status === 'REJECTED'
                            ? 'text-rose-400'
                            : 'text-muted-foreground'
                        }`}>
                          {leave.status === 'APPROVED'
                            ? 'Approved'
                            : leave.status === 'REJECTED'
                            ? 'Rejected'
                            : 'Outcome Pending'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

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
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [fetchedYears, setFetchedYears] = useState<number[]>([]);

  // Custom DayButton to show holiday name on hover
  const HolidayAwareDayButton = ({
    className,
    day,
    modifiers,
    locale,
    ...props
  }: any) => {
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

  useEffect(() => {
    setMounted(true);
    const currentYear = new Date().getFullYear();
    fetchHolidays(currentYear);
  }, []);

  const fetchHolidays = async (year: number) => {
    // If we've already fetched holidays for this year, skip it.
    if (fetchedYears.includes(year)) return;
    
    // Add year to state immediately to prevent duplicate concurrent calls
    setFetchedYears((prev) => [...prev, year]);

    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY;
      
      if (!apiKey) {
        console.warn('Google Calendar API key not found');
        return;
      }

      const calendarId = 'en.bd#holiday@group.v.calendar.google.com';
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${apiKey}&timeMin=${year}-01-01T00:00:00Z&timeMax=${year}-12-31T23:59:59Z`;
      
      const response = await fetch(url);
      if (!response.ok) {
        console.error('Failed to fetch holidays from Google Calendar API');
        return;
      }
      
      const data = await response.json();
      const newHolidaysData: Holiday[] = [];
      
      data.items?.forEach((item: any) => {
        const startStrRaw = item.start?.date || item.start?.dateTime;
        const endStrRaw = item.end?.date || item.end?.dateTime;
        
        if (!startStrRaw) return;
        
        const startDateStr = startStrRaw.split('T')[0];
        const endDateStr = endStrRaw ? endStrRaw.split('T')[0] : null;
        
        const name = item.summary;
        const description = item.description;

        newHolidaysData.push({ date: startDateStr, name, description });

        if (endDateStr && endDateStr !== startDateStr) {
          const [yr, month, day] = startDateStr.split('-').map(Number);
          const startObj = new Date(yr, month - 1, day);
          const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);
          const endObj = new Date(endYear, endMonth - 1, endDay);
          
          startObj.setDate(startObj.getDate() + 1);
          while (startObj < endObj) {
            const dateStr = format(startObj, 'yyyy-MM-dd');
            newHolidaysData.push({ date: dateStr, name, description });
            startObj.setDate(startObj.getDate() + 1);
          }
        }
      });
      
      console.log('Holidays parsed for year', year, ':', newHolidaysData);
      setHolidays((prev) => [...prev, ...newHolidaysData]);
    } catch (error) {
      console.error('Error fetching holidays:', error);
    }
  };

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
    'w-full rounded-xl border border-slate-300/50 bg-gradient-to-br from-white/90 via-white/70 to-white/90 px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 backdrop-blur-md transition-all dark:border-slate-600/50 dark:from-slate-800/90 dark:via-slate-900/70 dark:to-slate-800/90';

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
              className="rounded-2xl border-0 [--cell-size:2.5rem] w-full"
              numberOfMonths={2}
              classNames={{
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
              {leaveRequests
                .filter((leave) => leave.status === 'APPROVED' && new Date(leave.startDate) >= new Date())
                .slice(0, 5)
                .map((leave) => (
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
              {leaveRequests.filter((leave) => leave.status === 'APPROVED' && new Date(leave.startDate) >= new Date()).length === 0 && (
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
            <div className="rounded-2xl border border-dashed border-white/25 bg-white/20 p-8 backdrop-blur-sm">
              <p className="text-sm text-muted-foreground">No leave requests found</p>
            </div>
          </div>
        ) : (
          <div className="p-4 md:p-6">
            <div className="overflow-x-auto rounded-2xl border border-white/20 bg-white/25 shadow-[0_16px_48px_rgba(76,92,148,0.16)] dark:bg-slate-900/30 backdrop-blur-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/20 bg-white/35 dark:bg-white/5 backdrop-blur-sm">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Start Date</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">End Date</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Reason</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Applied On</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.map((leave) => (
                  <tr key={leave.id} className="border-b border-white/15 last:border-0 hover:bg-white/35 dark:hover:bg-white/5 backdrop-blur-sm">
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

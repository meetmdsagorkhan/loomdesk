'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  endOfMonth,
  format,
  isSameDay,
  parseISO,
  startOfMonth,
} from 'date-fns';
import { CalendarDays, Clock3, FileText, Loader2, PlaneTakeoff } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/shared/PageHeader';
import GlassCard from '@/components/shared/GlassCard';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { isAdmin } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type CalendarEventType = 'shift' | 'leave' | 'report';

type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  detail: string;
  type: CalendarEventType;
  status?: string;
};

type ShiftAssignmentResponse = {
  assignments?: Array<{
    id: string;
    startDate: string;
    endDate: string;
    shift: {
      name: string;
      startTime: string;
      endTime: string;
    };
    user?: {
      name: string;
    };
  }>;
};

type LeaveResponse = {
  leaveRequests?: Array<{
    id: string;
    startDate: string;
    endDate: string;
    reason: string;
    status: string;
    user?: {
      name: string;
    };
  }>;
};

type ReportsResponse = {
  reports?: Array<{
    id: string;
    date: string;
    status: string;
    user?: {
      name: string;
    };
  }>;
};

const eventIcons = {
  shift: Clock3,
  leave: PlaneTakeoff,
  report: FileText,
} satisfies Record<CalendarEventType, typeof Clock3>;

const eventTone = {
  shift: 'bg-primary/10 text-primary border-primary/15',
  leave: 'bg-warning/10 text-warning border-warning/15',
  report: 'bg-info/10 text-info border-info/15',
} satisfies Record<CalendarEventType, string>;

export default function CalendarPage() {
  const { user, isLoading: userLoading } = useCurrentUser();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [month, setMonth] = useState<Date>(startOfMonth(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (userLoading || !user) {
      return;
    }

    const controller = new AbortController();

    async function loadCalendar() {
      setIsLoading(true);
      setError('');

      try {
        const rangeStart = startOfMonth(month).toISOString();
        const rangeEnd = endOfMonth(month).toISOString();
        const params = new URLSearchParams({
          startDate: rangeStart,
          endDate: rangeEnd,
        });

        const [shiftsResponse, leaveResponse, reportsResponse] = await Promise.all([
          fetch(`/api/shifts/schedule?${params}`, { signal: controller.signal }),
          fetch('/api/leave', { signal: controller.signal }),
          fetch('/api/reports?limit=200', { signal: controller.signal }),
        ]);

        if (!shiftsResponse.ok || !leaveResponse.ok || !reportsResponse.ok) {
          throw new Error('Failed to load the unified calendar view.');
        }

        const shiftsData = (await shiftsResponse.json()) as ShiftAssignmentResponse;
        const leaveData = (await leaveResponse.json()) as LeaveResponse;
        const reportsData = (await reportsResponse.json()) as ReportsResponse;

        const nextEvents: CalendarEvent[] = [];

        for (const assignment of shiftsData.assignments ?? []) {
          nextEvents.push({
            id: `shift-${assignment.id}`,
            title: assignment.shift.name,
            date: assignment.startDate,
            detail: `${assignment.shift.startTime} - ${assignment.shift.endTime}${
              isAdmin({ user }) && assignment.user?.name ? ` · ${assignment.user.name}` : ''
            }`,
            type: 'shift',
          });
        }

        for (const leave of leaveData.leaveRequests ?? []) {
          nextEvents.push({
            id: `leave-${leave.id}`,
            title: leave.reason,
            date: leave.startDate,
            detail: `${leave.status.toLowerCase()}${isAdmin({ user }) && leave.user?.name ? ` · ${leave.user.name}` : ''}`,
            type: 'leave',
            status: leave.status,
          });
        }

        for (const report of reportsData.reports ?? []) {
          nextEvents.push({
            id: `report-${report.id}`,
            title: report.user?.name ? `${report.user.name} report` : 'Report submitted',
            date: report.date,
            detail: report.status.toLowerCase(),
            type: 'report',
            status: report.status,
          });
        }

        setEvents(nextEvents);
      } catch (loadError) {
        if (!(loadError instanceof DOMException && loadError.name === 'AbortError')) {
          console.error('Failed to load calendar:', loadError);
          setError('We could not load calendar activity for this period.');
        }
      } finally {
        setIsLoading(false);
      }
    }

    void loadCalendar();

    return () => controller.abort();
  }, [month, user, userLoading]);

  const eventsForSelectedDay = useMemo(
    () =>
      events.filter((event) =>
        isSameDay(parseISO(event.date), selectedDate)
      ),
    [events, selectedDate]
  );

  const eventDates = useMemo(
    () => events.map((event) => parseISO(event.date)),
    [events]
  );

  if (userLoading || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Unified Calendar"
        title="A single view of shifts, leave, and report activity."
        subtitle="Use this calendar to spot staffing coverage, approved leave, and report cadence without hopping between modules."
        actions={
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
              {format(month, 'MMMM yyyy')}
            </Badge>
            <Button variant="outline" onClick={() => setMonth(startOfMonth(new Date()))}>
              This month
            </Button>
          </div>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <GlassCard variant="default" padding="md">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            month={month}
            onMonthChange={setMonth}
            modifiers={{ hasEvents: eventDates }}
            modifiersClassNames={{
              hasEvents:
                'after:absolute after:bottom-1.5 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-primary',
            }}
            className="w-full rounded-2xl border border-border/70 bg-background/60 p-4"
          />
        </GlassCard>

        <GlassCard variant="default" padding="md">
          <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Selected day</p>
              <h2 className="text-xl font-semibold text-foreground">
                {format(selectedDate, 'EEEE, MMMM d')}
              </h2>
            </div>
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <CalendarDays className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {isLoading ? (
              <div className="flex min-h-48 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                {error}
              </div>
            ) : eventsForSelectedDay.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-background/70 p-6 text-center">
                <p className="text-sm font-medium text-foreground">No scheduled activity</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  This day is currently clear based on available shift, leave, and report data.
                </p>
              </div>
            ) : (
              eventsForSelectedDay.map((event) => {
                const Icon = eventIcons[event.type];

                return (
                  <div
                    key={event.id}
                    className="rounded-2xl border border-border bg-background/75 p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`rounded-2xl border p-3 ${eventTone[event.type]}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{event.title}</p>
                          <Badge variant="outline" className="rounded-full capitalize">
                            {event.type}
                          </Badge>
                          {event.status ? (
                            <Badge variant="secondary" className="rounded-full">
                              {event.status}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{event.detail}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </GlassCard>
      </section>
    </div>
  );
}

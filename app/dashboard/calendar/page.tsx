'use client';

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import CalendarView from '@/components/shared/CalendarView';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { isAdmin } from '@/lib/auth-utils';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  type?: 'shift' | 'leave' | 'report' | 'meeting';
  status?: string;
};

export default function CalendarPage() {
  const { user, isLoading: userLoading } = useCurrentUser();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (userLoading || !mounted) return;
    if (!user) return;

    fetchCalendarEvents();
  }, [user, userLoading, mounted]);

  const fetchCalendarEvents = async () => {
    try {
      setIsLoading(true);
      
      // Fetch shifts
      const shiftsResponse = await fetch('/api/shifts/my-schedule');
      const shiftsData = await shiftsResponse.json();
      
      // Fetch leave requests
      const leaveResponse = await fetch('/api/leave');
      const leaveData = await leaveResponse.json();
      
      // Fetch reports (for admin)
      let reportsData = [];
      if (isAdmin({ user })) {
        const reportsResponse = await fetch('/api/reports');
        reportsData = await reportsResponse.json();
      }

      const calendarEvents: CalendarEvent[] = [];

      // Convert shifts to calendar events
      if (shiftsData && shiftsData.assignments) {
        shiftsData.assignments.forEach((assignment: any) => {
          calendarEvents.push({
            id: assignment.id,
            title: `Shift: ${assignment.shift?.name || 'Assigned'}`,
            start: new Date(assignment.startDate),
            end: new Date(assignment.endDate),
            allDay: true,
            type: 'shift',
          });
        });
      }

      // Convert leave requests to calendar events
      if (leaveData && Array.isArray(leaveData)) {
        leaveData.forEach((leave: any) => {
          if (leave.status === 'APPROVED') {
            calendarEvents.push({
              id: leave.id,
              title: `Leave: ${leave.reason}`,
              start: new Date(leave.startDate),
              end: new Date(leave.endDate),
              allDay: true,
              type: 'leave',
              status: leave.status,
            });
          }
        });
      }

      // Convert reports to calendar events (admin only)
      if (isAdmin({ user }) && reportsData && Array.isArray(reportsData)) {
        reportsData.forEach((report: any) => {
          calendarEvents.push({
            id: report.id,
            title: `Report: ${report.user?.name || 'Team Member'}`,
            start: new Date(report.date),
            end: new Date(report.date),
            allDay: true,
            type: 'report',
            status: report.status,
          });
        });
      }

      setEvents(calendarEvents);
    } catch (error) {
      console.error('Failed to fetch calendar events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted || userLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Calendar</h1>
        <p className="text-muted-foreground mt-1">
          View your schedule and upcoming events
        </p>
      </div>

      <CalendarView />
    </div>
  );
}

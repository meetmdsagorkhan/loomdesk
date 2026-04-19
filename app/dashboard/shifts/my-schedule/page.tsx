'use client';

import { useState, useEffect, useEffectEvent } from 'react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type ShiftAssignment = {
  id: string;
  startDate: string;
  endDate: string;
  shift: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
  };
};

export default function MySchedulePage() {
  const { user, isLoading: userLoading } = useCurrentUser();
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());
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

    fetchSchedule();
  }, [user, userLoading, currentWeek, mounted]);

  const fetchSchedule = useEffectEvent(async () => {
    setIsLoading(true);
    try {
      const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
      const weekEnd = addDays(weekStart, 6);

      const response = await fetch(
        `/api/shifts/schedule?startDate=${weekStart.toISOString()}&endDate=${weekEnd.toISOString()}`
      );
      const data = await response.json();
      setAssignments(data.assignments || []);
    } catch (error) {
      console.error('Failed to fetch schedule:', error);
    } finally {
      setIsLoading(false);
    }
  });

  const getShiftForDay = (date: Date) => {
    return assignments.find((assignment) => {
      const start = new Date(assignment.startDate);
      const end = new Date(assignment.endDate);
      return isSameDay(date, start) || (date >= start && date <= end);
    });
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(startOfWeek(currentWeek, { weekStartsOn: 1 }), i);
    return date;
  });

  const goToPreviousWeek = () => {
    setCurrentWeek((prev) => addDays(prev, -7));
  };

  const goToNextWeek = () => {
    setCurrentWeek((prev) => addDays(prev, 7));
  };

  const goToToday = () => {
    setCurrentWeek(new Date());
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
      <div>
        <h1 className="text-2xl font-semibold text-foreground">My Schedule</h1>
        <p className="text-muted-foreground mt-1">View your assigned shifts</p>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={goToPreviousWeek}>
            <ChevronLeft size={16} />
          </Button>
          <Button size="sm" variant="outline" onClick={goToToday}>
            Today
          </Button>
          <Button size="sm" variant="outline" onClick={goToNextWeek}>
            <ChevronRight size={16} />
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          {format(startOfWeek(currentWeek, { weekStartsOn: 1 }), 'MMM d, yyyy')} -{' '}
          {format(addDays(startOfWeek(currentWeek, { weekStartsOn: 1 }), 6), 'MMM d, yyyy')}
        </div>
      </div>

      {/* Weekly Calendar */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border">
          {weekDays.map((date) => (
            <div
              key={date.toISOString()}
              className="p-4 text-center bg-muted/50"
            >
              <div className="text-sm font-medium text-muted-foreground">
                {format(date, 'EEE')}
              </div>
              <div className="text-2xl font-semibold text-foreground mt-1">
                {format(date, 'd')}
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 min-h-[300px]">
          {weekDays.map((date) => {
            const shift = getShiftForDay(date);
            const isToday = isSameDay(date, new Date());

            return (
              <div
                key={date.toISOString()}
                className={`p-4 border-r border-border last:border-r-0 min-h-[150px] ${
                  isToday ? 'bg-primary/5' : ''
                }`}
              >
                {shift ? (
                  <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 h-full flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock size={16} className="text-primary" />
                      <span className="font-medium text-foreground text-sm">
                        {shift.shift.name}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {shift.shift.startTime} - {shift.shift.endTime}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <span className="text-sm text-muted-foreground">No shift</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-primary/10 border border-primary/30 rounded" />
          <span>Assigned shift</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-primary/5 rounded" />
          <span>Today</span>
        </div>
      </div>
    </div>
  );
}

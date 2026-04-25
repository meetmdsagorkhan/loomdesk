'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import PageHeader from '@/components/shared/PageHeader';
import GlassCard from '@/components/shared/GlassCard';

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

  const fetchSchedule = useCallback(async () => {
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
      // Silently fail - schedule will be empty
    } finally {
      setIsLoading(false);
    }
  }, [currentWeek]);

  useEffect(() => {
    if (userLoading) return;
    if (!mounted) return;

    if (!user) {
      return;
    }

    fetchSchedule();
  }, [user, userLoading, mounted, fetchSchedule]);

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
    <div className="space-y-8">
      <PageHeader
        badge="Schedule"
        title="My Schedule"
        subtitle="View your assigned shifts and upcoming work timings."
      />

      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={goToPreviousWeek} className="rounded-xl border-white/10">
            <ChevronLeft size={16} />
          </Button>
          <Button size="sm" variant="outline" onClick={goToToday} className="rounded-xl border-white/10">
            Today
          </Button>
          <Button size="sm" variant="outline" onClick={goToNextWeek} className="rounded-xl border-white/10">
            <ChevronRight size={16} />
          </Button>
        </div>
        <div className="text-sm font-medium text-primary">
          {format(startOfWeek(currentWeek, { weekStartsOn: 1 }), 'MMM d')} — {' '}
          {format(addDays(startOfWeek(currentWeek, { weekStartsOn: 1 }), 6), 'MMM d, yyyy')}
        </div>
      </div>

      {/* Weekly Calendar */}
      <GlassCard variant="default" padding="none">
        <div className="grid grid-cols-7 border-b border-white/10">
          {weekDays.map((date) => (
            <div
              key={date.toISOString()}
              className="p-4 text-center bg-white/5"
            >
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {format(date, 'EEE')}
              </div>
              <div className={`text-xl font-bold mt-1 ${isSameDay(date, new Date()) ? 'text-primary' : 'text-foreground'}`}>
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
                className={`p-4 border-r border-white/10 last:border-r-0 min-h-[150px] transition-colors duration-300 ${
                  isToday ? 'bg-primary/5' : 'hover:bg-white/5'
                }`}
              >
                {shift ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-primary/10 border border-primary/20 rounded-xl p-3 h-full flex flex-col shadow-lg shadow-primary/5"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Clock size={14} className="text-primary" />
                      <span className="font-bold text-foreground text-sm tracking-tight">
                        {shift.shift.name}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-primary/80 mt-auto">
                      {shift.shift.startTime} — {shift.shift.endTime}
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex items-center justify-center h-full opacity-30">
                    <span className="text-[10px] font-bold uppercase tracking-widest">Off</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Legend */}
      <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-primary/20 border border-primary/40 rounded-sm" />
          <span>Assigned Shift</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-primary/10 rounded-sm" />
          <span>Current Day</span>
        </div>
      </div>
    </div>
  );
}

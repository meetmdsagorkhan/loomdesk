'use client';

import { useState, useEffect, useEffectEvent } from 'react';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2, Users, CheckCircle, XCircle, Clock, Calendar } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import GlassCard from '@/components/shared/GlassCard';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { isAdmin } from '@/lib/auth-utils';
import { handleApiError } from '@/lib/error-handler';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type AttendanceDay = {
  date: string;
  status: 'PRESENT' | 'LATE' | 'LEAVE' | 'ABSENT' | 'DAY_OFF';
  details?: string;
};

type AttendanceData = {
  userId: string;
  userName: string;
  month: number;
  year: number;
  days: AttendanceDay[];
  stats: {
    present: number;
    late: number;
    absent: number;
    leave: number;
    dayOff: number;
    attendanceRate: number;
  };
};

export default function AttendancePage() {
  const { user, isLoading: userLoading } = useCurrentUser();
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedUserId, setSelectedUserId] = useState('');
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
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

    if (isAdmin({ user })) {
      setSelectedUserId((current) => current || user.id);
      void fetchMembers();
    } else {
      setSelectedUserId(user.id);
    }

    void fetchAttendance();
  }, [user, userLoading, currentDate, selectedUserId, mounted]);

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        handleApiError('Failed to fetch members', 'Attendance');
        return;
      }
      const data = await response.json();
      setMembers(data.users || []);
    } catch (error) {
      handleApiError(error, 'Attendance');
    }
  };

  const fetchAttendance = useEffectEvent(async () => {
    setIsLoading(true);
    try {
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      const userId = isAdmin({ user }) ? selectedUserId || user?.id : user?.id;

      const response = await fetch(`/api/attendance?userId=${userId}&month=${month}&year=${year}`);
      if (!response.ok) {
        handleApiError('Failed to fetch attendance', 'Attendance');
        return;
      }
      const data = await response.json();
      setAttendance(data);
    } catch (error) {
      handleApiError(error, 'Attendance');
    } finally {
      setIsLoading(false);
    }
  });

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

  const goToPreviousMonth = () => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const goToNextMonth = () => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return 'bg-success text-success-foreground';
      case 'LATE':
        return 'bg-warning text-warning-foreground';
      case 'ABSENT':
        return 'bg-destructive text-destructive-foreground';
      case 'LEAVE':
        return 'bg-info text-info-foreground';
      case 'DAY_OFF':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Attendance Tracking"
        title="Monthly attendance overview"
        subtitle="View and track team attendance patterns across the month with detailed statistics."
        actions={
          isAdmin({ user }) && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-foreground">Select User:</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="border-border/70 bg-background/60 p-4 shadow-sm transition-all hover:bg-background/75 cursor-pointer backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              >
                <option value="">All Users</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
          )
        }
      />
      {/* Date Navigation */}
      <GlassCard>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={goToPreviousMonth} className="rounded-xl">
              <ChevronLeft size={16} />
            </Button>
            <span className="text-lg font-semibold text-foreground">
              {format(currentDate, 'MMMM yyyy')}
            </span>
            <Button size="sm" variant="outline" onClick={goToNextMonth} className="rounded-xl">
              <ChevronRight size={16} />
            </Button>
          </div>
          <Button size="sm" variant="outline" onClick={goToToday} className="rounded-xl">
            Today
          </Button>
        </div>
      </GlassCard>

      {/* Calendar Grid */}
      {attendance ? (
        <GlassCard>
          <div className="grid grid-cols-7 gap-1 p-4 bg-muted/50">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 p-4">
            {attendance.days.map((day) => (
              <div
                key={day.date}
                className={`aspect-square rounded-2xl flex items-center justify-center text-sm font-medium ${getStatusColor(day.status)}`}
                title={day.details || day.status}
              >
                {new Date(day.date).getDate()}
              </div>
            ))}
          </div>
        </GlassCard>
      ) : (
        <GlassCard variant="default" padding="lg">
          <div className="rounded-2xl border border-dashed border-slate-300/50 p-8 text-center backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.8),inset_0_-1px_0_rgba(0,0,0,0.05),0_8px_32px_rgba(0,0,0,0.05)] dark:border-slate-700/50 dark:bg-slate-800/50 dark:backdrop-blur-sm dark:shadow-none">No attendance data available for this period.</div>
        </GlassCard>
      )}

      {/* Stats */}
      {attendance && (
        <GlassCard variant="default" padding="md">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-success">{attendance.stats.present}</div>
              <div className="text-sm text-muted-foreground">Present</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning">{attendance.stats.late}</div>
              <div className="text-sm text-muted-foreground">Late</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">{attendance.stats.absent}</div>
              <div className="text-sm text-muted-foreground">Absent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-info">{attendance.stats.leave}</div>
              <div className="text-sm text-muted-foreground">Leave</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{attendance.stats.attendanceRate}%</div>
              <div className="text-sm text-muted-foreground">Attendance Rate</div>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
}

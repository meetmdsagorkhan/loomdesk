'use client';

import { useState, useEffect, useEffectEvent } from 'react';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
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
      {/* Header */}
      <section className="rounded-3xl border border-border/60 bg-card/80 p-6 card-elevation-md backdrop-blur-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
            Attendance Calendar
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            Track team attendance
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            View daily attendance records, monitor patterns, and track team presence over time.
          </p>
        </div>
      </section>

      {/* Date Navigation */}
      <section className="rounded-3xl border border-border/60 bg-card/80 p-4 card-elevation-md backdrop-blur-sm">
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
      </section>

      {/* User Selection for Admin */}
      {isAdmin({ user }) && (
        <section className="rounded-3xl border border-border/60 bg-card/80 p-4 card-elevation-md backdrop-blur-sm">
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          >
            <option value={user?.id}>My attendance</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </section>
      )}

      {/* Calendar Grid */}
      {attendance ? (
        <section className="rounded-3xl border border-border/60 bg-card/80 overflow-hidden card-elevation-md backdrop-blur-sm">
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
        </section>
      ) : (
        <section className="rounded-3xl border border-border/60 bg-card/80 p-8 card-elevation-md backdrop-blur-sm text-center">
          <p className="text-muted-foreground">No attendance data available for this period.</p>
        </section>
      )}

      {/* Stats */}
      {attendance && (
        <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="rounded-3xl border border-border/60 bg-card/80 p-4 text-center card-elevation-md backdrop-blur-sm">
            <div className="text-2xl font-bold text-success">{attendance.stats.present}</div>
            <div className="text-sm text-muted-foreground">Present</div>
          </div>
          <div className="rounded-3xl border border-border/60 bg-card/80 p-4 text-center card-elevation-md backdrop-blur-sm">
            <div className="text-2xl font-bold text-warning">{attendance.stats.late}</div>
            <div className="text-sm text-muted-foreground">Late</div>
          </div>
          <div className="rounded-3xl border border-border/60 bg-card/80 p-4 text-center card-elevation-md backdrop-blur-sm">
            <div className="text-2xl font-bold text-destructive">{attendance.stats.absent}</div>
            <div className="text-sm text-muted-foreground">Absent</div>
          </div>
          <div className="rounded-3xl border border-border/60 bg-card/80 p-4 text-center card-elevation-md backdrop-blur-sm">
            <div className="text-2xl font-bold text-info">{attendance.stats.leave}</div>
            <div className="text-sm text-muted-foreground">Leave</div>
          </div>
          <div className="rounded-3xl border border-border/60 bg-card/80 p-4 text-center card-elevation-md backdrop-blur-sm">
            <div className="text-2xl font-bold text-foreground">{attendance.stats.attendanceRate}%</div>
            <div className="text-sm text-muted-foreground">Attendance Rate</div>
          </div>
        </section>
      )}
    </div>
  );
}

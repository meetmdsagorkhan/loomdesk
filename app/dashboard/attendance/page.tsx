'use client';

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDaysInMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { isAdmin } from '@/lib/auth-utils';

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
  // Prevent SSR completely
  if (typeof window === 'undefined') {
    return null;
  }

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

    if (!user || !isAdmin({ user })) {
      setSelectedUserId(user?.id || '');
    }

    fetchMembers();
    fetchAttendance();
  }, [user, userLoading, currentDate, selectedUserId, mounted]);

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      setMembers(data.users || []);
    } catch (error) {
      console.error('Failed to fetch members:', error);
    }
  };

  const fetchAttendance = async () => {
    setIsLoading(true);
    try {
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      const userId = isAdmin({ user }) && selectedUserId ? selectedUserId : user?.id;

      const response = await fetch(`/api/attendance?userId=${userId}&month=${month}&year=${year}`);
      const data = await response.json();
      setAttendance(data);
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    } finally {
      setIsLoading(false);
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
        return 'bg-green-500';
      case 'LATE':
        return 'bg-amber-500';
      case 'ABSENT':
        return 'bg-red-500';
      case 'LEAVE':
        return 'bg-blue-500';
      case 'DAY_OFF':
        return 'bg-gray-400';
      default:
        return 'bg-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Attendance Calendar</h1>
        <p className="text-muted-foreground mt-1">Track team attendance</p>
      </div>

      {/* Date Navigation */}
      <div className="bg-card rounded-2xl border border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={goToPreviousMonth}>
              <ChevronLeft size={16} />
            </Button>
            <span className="text-lg font-medium text-foreground">
              {format(currentDate, 'MMMM yyyy')}
            </span>
            <Button size="sm" variant="outline" onClick={goToNextMonth}>
              <ChevronRight size={16} />
            </Button>
          </div>
          <Button size="sm" variant="outline" onClick={goToToday}>
            Today
          </Button>
        </div>
      </div>

      {/* User Selection for Admin */}
      {isAdmin({ user }) && (
        <div className="bg-card rounded-2xl border border-border p-4">
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-input bg-background text-foreground"
          >
            <option value="">All Members</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Calendar Grid */}
      {attendance ? (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
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
                className={`aspect-square rounded-lg flex items-center justify-center text-sm font-medium ${getStatusColor(day.status)} text-white`}
                title={day.details || day.status}
              >
                {new Date(day.date).getDate()}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <p className="text-muted-foreground">No attendance data available for this period.</p>
        </div>
      )}

      {/* Stats */}
      {attendance && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-card rounded-2xl border border-border p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{attendance.stats.present}</div>
            <div className="text-sm text-muted-foreground">Present</div>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">{attendance.stats.late}</div>
            <div className="text-sm text-muted-foreground">Late</div>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{attendance.stats.absent}</div>
            <div className="text-sm text-muted-foreground">Absent</div>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{attendance.stats.leave}</div>
            <div className="text-sm text-muted-foreground">Leave</div>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{attendance.stats.attendanceRate}%</div>
            <div className="text-sm text-muted-foreground">Attendance Rate</div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import type { ReactNode } from 'react';
import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { CalendarDays, CheckCircle2, Clock3, Loader2, MoonStar, Plane, UserX } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import GlassCard from '@/components/shared/GlassCard';
import StatCard from '@/components/shared/StatCard';
import Badge from '@/components/shared/Badge';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { isAdmin, isTeamLead } from '@/lib/auth-utils';
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

type MemberOption = {
  id: string;
  name: string;
};

const STATUS_META: Record<
  AttendanceDay['status'],
  { label: string; className: string; icon: ReactNode }
> = {
  PRESENT: {
    label: 'Present',
    className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
    icon: <CheckCircle2 size={14} />,
  },
  LATE: {
    label: 'Late',
    className: 'bg-amber-500/15 text-amber-600 dark:text-amber-300',
    icon: <Clock3 size={14} />,
  },
  LEAVE: {
    label: 'Leave',
    className: 'bg-sky-500/15 text-sky-600 dark:text-sky-300',
    icon: <Plane size={14} />,
  },
  ABSENT: {
    label: 'Absent',
    className: 'bg-rose-500/15 text-rose-600 dark:text-rose-300',
    icon: <UserX size={14} />,
  },
  DAY_OFF: {
    label: 'Day Off',
    className: 'bg-slate-500/15 text-slate-600 dark:text-slate-300',
    icon: <MoonStar size={14} />,
  },
};

function getMonthOptions() {
  return Array.from({ length: 12 }, (_, index) => ({
    value: index + 1,
    label: format(new Date(2026, index, 1), 'MMMM'),
  }));
}

export default function AttendancePage() {
  const { user, isLoading: userLoading } = useCurrentUser();
  const [mounted, setMounted] = useState(false);
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const isManager = !!user && (isAdmin({ user }) || isTeamLead({ user }));
  const monthOptions = getMonthOptions();
  const yearOptions = [selectedYear - 1, selectedYear, selectedYear + 1];

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchMembers = useCallback(async () => {
    if (!isManager) return;

    try {
      const response = await fetch('/api/users');
      if (!response.ok) return;

      const data = await response.json();
      setMembers((data.users || []).map((member: { id: string; name: string }) => ({
        id: member.id,
        name: member.name,
      })));
    } catch (error) {
      console.error('Failed to fetch members for attendance', error);
    }
  }, [isManager]);

  const fetchAttendance = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        month: String(selectedMonth),
        year: String(selectedYear),
      });

      if (isManager && selectedUserId) {
        params.set('userId', selectedUserId);
      }

      const response = await fetch(`/api/attendance?${params.toString()}`);

      if (!response.ok) {
        handleApiError('Failed to fetch attendance', 'Attendance');
        setAttendance(null);
        return;
      }

      const data = await response.json();
      setAttendance(data);
    } catch (error) {
      handleApiError(error, 'Attendance');
      setAttendance(null);
    } finally {
      setIsLoading(false);
    }
  }, [isManager, selectedMonth, selectedUserId, selectedYear, user]);

  useEffect(() => {
    if (!mounted || userLoading || !user) return;

    fetchAttendance();
    if (isManager) {
      fetchMembers();
    }
  }, [mounted, userLoading, user, isManager, fetchAttendance, fetchMembers]);

  useEffect(() => {
    if (!mounted || userLoading || !user) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchAttendance();
      }
    };

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchAttendance();
      }
    }, 30000);

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [mounted, userLoading, user, fetchAttendance]);

  if (!mounted || userLoading || isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Attendance"
        title={isManager ? 'Attendance overview' : 'My attendance'}
        subtitle={
          isManager
            ? 'Track month-by-month presence, late submissions, leave, and absences for the team.'
            : 'Review your attendance history based on submitted reports, leave, and shifts.'
        }
      />

      <GlassCard variant="panel" padding="md">
        <div className="grid gap-4 md:grid-cols-4">
          {isManager && (
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Member</label>
              <select
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
                className="form-input"
              >
                <option value="">Current User</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Month</label>
            <select
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(Number(event.target.value))}
              className="form-input"
            >
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Year</label>
            <select
              value={selectedYear}
              onChange={(event) => setSelectedYear(Number(event.target.value))}
              className="form-input"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <Button onClick={fetchAttendance} className="w-full rounded-xl">
              <CalendarDays size={16} className="mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </GlassCard>

      {attendance ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <StatCard title="Attendance" value={`${attendance.stats.attendanceRate}%`} icon={<CalendarDays size={18} />} color="primary" />
            <StatCard title="Present" value={attendance.stats.present} icon={<CheckCircle2 size={18} />} color="success" />
            <StatCard title="Late" value={attendance.stats.late} icon={<Clock3 size={18} />} color="warning" />
            <StatCard title="Leave" value={attendance.stats.leave} icon={<Plane size={18} />} color="accent" />
            <StatCard title="Absent" value={attendance.stats.absent} icon={<UserX size={18} />} color="warning" />
            <StatCard title="Days Off" value={attendance.stats.dayOff} icon={<MoonStar size={18} />} color="accent" />
          </div>

          <GlassCard variant="panel" padding="none" className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/15 px-5 py-4 md:px-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{attendance.userName}</h2>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(attendance.year, attendance.month - 1, 1), 'MMMM yyyy')}
                </p>
              </div>
              <Badge variant="info" label={`${attendance.days.length} Days`} />
            </div>

            <div className="hidden p-4 md:block md:p-6">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
                {attendance.days.map((day) => {
                  const status = STATUS_META[day.status];

                  return (
                    <div
                      key={day.date}
                      className="rounded-2xl border border-white/20 bg-white/25 p-4 backdrop-blur-sm"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {format(new Date(day.date), 'MMM d')}
                      </p>
                      <div className={`mt-3 inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>
                        {status.icon}
                        {status.label}
                      </div>
                      {day.details && (
                        <p className="mt-3 text-xs text-muted-foreground">{day.details}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 p-4 md:hidden">
              {attendance.days.map((day) => {
                const status = STATUS_META[day.status];

                return (
                  <div
                    key={day.date}
                    className="rounded-2xl border border-white/20 bg-gradient-to-br from-white/40 via-white/20 to-transparent p-4 backdrop-blur-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {format(new Date(day.date), 'EEEE, MMM d')}
                        </p>
                        {day.details && (
                          <p className="mt-1 text-xs text-muted-foreground">{day.details}</p>
                        )}
                      </div>
                      <div className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>
                        {status.icon}
                        {status.label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </>
      ) : (
        <GlassCard variant="panel" padding="md">
          <p className="text-sm text-muted-foreground">Attendance data is not available right now.</p>
        </GlassCard>
      )}
    </div>
  );
}

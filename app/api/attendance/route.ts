import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { isAdmin } from '@/lib/auth-utils';
import { unstable_cache } from 'next/cache';

type AttendanceStatus = 'PRESENT' | 'LATE' | 'LEAVE' | 'ABSENT' | 'DAY_OFF';

interface AttendanceDay {
  date: string;
  status: AttendanceStatus;
  details?: string;
}

interface AttendanceData {
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
}

type AttendanceReport = {
  date: Date;
  status: 'DRAFT' | 'SUBMITTED';
  createdAt: Date;
  updatedAt: Date;
};

type AttendanceLeave = {
  startDate: Date;
  endDate: Date;
  reason: string;
};

type AttendanceShiftAssignment = {
  startDate: Date;
  endDate: Date;
  shift: {
    reportDeadline: string;
  };
};

async function calculateAttendance(
  userId: string,
  month: number,
  year: number
): Promise<AttendanceData> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  // Fetch user
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Fetch reports for the month
  const reports: AttendanceReport[] = await prisma.report.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      entries: true,
    },
  });

  // Fetch approved leaves for the month
  const approvedLeaves: AttendanceLeave[] = await prisma.leaveRequest.findMany({
    where: {
      userId,
      status: 'APPROVED',
      OR: [
        {
          startDate: { gte: startDate, lte: endDate },
        },
        {
          endDate: { gte: startDate, lte: endDate },
        },
        {
          startDate: { lte: startDate },
          endDate: { gte: endDate },
        },
      ],
    },
  });

  // Fetch shift assignments for the month
  const shiftAssignments: AttendanceShiftAssignment[] = await prisma.shiftAssignment.findMany({
    where: {
      userId,
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
    include: {
      shift: true,
    },
  });

  // Build attendance days
  const days: AttendanceDay[] = [];
  const daysInMonth = endDate.getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month - 1, day);
    const dateStr = currentDate.toISOString().split('T')[0];

    let status: AttendanceStatus = 'DAY_OFF';
    let details = '';

    // Check if there's a shift assignment for this day
    const shiftAssignment = shiftAssignments.find(
      (assignment) =>
        currentDate >= new Date(assignment.startDate) &&
        currentDate <= new Date(assignment.endDate)
    );

    // If no shift assignment, it's a day off
    if (!shiftAssignment) {
      days.push({ date: dateStr, status: 'DAY_OFF' });
      continue;
    }

    // Check if there's an approved leave
    const leave = approvedLeaves.find(
      (l) =>
        currentDate >= new Date(l.startDate) &&
        currentDate <= new Date(l.endDate)
    );

    if (leave) {
      status = 'LEAVE';
      details = leave.reason;
      days.push({ date: dateStr, status, details });
      continue;
    }

    // Check if there's a submitted report
    const report = reports.find((r) => {
      const reportDate = new Date(r.date);
      return reportDate.toDateString() === currentDate.toDateString();
    });

    if (!report) {
      status = 'ABSENT';
    } else if (report.status === 'SUBMITTED') {
      // Check if submitted after deadline
      const reportDeadline = shiftAssignment.shift.reportDeadline;
      const reportTime = report.updatedAt || report.createdAt;
      const reportDate = new Date(reportTime);
      
      // Parse the deadline time (HH:MM format)
      const [deadlineHours, deadlineMinutes] = reportDeadline.split(':').map(Number);
      const deadlineTime = new Date(reportDate);
      deadlineTime.setHours(deadlineHours, deadlineMinutes, 0, 0);

      if (reportDate > deadlineTime) {
        status = 'LATE';
        details = `Submitted at ${reportDate.toLocaleTimeString()}`;
      } else {
        status = 'PRESENT';
        details = `Submitted at ${reportDate.toLocaleTimeString()}`;
      }
    } else {
      status = 'ABSENT';
    }

    days.push({ date: dateStr, status, details });
  }

  // Calculate stats
  const stats = {
    present: days.filter((d) => d.status === 'PRESENT').length,
    late: days.filter((d) => d.status === 'LATE').length,
    absent: days.filter((d) => d.status === 'ABSENT').length,
    leave: days.filter((d) => d.status === 'LEAVE').length,
    dayOff: days.filter((d) => d.status === 'DAY_OFF').length,
  };

  const workingDays = stats.present + stats.late + stats.absent + stats.leave;
  const attendanceRate = workingDays > 0
    ? Math.round(((stats.present + stats.late) / workingDays) * 100)
    : 0;

  return {
    userId: user.id,
    userName: user.name,
    month,
    year,
    days,
    stats: {
      ...stats,
      attendanceRate,
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    // Admin can see any user's attendance, members can only see their own
    const targetUserId = isAdmin({ user: session.user })
      ? userId || session.user.id
      : session.user.id;

    // Cache the attendance calculation
    const cacheKey = `attendance-${targetUserId}-${month}-${year}`;
    const cached = unstable_cache(
      () => calculateAttendance(targetUserId, month, year),
      [cacheKey],
      { revalidate: 3600 } // Cache for 1 hour
    );

    const attendance = await cached();

    return NextResponse.json(attendance);
  } catch (error) {
    console.error('Get attendance error:', error);
    return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
  }
}

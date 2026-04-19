import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { isAdmin, isTeamLead } from '@/lib/auth-utils';

type UserSummary = {
  id: string;
  name: string;
};

type ReportSummary = {
  userId: string;
  date: Date;
};

type LeaveSummary = {
  userId: string;
  startDate: Date;
  endDate: Date;
};

type ShiftAssignmentSummary = {
  userId: string;
  startDate: Date;
  endDate: Date;
};

type ScoreEventSummary = {
  userId: string;
  deduction: number;
};

type EntrySummary = {
  type: 'TICKET' | 'CHAT';
};

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN and TEAM_LEAD can access analytics
    if (!isAdmin(session) && !isTeamLead(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Get all users
    const users: UserSummary[] = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    // KPI 1: Total Reports Submitted
    const totalReports = await prisma.report.count({
      where: {
        status: 'SUBMITTED',
        date: {
          gte: start,
          lte: end,
        },
      },
    });

    // KPI 2: Team Attendance Rate
    const reports: ReportSummary[] = await prisma.report.findMany({
      where: {
        status: 'SUBMITTED',
        date: {
          gte: start,
          lte: end,
        },
      },
      select: {
        userId: true,
        date: true,
      },
    });

    const approvedLeaves: LeaveSummary[] = await prisma.leaveRequest.findMany({
      where: {
        status: 'APPROVED',
        OR: [
          { startDate: { gte: start, lte: end } },
          { endDate: { gte: start, lte: end } },
          { startDate: { lte: start }, endDate: { gte: end } },
        ],
      },
      select: {
        userId: true,
        startDate: true,
        endDate: true,
      },
    });

    const shiftAssignments: ShiftAssignmentSummary[] = await prisma.shiftAssignment.findMany({
      where: {
        startDate: { lte: end },
        endDate: { gte: start },
      },
      select: {
        userId: true,
        startDate: true,
        endDate: true,
      },
    });

    // Calculate attendance
    let totalWorkingDays = 0;
    let presentDays = 0;

    users.forEach((user) => {
      const userShifts = shiftAssignments.filter((sa) => sa.userId === user.id);
      const userReports = reports.filter((r) => r.userId === user.id);
      const userLeaves = approvedLeaves.filter((l) => l.userId === user.id);

      userShifts.forEach((shift) => {
        const shiftStart = new Date(shift.startDate);
        const shiftEnd = new Date(shift.endDate);
        const rangeStart = shiftStart < start ? start : shiftStart;
        const rangeEnd = shiftEnd > end ? end : shiftEnd;

        const daysInRange = Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        totalWorkingDays += daysInRange;

        for (let d = 0; d < daysInRange; d++) {
          const currentDate = new Date(rangeStart);
          currentDate.setDate(currentDate.getDate() + d);
          const dateStr = currentDate.toISOString().split('T')[0];

          const hasReport = userReports.some((r) => r.date.toISOString().split('T')[0] === dateStr);
          const onLeave = userLeaves.some(
            (l) => currentDate >= new Date(l.startDate) && currentDate <= new Date(l.endDate)
          );

          if (hasReport || onLeave) {
            presentDays++;
          }
        }
      });
    });

    const attendanceRate = totalWorkingDays > 0 ? Math.round((presentDays / totalWorkingDays) * 100) : 0;

    // KPI 3: Average QA Score
    const scoreEvents: ScoreEventSummary[] = await prisma.scoreEvent.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        userId: true,
        deduction: true,
      },
    });

    const userScores = new Map<string, number>();
    scoreEvents.forEach((event) => {
      const current = userScores.get(event.userId) || 0;
      userScores.set(event.userId, current + event.deduction);
    });

    const totalScore = Array.from(userScores.values()).reduce(
      (sum, deduction) => sum + Math.max(0, 100 - deduction),
      0
    );
    const avgScore = userScores.size > 0 ? Math.round(totalScore / userScores.size) : 100;

    // KPI 4: Total Score Deductions
    const totalDeductions = scoreEvents.reduce((sum, event) => sum + event.deduction, 0);

    // KPI 5: Pending Leave Requests
    const pendingLeaves = await prisma.leaveRequest.count({
      where: {
        status: 'PENDING',
      },
    });

    // KPI 6: Active Team Members
    const activeMembers = users.length;

    // Daily Reports Chart Data
    const dailyReports: { date: string; count: number }[] = [];
    const dateMap = new Map<string, number>();

    reports.forEach((report) => {
      const dateStr = report.date.toISOString().split('T')[0];
      dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + 1);
    });

    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    for (let i = 0; i <= daysDiff; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      dailyReports.push({
        date: dateStr,
        count: dateMap.get(dateStr) || 0,
      });
    }

    // Attendance Breakdown Chart Data
    const attendanceBreakdown = users.map((user) => {
      const userShifts = shiftAssignments.filter((sa) => sa.userId === user.id);
      const userReports = reports.filter((r) => r.userId === user.id);
      const userLeaves = approvedLeaves.filter((l) => l.userId === user.id);

      let present = 0;
      const late = 0;
      let absent = 0;
      let leave = 0;

      userShifts.forEach((shift) => {
        const shiftStart = new Date(shift.startDate);
        const shiftEnd = new Date(shift.endDate);
        const rangeStart = shiftStart < start ? start : shiftStart;
        const rangeEnd = shiftEnd > end ? end : shiftEnd;

        const daysInRange = Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        for (let d = 0; d < daysInRange; d++) {
          const currentDate = new Date(rangeStart);
          currentDate.setDate(currentDate.getDate() + d);
          const dateStr = currentDate.toISOString().split('T')[0];

          const report = userReports.find((r) => r.date.toISOString().split('T')[0] === dateStr);
          const onLeave = userLeaves.some(
            (l) => currentDate >= new Date(l.startDate) && currentDate <= new Date(l.endDate)
          );

          if (onLeave) {
            leave++;
          } else if (report) {
            present++;
          } else {
            absent++;
          }
        }
      });

      return {
        name: user.name,
        present,
        late,
        absent,
        leave,
      };
    });

    // QA Score Trend (weekly averages)
    const weeklyScoreTrend: { week: string; avgScore: number }[] = [];
    const weeksMap = new Map<string, { totalScore: number; count: number }>();

    const weeksInRange = Math.ceil(daysDiff / 7);
    for (let w = 0; w <= weeksInRange; w++) {
      const weekStart = new Date(start);
      weekStart.setDate(weekStart.getDate() + w * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const weekKey = `${weekStart.toISOString().split('T')[0]}`;
      weeksMap.set(weekKey, { totalScore: 0, count: 0 });
    }

    users.forEach((user) => {
      const userDeductions = scoreEvents
        .filter((event) => event.userId === user.id)
        .reduce((sum, event) => sum + event.deduction, 0);
      const userScore = Math.max(0, 100 - userDeductions);

      weeksMap.forEach((value) => {
        value.totalScore += userScore;
        value.count++;
      });
    });

    weeksMap.forEach((value, weekKey) => {
      weeklyScoreTrend.push({
        week: weekKey,
        avgScore: value.count > 0 ? Math.round(value.totalScore / value.count) : 100,
      });
    });

    // Entry Type Distribution
    const entries: EntrySummary[] = await prisma.reportEntry.findMany({
      where: {
        report: {
          date: {
            gte: start,
            lte: end,
          },
        },
      },
      select: {
        type: true,
      },
    });

    const tickets = entries.filter((e) => e.type === 'TICKET').length;
    const chats = entries.filter((e) => e.type === 'CHAT').length;

    // Member Leaderboard
    const leaderboard = users.map((user) => {
      const userReportsCount = reports.filter((r) => r.userId === user.id).length;
      const userDeductions = scoreEvents
        .filter((event) => event.userId === user.id)
        .reduce((sum, event) => sum + event.deduction, 0);
      const userScore = Math.max(0, 100 - userDeductions);

      // Calculate user attendance rate
      const userShifts = shiftAssignments.filter((sa) => sa.userId === user.id);
      const userReports = reports.filter((r) => r.userId === user.id);
      const userLeaves = approvedLeaves.filter((l) => l.userId === user.id);

      let userWorkingDays = 0;
      let userPresentDays = 0;

      userShifts.forEach((shift) => {
        const shiftStart = new Date(shift.startDate);
        const shiftEnd = new Date(shift.endDate);
        const rangeStart = shiftStart < start ? start : shiftStart;
        const rangeEnd = shiftEnd > end ? end : shiftEnd;

        const daysInRange = Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        userWorkingDays += daysInRange;

        for (let d = 0; d < daysInRange; d++) {
          const currentDate = new Date(rangeStart);
          currentDate.setDate(currentDate.getDate() + d);
          const dateStr = currentDate.toISOString().split('T')[0];

          const hasReport = userReports.some((r) => r.date.toISOString().split('T')[0] === dateStr);
          const onLeave = userLeaves.some(
            (l) => currentDate >= new Date(l.startDate) && currentDate <= new Date(l.endDate)
          );

          if (hasReport || onLeave) {
            userPresentDays++;
          }
        }
      });

      const userAttendanceRate = userWorkingDays > 0 ? Math.round((userPresentDays / userWorkingDays) * 100) : 0;

      return {
        name: user.name,
        reports: userReportsCount,
        avgScore: userScore,
        deductions: userDeductions,
        attendanceRate: userAttendanceRate,
      };
    }).sort((a, b) => b.avgScore - a.avgScore);

    return NextResponse.json({
      kpi: {
        totalReports,
        attendanceRate,
        avgScore,
        totalDeductions,
        pendingLeaves,
        activeMembers,
      },
      dailyReports,
      attendanceBreakdown,
      weeklyScoreTrend,
      entryDistribution: {
        tickets,
        chats,
      },
      leaderboard,
    });
  } catch (error) {
    console.error('Analytics summary error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics summary' }, { status: 500 });
  }
}

type MetricUser = {
  id: string;
  name: string;
};

type MetricReport = {
  id: string;
  userId: string;
  date: Date;
  status: 'DRAFT' | 'SUBMITTED';
  submittedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type MetricLeave = {
  userId: string;
  startDate: Date;
  endDate: Date;
};

type MetricShiftAssignment = {
  userId: string;
  startDate: Date;
  endDate: Date | null;
  shift: {
    reportDeadline: string;
  };
};

type MetricScoreEvent = {
  userId: string;
  reportId: string | null;
  deduction: number;
  createdAt: Date;
};

export type AttendanceSummary = {
  userId: string;
  name: string;
  present: number;
  late: number;
  absent: number;
  leave: number;
  dayOff: number;
  attendanceRate: number;
};

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function toDateKey(date: Date) {
  return startOfDay(date).toISOString().split('T')[0];
}

function eachDayInRange(start: Date, end: Date) {
  const days: Date[] = [];
  const current = startOfDay(start);
  const finalDay = startOfDay(end);

  while (current <= finalDay) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return days;
}

function getSubmissionTime(report: MetricReport) {
  return report.submittedAt ?? report.updatedAt ?? report.createdAt;
}

function isLateSubmission(report: MetricReport, reportDeadline: string) {
  const [hours, minutes] = reportDeadline.split(':').map(Number);
  const deadline = startOfDay(report.date);

  deadline.setHours(hours || 0, minutes || 0, 0, 0);

  return getSubmissionTime(report) > deadline;
}

export function getDateRangeBounds(start: Date, end: Date) {
  return {
    start: startOfDay(start),
    end: endOfDay(end),
  };
}

export function buildReportScoreMap<T extends Pick<MetricScoreEvent, 'reportId' | 'deduction'>>(
  scoreEvents: T[]
) {
  const scoreMap = new Map<string, number>();

  for (const event of scoreEvents) {
    if (!event.reportId) continue;

    scoreMap.set(event.reportId, (scoreMap.get(event.reportId) ?? 0) + event.deduction);
  }

  return scoreMap;
}

export function getReportScore(
  reportId: string,
  scoreMap: Map<string, number>
) {
  return Math.max(0, 100 - (scoreMap.get(reportId) ?? 0));
}

export function calculateAverageScore(scores: number[]) {
  if (scores.length === 0) return 0;

  return Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1));
}

export function calculateAttendanceSummaries({
  users,
  reports,
  approvedLeaves,
  shiftAssignments,
  start,
  end,
}: {
  users: MetricUser[];
  reports: MetricReport[];
  approvedLeaves: MetricLeave[];
  shiftAssignments: MetricShiftAssignment[];
  start: Date;
  end: Date;
}) {
  const dayKeys = eachDayInRange(start, end);
  const reportMap = new Map<string, MetricReport>();

  for (const report of reports) {
    if (report.status !== 'SUBMITTED') continue;
    reportMap.set(`${report.userId}:${toDateKey(report.date)}`, report);
  }

  const userLeaves = new Map<string, MetricLeave[]>();
  const userShifts = new Map<string, MetricShiftAssignment[]>();

  for (const leave of approvedLeaves) {
    const entries = userLeaves.get(leave.userId) ?? [];
    entries.push(leave);
    userLeaves.set(leave.userId, entries);
  }

  for (const shiftAssignment of shiftAssignments) {
    const entries = userShifts.get(shiftAssignment.userId) ?? [];
    entries.push(shiftAssignment);
    userShifts.set(shiftAssignment.userId, entries);
  }

  const summaries = users.map((user) => {
    const summary: AttendanceSummary = {
      userId: user.id,
      name: user.name,
      present: 0,
      late: 0,
      absent: 0,
      leave: 0,
      dayOff: 0,
      attendanceRate: 0,
    };

    const leaves = userLeaves.get(user.id) ?? [];
    const shifts = userShifts.get(user.id) ?? [];

    for (const day of dayKeys) {
      const activeShift = shifts.find((assignment) => {
        const shiftStart = startOfDay(assignment.startDate);
        const shiftEnd = assignment.endDate ? startOfDay(assignment.endDate) : startOfDay(end);

        return day >= shiftStart && day <= shiftEnd;
      });

      if (!activeShift) {
        summary.dayOff++;
        continue;
      }

      const onLeave = leaves.some((leave) => {
        const leaveStart = startOfDay(leave.startDate);
        const leaveEnd = startOfDay(leave.endDate);

        return day >= leaveStart && day <= leaveEnd;
      });

      if (onLeave) {
        summary.leave++;
        continue;
      }

      const report = reportMap.get(`${user.id}:${toDateKey(day)}`);

      if (!report) {
        summary.absent++;
        continue;
      }

      if (isLateSubmission(report, activeShift.shift.reportDeadline)) {
        summary.late++;
      } else {
        summary.present++;
      }
    }

    const workingDays = summary.present + summary.late + summary.absent + summary.leave;
    summary.attendanceRate =
      workingDays > 0
        ? Math.round(((summary.present + summary.late) / workingDays) * 100)
        : 0;

    return summary;
  });

  const totalWorkingDays = summaries.reduce(
    (sum, summary) => sum + summary.present + summary.late + summary.absent + summary.leave,
    0
  );
  const totalAttendedDays = summaries.reduce(
    (sum, summary) => sum + summary.present + summary.late,
    0
  );

  return {
    summaries,
    overallAttendanceRate:
      totalWorkingDays > 0 ? Math.round((totalAttendedDays / totalWorkingDays) * 100) : 0,
  };
}

export function buildWeeklyScoreTrend<T extends Pick<MetricReport, 'id' | 'date'>>({
  reports,
  scoreMap,
  start,
  end,
}: {
  reports: T[];
  scoreMap: Map<string, number>;
  start: Date;
  end: Date;
}) {
  const rangeStart = startOfDay(start);
  const rangeEnd = startOfDay(end);
  const buckets: Array<{ week: string; avgScore: number }> = [];
  const bucketValues: Array<{ total: number; count: number }> = [];
  const cursor = new Date(rangeStart);

  while (cursor <= rangeEnd) {
    buckets.push({ week: toDateKey(cursor), avgScore: 0 });
    bucketValues.push({ total: 0, count: 0 });
    cursor.setDate(cursor.getDate() + 7);
  }

  for (const report of reports) {
    const diffDays = Math.floor(
      (startOfDay(report.date).getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)
    );

    const bucketIndex = Math.max(0, Math.min(bucketValues.length - 1, Math.floor(diffDays / 7)));
    bucketValues[bucketIndex].total += getReportScore(report.id, scoreMap);
    bucketValues[bucketIndex].count += 1;
  }

  return buckets.map((bucket, index) => ({
    week: bucket.week,
    avgScore:
      bucketValues[index].count > 0
        ? Number((bucketValues[index].total / bucketValues[index].count).toFixed(1))
        : 0,
  }));
}

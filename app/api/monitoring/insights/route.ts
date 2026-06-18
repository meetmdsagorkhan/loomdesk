import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { startOfDay, endOfDay, subDays } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "TEAM_LEAD")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const trailing24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get all presence events in the last 24 hours
    const events = await prisma.presenceEvent.findMany({
      where: { timestamp: { gte: trailing24h } },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    // Calculate Active / Idle / Away ratios
    const totalEvents = events.length || 1;
    const activeCount = events.filter(e => e.state === "Active" || e.state === "Present").length;
    const idleCount = events.filter(e => e.state === "Idle").length;
    const awayCount = events.filter(e => e.state === "Away From Desk").length;
    const cameraBlockedCount = events.filter(e => e.state === "Camera Blocked").length;
    const errorCount = events.filter(e => e.state === "Monitoring Error").length;

    const activePercentage = Math.round((activeCount / totalEvents) * 100);
    const idlePercentage = Math.round((idleCount / totalEvents) * 100);
    const awayPercentage = Math.round((awayCount / totalEvents) * 100);

    // Attendance Rate: How many users are active today out of total members
    const totalMembers = await prisma.user.count({ where: { role: "MEMBER", isActive: true } });
    const onlineTodayCount = await prisma.presenceEvent.groupBy({
      by: ["userId"],
      where: { timestamp: { gte: todayStart } },
    });
    const attendanceRate = totalMembers > 0 ? Math.min(100, Math.round((onlineTodayCount.length / totalMembers) * 100)) : 100;

    // Presence Compliance Score: (Active + Present + Idle) / total events
    const complianceEvents = events.filter(e => ["Active", "Present", "Idle"].includes(e.state)).length;
    const presenceComplianceScore = Math.round((complianceEvents / totalEvents) * 100);

    // Monitoring Compliance Score: events without monitoring error or blocked camera
    const cleanMonitoringEvents = events.filter(e => !["Camera Blocked", "Monitoring Error"].includes(e.state)).length;
    const monitoringComplianceScore = Math.round((cleanMonitoringEvents / totalEvents) * 100);

    // Workforce Heatmap: Average activity per hour of the day (0-23)
    const hourlyActivity = Array.from({ length: 24 }, (_, hour) => {
      const hourEvents = events.filter(e => new Date(e.timestamp).getHours() === hour);
      const hourTotal = hourEvents.length || 1;
      const hourActive = hourEvents.filter(e => e.state === "Active" || e.state === "Present").length;
      return {
        hour: `${hour}:00`,
        activePercentage: Math.round((hourActive / hourTotal) * 100),
        eventCount: hourEvents.length,
      };
    });

    // Identify Manager Insights / Recommendations:
    // 1. Frequently Away (Away events count >= 5)
    // 2. Frequently Idle (Idle events count >= 5)
    // 3. Camera issues (Blocked or Error events count >= 2)
    const userAggregates: Record<string, { name: string; email: string; away: number; idle: number; issues: number; total: number }> = {};

    events.forEach(e => {
      if (!userAggregates[e.userId]) {
        userAggregates[e.userId] = {
          name: e.user.name,
          email: e.user.email,
          away: 0,
          idle: 0,
          issues: 0,
          total: 0,
        };
      }
      userAggregates[e.userId].total++;
      if (e.state === "Away From Desk") userAggregates[e.userId].away++;
      if (e.state === "Idle") userAggregates[e.userId].idle++;
      if (["Camera Blocked", "Monitoring Error"].includes(e.state)) userAggregates[e.userId].issues++;
    });

    const frequentlyAway = Object.values(userAggregates)
      .filter(u => u.away >= 3)
      .map(u => ({ name: u.name, email: u.email, count: u.away }));

    const frequentlyIdle = Object.values(userAggregates)
      .filter(u => u.idle >= 4)
      .map(u => ({ name: u.name, email: u.email, count: u.idle }));

    const cameraIssues = Object.values(userAggregates)
      .filter(u => u.issues >= 2)
      .map(u => ({ name: u.name, email: u.email, count: u.issues }));

    // High performers: users with high total events and > 80% active
    const highPerformers = Object.values(userAggregates)
      .filter(u => u.total > 5 && Math.round(((u.total - u.away - u.idle - u.issues) / u.total) * 100) >= 80)
      .map(u => ({
        name: u.name,
        email: u.email,
        score: Math.round(((u.total - u.away - u.idle - u.issues) / u.total) * 100),
      }));

    return NextResponse.json({
      health: {
        activePercentage,
        idlePercentage,
        awayPercentage,
        attendanceRate,
        presenceComplianceScore,
        monitoringComplianceScore,
        averageSessionLengthMinutes: 420, // baseline estimate or derived if database timeEntry is populated
      },
      heatmap: hourlyActivity,
      insights: {
        frequentlyAway,
        frequentlyIdle,
        cameraIssues,
        highPerformers,
      },
    });
  } catch (error) {
    console.error("Fetch insights error:", error);
    return NextResponse.json({ error: "Failed to generate insights" }, { status: 500 });
  }
}

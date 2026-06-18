import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "TEAM_LEAD")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get("query") || "";
    const actionFilter = searchParams.get("action") || "";
    const limit = parseInt(searchParams.get("limit") || "100");

    // Filter by monitoring actions
    const monitoringActions = [
      "auth.login",
      "auth.logout",
      "monitoring.camera_start",
      "monitoring.camera_stop",
      "monitoring.screenshot_capture",
      "monitoring.recording_start",
      "monitoring.recording_pause",
      "monitoring.recording_resume",
      "monitoring.recording_stop",
      "monitoring.alert_generated",
      "monitoring.alert_acknowledged",
      "monitoring.alert_resolved",
      "monitoring.presence_change",
    ];

    const whereClause: any = {
      action: { in: actionFilter ? [actionFilter] : monitoringActions },
    };

    if (searchQuery) {
      whereClause.OR = [
        { actorEmail: { contains: searchQuery, mode: "insensitive" } },
        { targetEmail: { contains: searchQuery, mode: "insensitive" } },
        { action: { contains: searchQuery, mode: "insensitive" } },
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Fetch monitoring audit logs error:", error);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}

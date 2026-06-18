import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { auditEvent } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

// GET /api/monitoring/screenshots - Fetch screenshot captures (Admins only)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "TEAM_LEAD")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const date = searchParams.get("date");

    const whereClause: any = {};
    if (userId) {
      whereClause.userId = userId;
    }
    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      whereClause.timestamp = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const screenshots = await prisma.monitoringScreenshot.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, email: true } },
        capturedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { timestamp: "desc" },
    });

    return NextResponse.json({ screenshots });
  } catch (error) {
    console.error("Fetch screenshots error:", error);
    return NextResponse.json({ error: "Failed to fetch screenshots history" }, { status: 500 });
  }
}

// POST /api/monitoring/screenshots - Save a screenshot taken by the client
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, imageUrl, reason } = await request.json();

    if (!userId || !imageUrl || !reason) {
      return NextResponse.json({ error: "Missing required fields (userId, imageUrl, reason)" }, { status: 400 });
    }

    // Only allow managers/admins to trigger and log screenshot captures, 
    // OR allow the employee's own background system to submit it if initiated by the client.
    // In our case, the capture command is initiated by the admin via signaling, 
    // and the employee's client uploads it back.
    // Thus, capturedById is the admin who requested it. If the employee background agent does it on a schedule, capturedById can be 'system'.
    const capturedById = session.user.role === "ADMIN" || session.user.role === "TEAM_LEAD" 
      ? session.user.id 
      : "system"; // system scheduled

    // Save screenshot
    const screenshot = await prisma.monitoringScreenshot.create({
      data: {
        userId,
        imageUrl,
        reason,
        capturedById: capturedById === "system" ? userId : capturedById, // fallback to avoid invalid foreign key if no system user exists
      },
    });

    // Audit the action
    auditEvent({
      action: "monitoring.screenshot_capture",
      status: "success",
      actorId: capturedById,
      actorEmail: capturedById === "system" ? "system@loomdesk.online" : (session.user.email || undefined),
      actorRole: capturedById === "system" ? "system" : session.user.role,
      targetType: "User",
      targetId: userId,
      metadata: { reason, screenshotId: screenshot.id },
    });

    return NextResponse.json({ screenshot });
  } catch (error) {
    console.error("Save monitoring screenshot error:", error);
    return NextResponse.json({ error: "Failed to save screenshot" }, { status: 500 });
  }
}

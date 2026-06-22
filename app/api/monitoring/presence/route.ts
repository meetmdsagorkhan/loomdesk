import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { auditEvent } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

// GET /api/monitoring/presence - Admins can view current presence status of all users
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "TEAM_LEAD")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (userId) {
      // Return history for specific user
      const history = await prisma.presenceEvent.findMany({
        where: { userId },
        orderBy: { timestamp: "desc" },
        take: limit,
      });
      return NextResponse.json({ history });
    }

    // Get current/latest presence event for each monitored user
    // Include both MEMBER and TEAM_LEAD roles (team leads can also be monitored)
    const users = await prisma.user.findMany({
      where: { role: { in: ["MEMBER", "TEAM_LEAD"] } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        position: true,
        presenceEvents: {
          orderBy: { timestamp: "desc" },
          take: 1,
        },
        complianceAlerts: {
          where: { status: "PENDING" },
          select: { id: true, type: true, severity: true },
        },
      },
    });

    // Presence events older than 15 minutes are considered stale → treat as Offline
    const PRESENCE_STALE_MS = 15 * 60 * 1000;
    const now = Date.now();

    const presenceList = users.map(u => {
      const latestEvent = u.presenceEvents[0] || null;
      const isStale =
        !latestEvent ||
        now - new Date(latestEvent.timestamp).getTime() > PRESENCE_STALE_MS;

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        department: u.department,
        position: u.position,
        // If the latest event is stale, override state to Offline so admin sees correct status
        currentPresence: isStale
          ? (latestEvent ? { ...latestEvent, state: "Offline" } : null)
          : latestEvent,
        pendingAlerts: u.complianceAlerts,
      };
    });

    return NextResponse.json({ presence: presenceList });
  } catch (error) {
    console.error("Fetch presence status error:", error);
    return NextResponse.json({ error: "Failed to fetch presence data" }, { status: 500 });
  }
}

// POST /api/monitoring/presence - Employees send status updates
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { state, metadata } = await request.json();

    const validStates = [
      "Active",
      "Present",
      "Idle",
      "Away From Desk",
      "Camera Blocked",
      "Multiple People Detected",
      "Monitoring Error",
      "Offline"
    ];

    if (!state || !validStates.includes(state)) {
      return NextResponse.json({ error: "Invalid presence state" }, { status: 400 });
    }

    // Create the presence event
    const event = await prisma.presenceEvent.create({
      data: {
        userId: session.user.id,
        state,
        metadata: metadata || {},
      },
    });

    // Check if this presence state is a compliance violation
    let alertType: string | null = null;
    let severity = "LOW";

    if (state === "Camera Blocked") {
      alertType = "camera_blocked";
      severity = "HIGH";
    } else if (state === "Multiple People Detected") {
      alertType = "multiple_faces";
      severity = "CRITICAL";
    } else if (state === "Monitoring Error") {
      alertType = "camera_disconnected";
      severity = "MEDIUM";
    }

    if (alertType) {
      // Check if there's already a pending alert of this type in the last 15 minutes to avoid duplicates
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      const existingAlert = await prisma.complianceAlert.findFirst({
        where: {
          userId: session.user.id,
          type: alertType,
          status: "PENDING",
          createdAt: { gte: fifteenMinutesAgo },
        },
      });

      if (!existingAlert) {
        await prisma.complianceAlert.create({
          data: {
            userId: session.user.id,
            type: alertType,
            severity,
            status: "PENDING",
          },
        });

        // Audit the alert trigger
        auditEvent({
          action: "monitoring.alert_generated",
          status: "success",
          actorId: "system",
          actorEmail: "system@loomdesk.online",
          actorRole: "system",
          targetType: "User",
          targetId: session.user.id,
          targetEmail: session.user.email || undefined,
          metadata: { alertType, severity, presenceState: state },
        });
      }
    }

    // If state changes, audit it
    auditEvent({
      action: "monitoring.presence_change",
      status: "success",
      actorId: session.user.id,
      actorEmail: session.user.email || undefined,
      actorRole: session.user.role,
      metadata: { state, metadata },
    });

    return NextResponse.json({ event });
  } catch (error) {
    console.error("Save presence state error:", error);
    return NextResponse.json({ error: "Failed to save presence state" }, { status: 500 });
  }
}

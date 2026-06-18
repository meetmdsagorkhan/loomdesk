import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { auditEvent } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

// GET /api/monitoring/recordings - List recording logs (Admins only)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "TEAM_LEAD")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const whereClause: any = {};
    if (userId) {
      whereClause.userId = userId;
    }

    const recordings = await prisma.recordingSession.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, email: true } },
        admin: { select: { id: true, name: true, email: true } },
      },
      orderBy: { startTime: "desc" },
    });

    return NextResponse.json({ recordings });
  } catch (error) {
    console.error("Fetch recordings error:", error);
    return NextResponse.json({ error: "Failed to fetch recording sessions" }, { status: 500 });
  }
}

// POST /api/monitoring/recordings - Start, pause, resume, or stop a recording session
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "TEAM_LEAD")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { action, userId, reason, recordingId } = await request.json();

    if (!action) {
      return NextResponse.json({ error: "Missing action parameter" }, { status: 400 });
    }

    const adminId = session.user.id;

    if (action === "START") {
      if (!userId || !reason) {
        return NextResponse.json({ error: "userId and reason are required to start a recording" }, { status: 400 });
      }

      // Create new recording session in DB
      const recording = await prisma.recordingSession.create({
        data: {
          userId,
          adminId,
          reason,
          status: "RECORDING",
          startTime: new Date(),
        },
      });

      // Audit log
      auditEvent({
        action: "monitoring.recording_start",
        status: "success",
        actorId: adminId,
        actorEmail: session.user.email || undefined,
        actorRole: session.user.role,
        targetType: "User",
        targetId: userId,
        metadata: { recordingId: recording.id, reason },
      });

      return NextResponse.json({ recording });
    }

    // For updates, we need an active recording ID
    if (!recordingId) {
      return NextResponse.json({ error: "recordingId is required for updates" }, { status: 400 });
    }

    const existingSession = await prisma.recordingSession.findUnique({
      where: { id: recordingId },
    });

    if (!existingSession) {
      return NextResponse.json({ error: "Recording session not found" }, { status: 404 });
    }

    if (action === "PAUSE") {
      const recording = await prisma.recordingSession.update({
        where: { id: recordingId },
        data: { status: "PAUSED" },
      });

      auditEvent({
        action: "monitoring.recording_pause",
        status: "success",
        actorId: adminId,
        actorEmail: session.user.email || undefined,
        actorRole: session.user.role,
        targetType: "RecordingSession",
        targetId: recordingId,
      });

      return NextResponse.json({ recording });
    }

    if (action === "RESUME") {
      const recording = await prisma.recordingSession.update({
        where: { id: recordingId },
        data: { status: "RECORDING" },
      });

      auditEvent({
        action: "monitoring.recording_resume",
        status: "success",
        actorId: adminId,
        actorEmail: session.user.email || undefined,
        actorRole: session.user.role,
        targetType: "RecordingSession",
        targetId: recordingId,
      });

      return NextResponse.json({ recording });
    }

    if (action === "STOP") {
      const endTime = new Date();
      const startTime = new Date(existingSession.startTime);
      const durationSeconds = Math.max(0, Math.floor((endTime.getTime() - startTime.getTime()) / 1000));

      const recording = await prisma.recordingSession.update({
        where: { id: recordingId },
        data: {
          status: "COMPLETED",
          endTime,
          duration: durationSeconds,
        },
      });

      auditEvent({
        action: "monitoring.recording_stop",
        status: "success",
        actorId: adminId,
        actorEmail: session.user.email || undefined,
        actorRole: session.user.role,
        targetType: "User",
        targetId: existingSession.userId,
        metadata: { recordingId, durationSeconds },
      });

      return NextResponse.json({ recording });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Update recording error:", error);
    return NextResponse.json({ error: "Failed to update recording session" }, { status: 500 });
  }
}

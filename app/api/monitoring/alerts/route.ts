import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { auditEvent } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

// GET /api/monitoring/alerts - Retrieve alerts history
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "TEAM_LEAD")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const status = searchParams.get("status"); // PENDING, ACKNOWLEDGED, RESOLVED
    const severity = searchParams.get("severity"); // LOW, MEDIUM, HIGH, CRITICAL

    const whereClause: any = {};
    if (userId) whereClause.userId = userId;
    if (status) whereClause.status = status;
    if (severity) whereClause.severity = severity;

    const alerts = await prisma.complianceAlert.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, email: true } },
        acknowledgedBy: { select: { id: true, name: true, email: true } },
        resolvedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error("Fetch alerts error:", error);
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 });
  }
}

// PATCH /api/monitoring/alerts - Acknowledge or Resolve an alert
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "TEAM_LEAD")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { alertId, status } = await request.json();

    if (!alertId || !status || !["ACKNOWLEDGED", "RESOLVED"].includes(status)) {
      return NextResponse.json({ error: "Invalid parameters (alertId, status: ACKNOWLEDGED | RESOLVED required)" }, { status: 400 });
    }

    const adminId = session.user.id;
    const updateData: any = { status };

    if (status === "ACKNOWLEDGED") {
      updateData.acknowledgedById = adminId;
      updateData.acknowledgedAt = new Date();
    } else if (status === "RESOLVED") {
      updateData.resolvedById = adminId;
      updateData.resolvedAt = new Date();
    }

    const alert = await prisma.complianceAlert.update({
      where: { id: alertId },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    auditEvent({
      action: `monitoring.alert_${status.toLowerCase()}`,
      status: "success",
      actorId: adminId,
      actorEmail: session.user.email || undefined,
      actorRole: session.user.role,
      targetType: "ComplianceAlert",
      targetId: alertId,
      metadata: { employeeId: alert.userId, status },
    });

    return NextResponse.json({ alert });
  } catch (error) {
    console.error("Update alert error:", error);
    return NextResponse.json({ error: "Failed to update alert" }, { status: 500 });
  }
}

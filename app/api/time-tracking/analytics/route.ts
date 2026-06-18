import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { startOfMonth, endOfMonth } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get("userId");
    
    // Authorization check
    if (requestedUserId && requestedUserId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const targetUserId = requestedUserId || session.user.id;

    const monthStr = searchParams.get("month"); // Format: YYYY-MM
    let startDate, endDate;
    if (monthStr) {
      const date = new Date(`${monthStr}-01`);
      startDate = startOfMonth(date);
      endDate = endOfMonth(date);
    } else {
      const now = new Date();
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
    }

    // If ADMIN asks for all users (no targetUserId specified in UI context where targetUserId="ALL")
    // Let's assume if targetUserId === "ALL", we return all. 
    // Wait, let's keep it simple: targetUserId is a specific user or session user.
    if (requestedUserId === "ALL" && session.user.role === "ADMIN") {
      const allEntries = await prisma.timeEntry.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          shift: true,
        },
        orderBy: { date: "desc" },
      });
      return NextResponse.json({ entries: allEntries });
    }

    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        userId: targetUserId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        shift: true,
        notes: true,
      },
      orderBy: { date: "desc" },
    });

    // We can compute shift adherence on the frontend or backend.
    // Let's send the raw entries, the frontend Calendar View will color code based on totalMinutes vs Shift duration.
    
    return NextResponse.json({ timeEntries });
  } catch (error) {
    console.error("Analytics GET error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}

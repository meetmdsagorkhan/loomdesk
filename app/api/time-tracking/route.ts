import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { startOfDay } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the active time entry for today
    const today = startOfDay(new Date());
    const timeEntry = await prisma.timeEntry.findFirst({
      where: {
        userId: session.user.id,
        date: today,
        status: { in: ["ACTIVE", "ON_BREAK"] },
      },
      include: {
        breaks: {
          where: { endTime: null },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ timeEntry });
  } catch (error) {
    console.error("Time tracking GET error:", error);
    return NextResponse.json({ error: "Failed to fetch time tracking status" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = startOfDay(new Date());

    // Check if already checked in today
    const existingEntry = await prisma.timeEntry.findFirst({
      where: {
        userId: session.user.id,
        date: today,
        status: { in: ["ACTIVE", "ON_BREAK"] },
      },
    });

    if (existingEntry) {
      return NextResponse.json({ error: "Already checked in" }, { status: 400 });
    }

    // Get current shift assignment
    const shiftAssignment = await prisma.shiftAssignment.findFirst({
      where: {
        userId: session.user.id,
        startDate: { lte: today },
        OR: [{ endDate: null }, { endDate: { gte: today } }],
      },
    });

    const timeEntry = await prisma.timeEntry.create({
      data: {
        userId: session.user.id,
        shiftId: shiftAssignment?.shiftId,
        date: today,
        checkInTime: new Date(),
        status: "ACTIVE",
      },
    });

    return NextResponse.json({ timeEntry });
  } catch (error) {
    console.error("Time tracking POST error:", error);
    return NextResponse.json({ error: "Failed to check in" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { note } = await request.json();

    if (!note || note.trim().length === 0) {
      return NextResponse.json({ error: "Checkout note is mandatory" }, { status: 400 });
    }

    const today = startOfDay(new Date());
    const activeEntry = await prisma.timeEntry.findFirst({
      where: {
        userId: session.user.id,
        date: today,
        status: { in: ["ACTIVE", "ON_BREAK"] },
      },
      include: {
        breaks: true,
      },
    });

    if (!activeEntry) {
      return NextResponse.json({ error: "No active check-in found" }, { status: 400 });
    }

    const now = new Date();
    
    // Close any active breaks
    const activeBreak = activeEntry.breaks.find((b: any) => !b.endTime);
    if (activeBreak) {
      const breakDuration = Math.round((now.getTime() - activeBreak.startTime.getTime()) / 60000);
      await prisma.break.update({
        where: { id: activeBreak.id },
        data: { endTime: now, duration: breakDuration },
      });
    }

    // Calculate total minutes (excluding breaks)
    // First get updated breaks
    const updatedBreaks = await prisma.break.findMany({
      where: { timeEntryId: activeEntry.id },
    });
    
    const totalBreakMinutes = updatedBreaks.reduce((acc: number, b: any) => acc + (b.duration || 0), 0);
    const totalDurationMinutes = Math.round((now.getTime() - activeEntry.checkInTime.getTime()) / 60000);
    const totalMinutesWorked = Math.max(0, totalDurationMinutes - totalBreakMinutes);

    const timeEntry = await prisma.timeEntry.update({
      where: { id: activeEntry.id },
      data: {
        checkOutTime: now,
        status: "COMPLETED",
        totalMinutes: totalMinutesWorked,
        notes: {
          create: {
            content: note,
          },
        },
      },
      include: { notes: true },
    });

    return NextResponse.json({ timeEntry });
  } catch (error) {
    console.error("Time tracking PATCH error:", error);
    return NextResponse.json({ error: "Failed to check out" }, { status: 500 });
  }
}

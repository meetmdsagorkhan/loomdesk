import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { startOfDay } from "date-fns";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = startOfDay(new Date());

    // Find the active time entry for today
    const timeEntry = await prisma.timeEntry.findFirst({
      where: {
        userId: session.user.id,
        date: today,
        status: "ACTIVE",
      },
    });

    if (!timeEntry) {
      return NextResponse.json({ error: "No active check-in found or already on break" }, { status: 400 });
    }

    const newBreak = await prisma.break.create({
      data: {
        timeEntryId: timeEntry.id,
        startTime: new Date(),
      },
    });

    await prisma.timeEntry.update({
      where: { id: timeEntry.id },
      data: { status: "ON_BREAK" },
    });

    return NextResponse.json({ break: newBreak });
  } catch (error) {
    console.error("Start break error:", error);
    return NextResponse.json({ error: "Failed to start break" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = startOfDay(new Date());

    const timeEntry = await prisma.timeEntry.findFirst({
      where: {
        userId: session.user.id,
        date: today,
        status: "ON_BREAK",
      },
      include: {
        breaks: {
          where: { endTime: null },
        },
      },
    });

    if (!timeEntry || timeEntry.breaks.length === 0) {
      return NextResponse.json({ error: "No active break found" }, { status: 400 });
    }

    const activeBreak = timeEntry.breaks[0];
    const now = new Date();
    const durationMinutes = Math.round((now.getTime() - activeBreak.startTime.getTime()) / 60000);

    const updatedBreak = await prisma.break.update({
      where: { id: activeBreak.id },
      data: {
        endTime: now,
        duration: durationMinutes,
      },
    });

    await prisma.timeEntry.update({
      where: { id: timeEntry.id },
      data: { status: "ACTIVE" },
    });

    return NextResponse.json({ break: updatedBreak });
  } catch (error) {
    console.error("End break error:", error);
    return NextResponse.json({ error: "Failed to end break" }, { status: 500 });
  }
}

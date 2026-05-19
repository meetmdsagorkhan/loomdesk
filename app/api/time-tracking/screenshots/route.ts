import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { imageUrl, timeEntryId } = await request.json();

    if (!imageUrl || !timeEntryId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify time entry belongs to user and is active
    const timeEntry = await prisma.timeEntry.findFirst({
      where: {
        id: timeEntryId,
        userId: session.user.id,
      },
    });

    if (!timeEntry || timeEntry.status === "COMPLETED") {
      return NextResponse.json({ error: "Invalid or completed time entry" }, { status: 400 });
    }

    const screenshot = await prisma.screenshot.create({
      data: {
        userId: session.user.id,
        timeEntryId: timeEntry.id,
        imageUrl,
      },
    });

    return NextResponse.json({ screenshot });
  } catch (error) {
    console.error("Save screenshot error:", error);
    return NextResponse.json({ error: "Failed to save screenshot" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const date = searchParams.get("date"); // YYYY-MM-DD

    const whereClause: any = {};
    if (userId) whereClause.userId = userId;
    if (date) {
      const targetDate = new Date(date);
      whereClause.timeEntry = {
        date: targetDate,
      };
    }

    const screenshots = await prisma.screenshot.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { timestamp: "desc" },
    });

    return NextResponse.json({ screenshots });
  } catch (error) {
    console.error("Get screenshots error:", error);
    return NextResponse.json({ error: "Failed to fetch screenshots" }, { status: 500 });
  }
}

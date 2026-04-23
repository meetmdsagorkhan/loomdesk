import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma as db } from "@/lib/db";
import { isAdmin, isTeamLead } from "@/lib/auth-utils";
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins and team leads can access the users list
    if (!isAdmin(session) && !isTeamLead(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await db.user.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        image: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    logger.error('Failed to fetch users', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

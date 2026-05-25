import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma as db } from "@/lib/db";
import { isAdmin, isTeamLead } from "@/lib/auth-utils";
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // All authenticated users can fetch the basic user directory

    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permissions: true,
        isActive: true,
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

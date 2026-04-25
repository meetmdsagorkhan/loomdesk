import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { isAdmin } from '@/lib/auth-utils';
import { z } from 'zod';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const exceptionSchema = z.object({
  userId: z.string(),
  date: z.string(),
  shiftId: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const exceptions = await prisma.shiftException.findMany({
      orderBy: { date: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        shift: true,
      },
    });

    return NextResponse.json({ exceptions });
  } catch (error) {
    logger.error('List shift exceptions error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to fetch exceptions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin({ user: session.user })) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, date, shiftId, note } = exceptionSchema.parse(body);

    const exceptionDate = new Date(date);

    // Check if exception already exists for this user on this date
    const existing = await prisma.shiftException.findUnique({
      where: {
        userId_date: {
          userId,
          date: exceptionDate,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'An override already exists for this member on this date' },
        { status: 409 }
      );
    }

    const exception = await prisma.shiftException.create({
      data: {
        userId,
        date: exceptionDate,
        shiftId: shiftId || null,
        note,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        shift: true,
      },
    });

    return NextResponse.json(exception);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    logger.error('Create shift exception error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to create exception' }, { status: 500 });
  }
}

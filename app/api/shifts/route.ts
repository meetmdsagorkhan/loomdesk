import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { isAdmin } from '@/lib/auth-utils';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { getRequestIp, consumeRateLimitPersistent } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const shiftSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
  reportDeadline: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
});

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const shifts = await prisma.shift.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ shifts });
  } catch (error) {
    logger.error('List shifts error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to fetch shifts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const ipAddress = getRequestIp(request);

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can create shifts
    if (!isAdmin({ user: session.user })) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Apply rate limiting
    const rateLimit = await consumeRateLimitPersistent(`shifts:create:${session.user.id}`, {
      limit: 10,
      windowMs: 60000, // 1 minute
      blockDurationMs: 60000,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { name, startTime, endTime, reportDeadline } = shiftSchema.parse(body);



    const shift = await prisma.shift.create({
      data: {
        name,
        startTime,
        endTime,
        reportDeadline,
      },
    });

    return NextResponse.json(shift);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    logger.error('Create shift error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to create shift' }, { status: 500 });
  }
}

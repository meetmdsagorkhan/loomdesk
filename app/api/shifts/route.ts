import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { isAdmin } from '@/lib/auth-utils';
import { z } from 'zod';

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
    console.error('List shifts error:', error);
    return NextResponse.json({ error: 'Failed to fetch shifts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can create shifts
    if (!isAdmin({ user: session.user })) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, startTime, endTime, reportDeadline } = shiftSchema.parse(body);

    // Validate time order
    if (startTime >= endTime) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 }
      );
    }

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
    console.error('Create shift error:', error);
    return NextResponse.json({ error: 'Failed to create shift' }, { status: 500 });
  }
}

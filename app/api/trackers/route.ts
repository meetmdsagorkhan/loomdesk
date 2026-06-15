import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { TrackerType } from '@prisma/client';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') as TrackerType | null;
  const search = searchParams.get('search') || '';

  try {
    const whereClause: any = {};
    if (type) {
      whereClause.type = type;
    }
    
    if (search) {
      whereClause.OR = [
        { userName: { contains: search, mode: 'insensitive' } },
        { cardLast4: { contains: search, mode: 'insensitive' } },
        { reason: { contains: search, mode: 'insensitive' } },
        { note: { contains: search, mode: 'insensitive' } },
      ];
    }

    const trackers = await prisma.specialTaskTracker.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          }
        }
      }
    });

    return NextResponse.json({ success: true, trackers });
  } catch (error) {
    console.error('Failed to fetch trackers:', error);
    return NextResponse.json({ error: 'Failed to fetch trackers' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { type, userName, cardLast4, amount, reason, resourceType, note, status } = body;

    if (!type || !userName || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let initialStatus = status;
    if (!initialStatus) {
      if (type === 'CARD_SUSPENSION') {
        initialStatus = 'SUSPENDED';
      } else if (type === 'DUE_WAIVE') {
        initialStatus = 'WAIVED';
      } else if (type === 'ACCOUNT_TERMINATION') {
        initialStatus = 'TERMINATED';
      } else if (type === 'RESOURCE_CLOSURE') {
        initialStatus = 'CLOSED';
      }
    }

    const tracker = await prisma.specialTaskTracker.create({
      data: {
        type,
        userName,
        reason,
        cardLast4: cardLast4 || null,
        amount: amount ? parseFloat(amount) : null,
        resourceType: resourceType || null,
        note: note || null,
        status: initialStatus,
        userId: session.user.id,
        actionBy: type === 'DUE_WAIVE' ? (body.actionBy || session.user.name) : (body.actionBy || null),
        actionDate: body.actionDate ? new Date(body.actionDate) : null,
        actionReason: body.actionReason || null,
      },
    });

    return NextResponse.json({ success: true, tracker });
  } catch (error) {
    console.error('Failed to create tracker:', error);
    return NextResponse.json({ error: 'Failed to create tracker' }, { status: 500 });
  }
}

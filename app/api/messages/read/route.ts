import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

const markReadSchema = z.object({
  senderId: z.string().min(1, 'Sender ID is required'),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { senderId } = markReadSchema.parse(body);

    // Update all unread messages sent by `senderId` and received by the current user
    const result = await prisma.message.updateMany({
      where: {
        senderId,
        receiverId: session.user.id,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, updatedCount: result.count });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
    }

    logger.error('Mark read error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to mark messages as read' }, { status: 500 });
  }
}

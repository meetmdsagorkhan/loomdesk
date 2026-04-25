import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env.server';
import { logger } from '@/lib/logger';
import { consumeRateLimitPersistent } from '@/lib/rate-limit';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

const createMessageSchema = z.object({
  receiverId: z.string().nullable().optional(),
  channel: z.string().nullable().optional(),
  content: z.string().trim().min(1, 'Message cannot be empty').max(2000, 'Message is too long'),
});

const getMessagesSchema = z.object({
  userId: z.string().nullable().optional(),
  channel: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = getMessagesSchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams.entries())
    );

    if (!params.success) {
      return NextResponse.json({ error: params.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
    }

    const messages: Prisma.MessageGetPayload<{
      include: {
        sender: {
          select: {
            id: true;
            name: true;
            email: true;
          };
        };
      };
    }>[] = await prisma.message.findMany({
      where: params.data.channel
        ? { channel: params.data.channel }
        : params.data.userId
          ? {
            OR: [
              { senderId: session.user.id, receiverId: params.data.userId },
              { senderId: params.data.userId, receiverId: session.user.id },
            ],
          }
          : { channel: 'general' },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(
      messages.map((message) => ({
        id: message.id,
        senderId: message.senderId,
        senderName: message.sender.name,
        senderEmail: message.sender.email,
        receiverId: message.receiverId,
        channel: message.channel,
        content: message.content,
        createdAt: message.createdAt,
        read: message.read,
        readAt: message.readAt,
      }))
    );
  } catch (error) {
    logger.error('Get messages error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const messageRateLimit = await consumeRateLimitPersistent(`messages:${session.user.id}`, {
      limit: env.MESSAGE_RATE_LIMIT_MAX_REQUESTS,
      windowMs: env.MESSAGE_RATE_LIMIT_WINDOW_MS,
      blockDurationMs: env.MESSAGE_RATE_LIMIT_WINDOW_MS,
    });

    if (!messageRateLimit.success) {
      return NextResponse.json(
        { error: 'Too many messages sent. Please wait before trying again.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { receiverId, channel, content } = createMessageSchema.parse(body);

    if (receiverId) {
      if (receiverId === session.user.id) {
        return NextResponse.json({ error: 'You cannot message yourself' }, { status: 400 });
      }

      const receiver = await prisma.user.findUnique({
        where: { id: receiverId },
        select: { id: true, isActive: true, name: true, email: true },
      });

      if (!receiver || !receiver.isActive) {
        return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
      }
    }

    const message = await prisma.message.create({
      data: {
        senderId: session.user.id,
        receiverId: receiverId || null,
        channel: channel || null,
        content,
      },
      include: {
        sender: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      id: message.id,
      senderId: session.user.id,
      senderName: message.sender.name,
      senderEmail: message.sender.email,
      receiverId: message.receiverId,
      channel: message.channel,
      content: message.content,
      createdAt: message.createdAt,
      read: message.read,
      readAt: message.readAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
    }

    logger.error('Create message error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}

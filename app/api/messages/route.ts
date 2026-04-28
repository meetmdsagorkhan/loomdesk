import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env.server';
import { logger } from '@/lib/logger';
import { consumeRateLimitPersistent } from '@/lib/rate-limit';
import { supabase } from '@/lib/supabase';
import type { Prisma } from '@prisma/client';

// Messages API with real-time broadcasting

export const dynamic = 'force-dynamic';

const createMessageSchema = z.object({
  receiverId: z.string().nullable().optional(),
  channel: z.string().nullable().optional(),
  content: z.string().trim().min(1, 'Message cannot be empty').max(2000, 'Message is too long'),
  replyToId: z.string().nullable().optional(),
  isForwarded: z.boolean().optional(),
  originalSenderId: z.string().nullable().optional(),
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

    const messages = await prisma.message.findMany({
      where: params.data.channel
        ? { channel: params.data.channel as string }
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
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        originalSender: {
          select: {
            id: true,
            name: true,
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
        replyToId: message.replyToId,
        replyTo: message.replyTo ? {
          id: message.replyTo.id,
          content: message.replyTo.content,
          senderName: message.replyTo.sender.name,
        } : null,
        isForwarded: message.isForwarded,
        originalSenderId: message.originalSenderId,
        originalSenderName: message.originalSender?.name,
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
    const { receiverId, channel, content, replyToId, isForwarded, originalSenderId } = createMessageSchema.parse(body);

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
        receiverId: receiverId || undefined,
        channel: channel || undefined,
        content,
        replyToId: replyToId || undefined,
        isForwarded: isForwarded || false,
        originalSenderId: originalSenderId || undefined,
      },
      include: {
        sender: {
          select: {
            name: true,
            email: true,
          },
        },
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        originalSender: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Broadcast the message via Supabase for real-time delivery
    if (supabase) {
      const roomId = channel 
        ? `channel:${channel}`
        : [session.user.id, receiverId].sort().join('_');
      
      const broadcastPayload = {
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
      };

      try {
        await supabase.channel(`chat:${roomId}`).send({
          type: 'broadcast',
          event: 'new_message',
          payload: broadcastPayload,
        });
      } catch (broadcastError) {
        logger.error('Failed to broadcast message', { error: broadcastError });
        // Don't fail the request if broadcast fails
      }
    }

    // Create notification for direct messages
    if (receiverId && !channel) {
      try {
        await prisma.notification.create({
          data: {
            userId: receiverId,
            type: 'NEW_MESSAGE',
            title: `New message from ${message.sender.name}`,
            message: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
            read: false,
          },
        });
      } catch (notificationError) {
        logger.error('Failed to create notification', { error: notificationError });
        // Don't fail the request if notification creation fails
      }
    }

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
      replyToId: message.replyToId,
      replyTo: message.replyTo ? {
        id: message.replyTo.id,
        content: message.replyTo.content,
        senderName: message.replyTo.sender.name,
      } : null,
      isForwarded: message.isForwarded,
      originalSenderId: message.originalSenderId,
      originalSenderName: message.originalSender?.name,
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

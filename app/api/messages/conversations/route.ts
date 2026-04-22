import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';

type ConversationSummary = {
  userId: string;
  userName: string;
  userEmail: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
};

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [messages, teammates]: [
      Prisma.MessageGetPayload<{
        include: {
          sender: { select: { id: true; name: true; email: true } };
          receiver: { select: { id: true; name: true; email: true } };
        };
      }>[],
      Array<{ id: string; name: string; email: string }>
    ] = await Promise.all([
      prisma.message.findMany({
        where: {
          OR: [{ senderId: session.user.id }, { receiverId: session.user.id }],
        },
        include: {
          sender: {
            select: { id: true, name: true, email: true },
          },
          receiver: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      prisma.user.findMany({
        where: {
          isActive: true,
          id: { not: session.user.id },
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      }),
    ]);

    const conversations = messages.reduce<Map<string, ConversationSummary>>((acc, message) => {
      const counterpart =
        message.senderId === session.user.id ? message.receiver : message.sender;

      if (!counterpart) {
        return acc;
      }

      const existing = acc.get(counterpart.id);
      const unreadIncrement =
        message.receiverId === session.user.id &&
        message.senderId === counterpart.id &&
        !message.read
          ? 1
          : 0;

      if (!existing) {
        acc.set(counterpart.id, {
          userId: counterpart.id,
          userName: counterpart.name,
          userEmail: counterpart.email,
          lastMessage: message.content,
          lastMessageTime: message.createdAt,
          unreadCount: unreadIncrement,
        });
        return acc;
      }

      existing.unreadCount += unreadIncrement;
      return acc;
    }, new Map());

    for (const teammate of teammates) {
      if (!conversations.has(teammate.id)) {
        conversations.set(teammate.id, {
          userId: teammate.id,
          userName: teammate.name,
          userEmail: teammate.email,
          lastMessage: 'No messages yet',
          lastMessageTime: new Date(0),
          unreadCount: 0,
        });
      }
    }

    const orderedConversations = Array.from(conversations.values()).sort(
      (a: ConversationSummary, b: ConversationSummary) =>
        b.lastMessageTime.getTime() - a.lastMessageTime.getTime()
    );

    return NextResponse.json(orderedConversations);
  } catch (error) {
    logger.error('Get conversations error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

const createMessageSchema = z.object({
  receiverId: z.string().min(1, 'Receiver is required'),
  content: z.string().trim().min(1, 'Message cannot be empty').max(2000, 'Message is too long'),
});

const getMessagesSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
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
      where: {
        OR: [
          { senderId: session.user.id, receiverId: params.data.userId },
          { senderId: params.data.userId, receiverId: session.user.id },
        ],
      },
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
        content: message.content,
        createdAt: message.createdAt,
        read: message.read,
      }))
    );
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { receiverId, content } = createMessageSchema.parse(body);

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

    const message = await prisma.message.create({
      data: {
        senderId: session.user.id,
        receiverId,
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
      content: message.content,
      createdAt: message.createdAt,
      read: message.read,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
    }

    console.error('Create message error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}

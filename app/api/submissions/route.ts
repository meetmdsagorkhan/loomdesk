import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { getRequestIp, consumeRateLimitPersistent } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const submissionSchema = z.object({
  type: z.enum(['FEEDBACK', 'BUG_REPORT', 'FEATURE_REQUEST']),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
});

export async function POST(request: NextRequest) {
  const ipAddress = getRequestIp(request);

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Apply rate limiting
    const rateLimit = await consumeRateLimitPersistent(`submissions:create:${session.user.id}`, {
      limit: 5,
      windowMs: 3600000, // 1 hour
      blockDurationMs: 3600000,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many submissions. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { type, title, description } = submissionSchema.parse(body);

    const submission = await prisma.userSubmission.create({
      data: {
        userId: session.user.id,
        type,
        title,
        description,
      },
    });

    logger.info('User submission created', {
      submissionId: submission.id,
      userId: session.user.id,
      type,
      ipAddress,
    });

    return NextResponse.json(submission);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    logger.error('Create submission error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ipAddress,
    });
    return NextResponse.json({ error: 'Failed to create submission' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Only admins can view all submissions
    const isAdminUser = session.user.role === 'ADMIN';

    const whereClause: any = {};

    if (isAdminUser) {
      // Admins can filter by type and status
      if (type && ['FEEDBACK', 'BUG_REPORT', 'FEATURE_REQUEST'].includes(type)) {
        whereClause.type = type;
      }
      if (status && ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(status)) {
        whereClause.status = status;
      }
    } else {
      // Regular users can only see their own submissions
      whereClause.userId = session.user.id;
    }

    const [submissions, total] = await Promise.all([
      prisma.userSubmission.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 100),
        skip: offset,
      }),
      prisma.userSubmission.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      submissions,
      total,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('List submissions error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
  }
}

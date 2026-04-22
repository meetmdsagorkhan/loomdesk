import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Try to find today's report
    let report = await prisma.report.findUnique({
      where: {
        userId_date: {
          userId: session.user.id,
          date: today,
        },
      },
      include: {
        entries: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    // If no report exists, create a draft
    if (!report) {
      report = await prisma.report.create({
        data: {
          userId: session.user.id,
          date: today,
          status: 'DRAFT',
        },
        include: {
          entries: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    }

    return NextResponse.json(report);
  } catch (error) {
    logger.error('Fetch today report error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
  }
}

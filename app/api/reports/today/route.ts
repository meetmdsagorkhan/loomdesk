import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

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
    console.error('Fetch today report error:', error);
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
  }
}

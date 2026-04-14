import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { isAdmin, isTeamLead } from '@/lib/auth-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id: reportId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN and TEAM_LEAD can access QA routes
    if (!isAdmin(session) && !isTeamLead(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        entries: {
          include: {
            feedback: {
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Calculate score for the report
    const scoreEvents = await prisma.scoreEvent.findMany({
      where: { reportId },
    });

    const totalDeduction = scoreEvents.reduce((sum: number, event: any) => sum + event.deduction, 0);
    const score = Math.max(0, 100 - totalDeduction);

    return NextResponse.json({
      ...report,
      score,
      totalDeduction,
    });
  } catch (error) {
    console.error('Get QA report error:', error);
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id: reportId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify report belongs to user
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        entries: true,
      },
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    if (report.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (report.status === 'SUBMITTED') {
      return NextResponse.json({ error: 'Report already submitted' }, { status: 400 });
    }

    if (report.entries.length === 0) {
      return NextResponse.json({ error: 'Cannot submit empty report' }, { status: 400 });
    }

    // Submit report
    const updatedReport = await prisma.report.update({
      where: { id: reportId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });

    return NextResponse.json(updatedReport);
  } catch (error) {
    console.error('Submit report error:', error);
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
  }
}

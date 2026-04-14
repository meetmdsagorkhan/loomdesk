import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { entrySchema } from '@/lib/validations/report';

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
    const body = await request.json();
    const { type, referenceId, status, note, pendingReason } = entrySchema.parse(body);

    // Verify report belongs to user
    const report = await prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    if (report.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (report.status === 'SUBMITTED') {
      return NextResponse.json({ error: 'Cannot add entries to submitted report' }, { status: 400 });
    }

    // Check if reference ID already exists in this report
    const existingEntry = await prisma.reportEntry.findUnique({
      where: {
        reportId_referenceId: {
          reportId,
          referenceId,
        },
      },
    });

    if (existingEntry) {
      return NextResponse.json(
        { error: 'Reference ID already exists in this report' },
        { status: 400 }
      );
    }

    // Create entry
    const entry = await prisma.reportEntry.create({
      data: {
        reportId,
        type,
        referenceId,
        status,
        note,
        pendingReason: status === 'PENDING' ? pendingReason : null,
      },
    });

    return NextResponse.json(entry);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      );
    }
    console.error('Add entry error:', error);
    return NextResponse.json({ error: 'Failed to add entry' }, { status: 500 });
  }
}

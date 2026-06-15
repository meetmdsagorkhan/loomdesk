import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { status, actionDate, actionBy, actionReason, note } = body;

    const existing = await prisma.specialTaskTracker.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Tracker not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (actionDate !== undefined) updateData.actionDate = actionDate ? new Date(actionDate) : null;
    if (actionBy !== undefined) updateData.actionBy = actionBy;
    if (actionReason !== undefined) updateData.actionReason = actionReason;
    if (note !== undefined) updateData.note = note;

    const updated = await prisma.specialTaskTracker.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, tracker: updated });
  } catch (error) {
    console.error('Failed to update tracker:', error);
    return NextResponse.json({ error: 'Failed to update tracker' }, { status: 500 });
  }
}

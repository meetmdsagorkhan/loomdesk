import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { deleteAvailability } from '@/lib/scheduling/availability-actions';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await deleteAvailability(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete availability:', error);
    return NextResponse.json({ error: 'Failed to delete availability' }, { status: 500 });
  }
}

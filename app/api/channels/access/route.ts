import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { hasPermission } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const channel = searchParams.get('channel') || 'general';

  const canPost =
    channel !== 'announcements' || hasPermission(session.user.role, 'post_announcements');

  return NextResponse.json({
    channel,
    canView: true,
    canPost,
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { checkPendingTickets } from '@/lib/ticket-notifications';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can trigger this job manually
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await checkPendingTickets();

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to check pending tickets', details: result.error },
        { status: 500 }
      );
    }

    logger.info('Pending ticket check job completed', {
      notificationsCreated: result.notificationsCreated,
      escalationsCreated: result.escalationsCreated,
    });

    return NextResponse.json({
      success: true,
      notificationsCreated: result.notificationsCreated,
      escalationsCreated: result.escalationsCreated,
      notificationsCreatedList: result.notificationsCreatedList,
      escalationsCreatedList: result.escalationsCreatedList,
    });
  } catch (error) {
    logger.error('Check pending tickets job error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to check pending tickets' }, { status: 500 });
  }
}

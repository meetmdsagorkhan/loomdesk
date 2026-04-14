import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { isAdmin, isTeamLead } from '@/lib/auth-utils';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

const feedbackSchema = z.object({
  entryId: z.string(),
  comment: z.string().min(1, 'Comment is required'),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN and TEAM_LEAD can add feedback
    if (!isAdmin(session) && !isTeamLead(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { entryId, comment } = feedbackSchema.parse(body);

    // Verify entry exists
    const entry = await prisma.reportEntry.findUnique({
      where: { id: entryId },
      include: {
        report: {
          select: {
            userId: true,
            date: true,
          },
        },
      },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    // Create feedback
    const feedback = await prisma.feedback.create({
      data: {
        entryId,
        comment,
        authorId: session.user.id,
      },
    });

    // Send notification to member
    try {
      if (supabase) {
        const reportDate = format(new Date(entry.report.date), 'MMM d, yyyy');
        await supabase.from('notifications').insert({
          user_id: entry.report.userId,
          type: 'NEW_FEEDBACK',
          title: 'New Feedback',
          message: `Admin left feedback on your ${reportDate} report`,
        });
      }
    } catch (error) {
      console.error('Failed to send notification:', error);
      // Don't fail the request if notification fails
    }

    return NextResponse.json(feedback);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error('Add feedback error:', error);
    return NextResponse.json({ error: 'Failed to add feedback' }, { status: 500 });
  }
}

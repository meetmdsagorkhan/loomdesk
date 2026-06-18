import { prisma } from '@/lib/db';
import { createNotification } from '@/lib/notifications';
import { logger } from '@/lib/logger';

const HOURS_24 = 24 * 60 * 60 * 1000;
const DAYS_3 = 3 * 24 * 60 * 60 * 1000;

export async function checkPendingTickets() {
  try {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - HOURS_24);
    const threeDaysAgo = new Date(now.getTime() - DAYS_3);

    // Find all pending ticket entries
    const pendingEntries = await prisma.reportEntry.findMany({
      where: {
        type: 'TICKET',
        status: 'PENDING',
      },
      include: {
        report: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    const notificationsCreated: string[] = [];
    const escalationsCreated: string[] = [];

    for (const entry of pendingEntries) {
      const entryAge = now.getTime() - new Date(entry.createdAt).getTime();

      // Check if entry is over 24 hours old and hasn't been notified yet
      if (entryAge >= HOURS_24 && entryAge < DAYS_3) {
        // Check if we've already sent a notification for this entry
        const existingNotification = await prisma.notification.findFirst({
          where: {
            userId: entry.report.user.id,
            type: 'PENDING_TICKET_REMINDER',
            message: {
              contains: entry.referenceId,
            },
          },
        });

        if (!existingNotification) {
          await createNotification({
            userId: entry.report.user.id,
            type: 'PENDING_TICKET_REMINDER',
            title: 'Pending Ticket Reminder',
            message: `Your ticket ${entry.referenceId} has been pending for over 24 hours. Please update the status or provide additional information.`,
          });
          notificationsCreated.push(entry.referenceId);
          logger.info('Pending ticket reminder sent', {
            entryId: entry.id,
            referenceId: entry.referenceId,
            userId: entry.report.user.id,
          });
        }
      }

      // Check if entry is over 3 days old and escalate to admin
      if (entryAge >= DAYS_3) {
        // Check if we've already escalated this entry
        const existingEscalation = await prisma.notification.findFirst({
          where: {
            type: 'PENDING_TICKET_ESCALATION',
            message: {
              contains: entry.referenceId,
            },
          },
        });

        if (!existingEscalation) {
          // Find all admins
          const admins = await prisma.user.findMany({
            where: {
              role: 'ADMIN',
              isActive: true,
            },
          });

          for (const admin of admins) {
            await createNotification({
              userId: admin.id,
              type: 'PENDING_TICKET_ESCALATION',
              title: 'Pending Ticket Escalation',
              message: `Ticket ${entry.referenceId} assigned to ${entry.report.user.name} (${entry.report.user.email}) has been pending for over 3 days. Reason: ${entry.pendingReason || 'No reason provided'}.`,
            });
          }
          escalationsCreated.push(entry.referenceId);
          logger.info('Pending ticket escalated to admin', {
            entryId: entry.id,
            referenceId: entry.referenceId,
            userId: entry.report.user.id,
          });
        }
      }
    }

    return {
      success: true,
      notificationsCreated: notificationsCreated.length,
      escalationsCreated: escalationsCreated.length,
      notificationsCreatedList: notificationsCreated,
      escalationsCreatedList: escalationsCreated,
    };
  } catch (error) {
    logger.error('Error checking pending tickets', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

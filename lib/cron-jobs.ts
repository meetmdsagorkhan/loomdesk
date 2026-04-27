import cron from 'node-cron';
import { checkPendingTickets } from '@/lib/ticket-notifications';
import { logger } from '@/lib/logger';

// Schedule the pending ticket check to run daily at 9:00 AM
const pendingTicketCheckTask = cron.schedule(
  '0 9 * * *', // Runs every day at 9:00 AM
  async () => {
    logger.info('Running scheduled pending ticket check');
    try {
      const result = await checkPendingTickets();
      logger.info('Scheduled pending ticket check completed', {
        notificationsCreated: result.notificationsCreated,
        escalationsCreated: result.escalationsCreated,
      });
    } catch (error) {
      logger.error('Scheduled pending ticket check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
  {
    timezone: 'UTC',
  }
);

// Function to start all cron jobs
export function startCronJobs() {
  logger.info('Starting cron jobs');
  pendingTicketCheckTask.start();
}

// Function to stop all cron jobs
export function stopCronJobs() {
  logger.info('Stopping cron jobs');
  pendingTicketCheckTask.stop();
}

// Export task for manual control if needed
export { pendingTicketCheckTask };

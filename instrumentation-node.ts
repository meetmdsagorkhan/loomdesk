import { startCronJobs } from './lib/cron-jobs';

export {};

declare global {
  var __loomdeskInstrumentationRegistered: boolean | undefined;
}

if (!globalThis.__loomdeskInstrumentationRegistered && process.env.NODE_ENV !== 'test') {
  globalThis.__loomdeskInstrumentationRegistered = true;

  process.on('uncaughtException', (error) => {
    console.error('[loomdesk] Uncaught exception', {
      error: error.message,
      stack: error.stack,
    });
  });

  process.on('unhandledRejection', (reason) => {
    console.error('[loomdesk] Unhandled promise rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
    });
  });

  // Start cron jobs for scheduled tasks (delayed to avoid instrumentation issues)
  // Cron jobs disabled in dev mode to avoid Prisma initialization issues
  if (process.env.NODE_ENV === 'production') {
    setTimeout(async () => {
      try {
        const { startCronJobs } = await import('./lib/cron-jobs');
        startCronJobs();
        console.log('[loomdesk] Cron jobs started successfully');
      } catch (error) {
        console.error('[loomdesk] Failed to start cron jobs', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, 1000);
  }

  console.log('[loomdesk] Node instrumentation registered', {
    pid: process.pid,
    nodeVersion: process.version,
    environment: process.env.NODE_ENV ?? 'development',
  });
}

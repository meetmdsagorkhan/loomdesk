import { logger } from '@/lib/logger';

declare global {
  var __loomdeskInstrumentationRegistered: boolean | undefined;
}

if (!globalThis.__loomdeskInstrumentationRegistered) {
  globalThis.__loomdeskInstrumentationRegistered = true;

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', {
      error: error.message,
      stack: error.stack,
    });
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
    });
  });

  logger.audit('Node instrumentation registered', {
    pid: process.pid,
    nodeVersion: process.version,
    environment: process.env.NODE_ENV ?? 'development',
  });
}

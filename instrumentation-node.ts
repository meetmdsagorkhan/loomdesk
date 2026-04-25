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

  console.log('[loomdesk] Node instrumentation registered', {
    pid: process.pid,
    nodeVersion: process.version,
    environment: process.env.NODE_ENV ?? 'development',
  });
}

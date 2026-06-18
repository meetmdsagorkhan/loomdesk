export async function register() {
  // Disable instrumentation in dev mode to avoid Prisma initialization issues
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.NODE_ENV === 'production') {
    await import('./instrumentation-node');
  }
}

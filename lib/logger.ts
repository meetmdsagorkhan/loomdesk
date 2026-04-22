type LogLevel = 'info' | 'warn' | 'error';

function formatMetadata(metadata: Record<string, unknown> | undefined) {
  if (!metadata) {
    return undefined;
  }

  const filteredEntries = Object.entries(metadata).filter(([, value]) => value !== undefined);

  if (filteredEntries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(filteredEntries);
}

function writeBrowserLog(
  level: LogLevel,
  message: string,
  metadata?: Record<string, unknown>
) {
  const payload = formatMetadata(metadata);

  if (payload) {
    globalThis.console[level](`[loomdesk] ${message}`, payload);
    return;
  }

  globalThis.console[level](`[loomdesk] ${message}`);
}

function writeServerLog(
  level: LogLevel,
  message: string,
  metadata?: Record<string, unknown>
) {
  const normalizedMetadata = formatMetadata(metadata);
  const payload = JSON.stringify({
    timestamp: new Date().toISOString(),
    service: 'loomdesk',
    level,
    message,
    ...(normalizedMetadata ? { metadata: normalizedMetadata } : {}),
  });

  const stream = level === 'error' ? process.stderr : process.stdout;
  stream.write(`${payload}\n`);
}

function writeLog(
  level: LogLevel,
  message: string,
  metadata?: Record<string, unknown>
) {
  if (typeof window !== 'undefined') {
    writeBrowserLog(level, message, metadata);
    return;
  }

  writeServerLog(level, message, metadata);
}

export const logger = {
  info(message: string, metadata?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== 'production') {
      writeLog('info', message, metadata);
    }
  },
  audit(message: string, metadata?: Record<string, unknown>) {
    writeLog('info', message, metadata);
  },
  warn(message: string, metadata?: Record<string, unknown>) {
    writeLog('warn', message, metadata);
  },
  error(message: string, metadata?: Record<string, unknown>) {
    writeLog('error', message, metadata);
  },
};

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export type AuditStatus = 'success' | 'failure';

type AuditEventInput = {
  action: string;
  status: AuditStatus;
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
  targetType?: string;
  targetId?: string;
  targetEmail?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
};

function compactObject(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  );
}

type PersistedAuditEvent = {
  action: string;
  status: AuditStatus;
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
  targetType?: string;
  targetId?: string;
  targetEmail?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
};

let auditLogPersistenceAvailable = true;

function normalizeAuditEvent(event: AuditEventInput) {
  return compactObject({
    action: event.action,
    status: event.status,
    actorId: event.actorId,
    actorEmail: event.actorEmail,
    actorRole: event.actorRole,
    targetType: event.targetType,
    targetId: event.targetId,
    targetEmail: event.targetEmail,
    ipAddress: event.ipAddress,
    metadata:
      event.metadata && Object.keys(event.metadata).length > 0
        ? event.metadata
        : undefined,
    timestamp: new Date().toISOString(),
  }) as PersistedAuditEvent;
}

function mapAuditStatus(status: AuditStatus) {
  return status === 'success' ? 'SUCCESS' : 'FAILURE';
}

function isMissingAuditTableError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2021'
  );
}

async function persistAuditEvent(event: PersistedAuditEvent) {
  if (!auditLogPersistenceAvailable) {
    return;
  }

  try {
    await prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO "AuditLog" (
          "id",
          "action",
          "status",
          "actorId",
          "actorEmail",
          "actorRole",
          "targetType",
          "targetId",
          "targetEmail",
          "ipAddress",
          "metadata",
          "createdAt"
        ) VALUES (
          ${crypto.randomUUID()},
          ${event.action},
          ${mapAuditStatus(event.status)}::"AuditStatus",
          ${event.actorId ?? null},
          ${event.actorEmail ?? null},
          ${event.actorRole ?? null},
          ${event.targetType ?? null},
          ${event.targetId ?? null},
          ${event.targetEmail ?? null},
          ${event.ipAddress ?? null},
          ${event.metadata ? JSON.stringify(event.metadata) : null}::jsonb,
          ${new Date(event.timestamp)}
        )
      `
    );
  } catch (error) {
    if (isMissingAuditTableError(error)) {
      auditLogPersistenceAvailable = false;
      logger.warn('Audit log table is not available yet. Falling back to structured logs only.');
      return;
    }

    logger.error('Failed to persist audit event', {
      error: error instanceof Error ? error.message : 'Unknown error',
      action: event.action,
    });
  }
}

export function auditEvent(event: AuditEventInput) {
  const normalizedEvent = normalizeAuditEvent(event);

  logger.audit('audit-event', normalizedEvent);
  void persistAuditEvent(normalizedEvent);
}

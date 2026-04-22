import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';
import { Prisma } from '@prisma/client';

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  action: z.string().min(1).optional(),
  actorId: z.string().min(1).optional(),
  targetId: z.string().min(1).optional(),
  status: z.enum(['SUCCESS', 'FAILURE']).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const query = querySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams.entries())
    );

    type AuditLogRow = {
      id: string;
      action: string;
      status: 'SUCCESS' | 'FAILURE';
      actorId: string | null;
      actorEmail: string | null;
      actorRole: string | null;
      targetType: string | null;
      targetId: string | null;
      targetEmail: string | null;
      ipAddress: string | null;
      metadata: Prisma.JsonValue | null;
      createdAt: Date;
    };

    const clauses: Prisma.Sql[] = [Prisma.sql`1 = 1`];

    if (query.action) {
      clauses.push(Prisma.sql`"action" = ${query.action}`);
    }

    if (query.actorId) {
      clauses.push(Prisma.sql`"actorId" = ${query.actorId}`);
    }

    if (query.targetId) {
      clauses.push(Prisma.sql`"targetId" = ${query.targetId}`);
    }

    if (query.status) {
      clauses.push(Prisma.sql`"status" = ${query.status}::"AuditStatus"`);
    }

    const logs = await prisma.$queryRaw<AuditLogRow[]>(
      Prisma.sql`
        SELECT
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
        FROM "AuditLog"
        WHERE ${Prisma.join(clauses, ' AND ')}
        ORDER BY "createdAt" DESC
        LIMIT ${query.limit}
      `
    );

    return NextResponse.json({
      logs: logs.map((log: AuditLogRow) => ({
        ...log,
        status: log.status.toLowerCase(),
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? 'Invalid request' },
        { status: 400 }
      );
    }

    logger.error('Failed to fetch audit logs', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}

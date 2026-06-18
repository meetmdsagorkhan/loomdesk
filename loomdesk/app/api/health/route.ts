import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env.server';
import { REQUEST_ID_HEADER } from '@/lib/request-id';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const requestId = request.headers.get(REQUEST_ID_HEADER);
  const startedAt = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: 'ok',
      version: process.env.npm_package_version ?? '0.1.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      requestId,
      latencyMs: Date.now() - startedAt,
      dependencies: {
        database: 'ok',
        email: env.RESEND_API_KEY && env.EMAIL_FROM ? 'configured' : 'preview-only',
        supabase:
          env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            ? 'configured'
            : 'disabled',
      },
      memory: {
        rss: process.memoryUsage().rss,
        heapUsed: process.memoryUsage().heapUsed,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        version: process.env.npm_package_version ?? '0.1.0',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        requestId,
        latencyMs: Date.now() - startedAt,
        dependencies: {
          database: 'unavailable',
          email: env.RESEND_API_KEY && env.EMAIL_FROM ? 'configured' : 'preview-only',
          supabase:
            env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY
              ? 'configured'
              : 'disabled',
        },
      },
      { status: 503 }
    );
  }
}

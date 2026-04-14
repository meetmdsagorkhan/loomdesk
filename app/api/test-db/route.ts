import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Test database connection
    const userCount = await prisma.user.count();
    const adminUser = await prisma.user.findUnique({
      where: { email: 'sagor.khan@priyo.net' },
      select: { id: true, email: true, name: true, role: true },
    });

    return NextResponse.json({
      status: 'success',
      database: 'connected',
      userCount,
      adminUser,
    });
  } catch (error) {
    console.error('Database connection error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

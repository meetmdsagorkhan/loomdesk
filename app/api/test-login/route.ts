import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import * as bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({
        status: 'error',
        message: 'User not found',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    return NextResponse.json({
      status: 'success',
      email: user.email,
      isPasswordValid,
      userExists: !!user,
      isActive: user.isActive,
    });
  } catch (error) {
    console.error('Test login error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Test login failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

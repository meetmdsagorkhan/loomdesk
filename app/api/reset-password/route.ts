import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import * as bcrypt from 'bcryptjs';

export async function POST() {
  try {
    const newPassword = 'Admin@123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const user = await prisma.user.update({
      where: { email: 'sagor.khan@priyo.net' },
      data: { password: hashedPassword },
    });

    return NextResponse.json({
      status: 'success',
      message: 'Password reset successfully',
      email: user.email,
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to reset password',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

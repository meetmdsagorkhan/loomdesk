import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { exchangeCodeForTokens, storeGoogleTokens } from '@/lib/google-calendar';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard/scheduling?error=unauthorized', request.url));
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      const message = error === 'access_denied' ? 'access_denied' : 'google_error';
      return NextResponse.redirect(
        new URL(`/dashboard/scheduling?error=${message}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/dashboard/scheduling?error=no_code', request.url)
      );
    }

    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(
        new URL('/dashboard/scheduling?error=no_refresh_token', request.url)
      );
    }

    await storeGoogleTokens(session.user.id, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date ?? null,
    });

    return NextResponse.redirect(
      new URL('/dashboard/scheduling?connected=true', request.url)
    );
  } catch (error: any) {
    console.error('Google Calendar OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/dashboard/scheduling?error=callback_failed', request.url)
    );
  }
}

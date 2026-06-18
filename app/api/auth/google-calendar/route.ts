import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getGoogleAuthUrl, isGoogleOAuthConfigured } from '@/lib/google-calendar';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!isGoogleOAuthConfigured()) {
      return NextResponse.json(
        { error: 'Google OAuth is not configured on this server. Add GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_REDIRECT_URI to your environment.' },
        { status: 501 }
      );
    }

    const url = getGoogleAuthUrl();
    return NextResponse.redirect(url);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to initiate Google OAuth' }, { status: 500 });
  }
}

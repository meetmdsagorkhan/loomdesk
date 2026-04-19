import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const publicRoutes = ['/login', '/invite'];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));
  const isAuthApiRoute = pathname.startsWith('/api/auth');

  if (isAuthApiRoute) {
    return NextResponse.next();
  }

  if (isPublicRoute) {
    const hasSession =
      req.cookies.get('next-auth.session-token') ||
      req.cookies.get('__Secure-next-auth.session-token');

    if (hasSession) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};

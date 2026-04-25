import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from "@/auth";
import { canAccessRoute } from "@/lib/permissions";
import { allowedCorsOrigins } from '@/lib/env.server';
import { attachRequestId, getRequestId } from '@/lib/request-id';

const PUBLIC_ROUTES = [
  '/login',
  '/invite',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/resend-verification',
];
const PUBLIC_API_ROUTES = ['/api/auth', '/api/health', '/api/reset-password', '/api/email-verification'];
const PROTECTED_PAGE_PREFIXES = [
  '/dashboard',
  '/analytics',
  '/attendance',
  '/leave',
  '/qa',
  '/reports',
  '/settings',
  '/shifts',
  '/messages',
  '/scoring',
  '/calendar',
];

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function applyCorsHeaders(request: NextRequest, response: NextResponse) {
  const origin = request.headers.get('origin');

  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  );
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );
  response.headers.set('Access-Control-Max-Age', '600');
  response.headers.set('Vary', 'Origin');

  if (origin && allowedCorsOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }

  return response;
}

export default async function proxy(req: NextRequest) {
  const session = await auth();
  const { pathname } = req.nextUrl;
  const isApiRoute = pathname.startsWith('/api');
  const isAuthenticated = !!session;
  const userRole = session?.user?.role || 'MEMBER';
  const requestId = getRequestId(req);

  const finalizeResponse = (response: NextResponse) =>
    attachRequestId(response, requestId);

  // 1. API Route Logic
  if (isApiRoute) {
    const origin = req.headers.get('origin');
    const isAllowedOrigin = !origin || allowedCorsOrigins.includes(origin);
    const isPublicApiRoute = matchesPrefix(pathname, PUBLIC_API_ROUTES);

    if (req.method === 'OPTIONS') {
      const response = new NextResponse(null, {
        status: isAllowedOrigin ? 204 : 403,
      });

      return finalizeResponse(applyCorsHeaders(req, response));
    }

    if (!isAllowedOrigin) {
      return finalizeResponse(applyCorsHeaders(
        req,
        NextResponse.json({ error: 'Origin not allowed' }, { status: 403 })
      ));
    }

    if (!isPublicApiRoute && !isAuthenticated) {
      return finalizeResponse(applyCorsHeaders(
        req,
        NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      ));
    }

    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-request-id', requestId);

    return finalizeResponse(
      applyCorsHeaders(
        req,
        NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        })
      )
    );
  }

  // 2. Page Route Logic
  const isPublicRoute = matchesPrefix(pathname, PUBLIC_ROUTES);
  const isProtectedPage = matchesPrefix(pathname, PROTECTED_PAGE_PREFIXES);

  if (isPublicRoute) {
    if (isAuthenticated) {
      return finalizeResponse(NextResponse.redirect(new URL('/dashboard', req.url)));
    }
  }

  if (isProtectedPage && !isAuthenticated) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirectTo', pathname);

    return finalizeResponse(NextResponse.redirect(loginUrl));
  }

  // 3. RBAC Logic
  if (isAuthenticated && isProtectedPage) {
    // Determine the root of the module (e.g. /dashboard or /reports)
    // Actually, canAccessRoute handles the path.
    if (!canAccessRoute(userRole, pathname)) {
      // If no access, redirect to dashboard or a safe fallback
      const fallback = pathname.startsWith('/dashboard') ? '/dashboard' : '/dashboard';
      // If they are on a subpage they shouldn't be, send them to the module root if they have access to it?
      // For now, redirect to main dashboard as a safe baseline.
      return finalizeResponse(NextResponse.redirect(new URL(fallback, req.url)));
    }
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-request-id', requestId);

  return finalizeResponse(
    NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  );
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'],
};

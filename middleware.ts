import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from "@/auth";
import { canAccessRoute } from "@/lib/permissions";
import { getAllowedCorsOrigins } from '@/lib/env.server';
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
  '/profile',
];

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function applyCorsHeaders(request: NextRequest, response: NextResponse) {
  const origin = request.headers.get('origin');
  const allowedCorsOrigins = getAllowedCorsOrigins();

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

export default async function middleware(req: NextRequest) {
  const session = await auth();
  const { pathname } = req.nextUrl;
  const hostname = req.headers.get('host') || '';
  const cleanHostname = hostname.split(':')[0];
  const url = req.nextUrl.clone();
  const requestId = getRequestId(req);

  const isAuthenticated = !!session;
  const userRole = session?.user?.role || 'MEMBER';

  const isPublicRoute = matchesPrefix(pathname, PUBLIC_ROUTES);
  const isProtectedPage = matchesPrefix(pathname, PROTECTED_PAGE_PREFIXES);
  const isApiRoute = pathname.startsWith('/api');
  const isAsset = pathname.includes('.');
  const isAppRoute = isPublicRoute || isProtectedPage || isApiRoute;

  const finalizeResponse = (response: NextResponse) =>
    attachRequestId(response, requestId);

  const getBaseUrl = (domain: string) => `http${hostname.includes('localhost') ? '' : 's'}://${domain}${hostname.includes(':') ? `:${hostname.split(':')[1]}` : ''}`;

  // --- SUBDOMAIN ROUTING & AUTH ENFORCEMENT ---

  // 1. App Domain (Auth & Main Entry)
  if (cleanHostname === 'app.loomdesk.online') {
    if (pathname === '/') {
      if (isAuthenticated) {
        const targetDomain = (userRole === 'ADMIN' || userRole === 'TEAM_LEAD') 
          ? 'admin.loomdesk.online' 
          : 'dashboard.loomdesk.online';
        return finalizeResponse(NextResponse.redirect(new URL('/', getBaseUrl(targetDomain))));
      }
      return finalizeResponse(NextResponse.redirect(new URL('/login', req.url)));
    }
  }

  // 2. Admin Domain Enforcements
  if (cleanHostname === 'admin.loomdesk.online') {
    if (!isAuthenticated) return finalizeResponse(NextResponse.redirect(new URL('/login', getBaseUrl('app.loomdesk.online'))));
    if (userRole === 'MEMBER') return finalizeResponse(NextResponse.redirect(new URL('/', getBaseUrl('dashboard.loomdesk.online'))));
  }

  // 3. Member Domain Enforcements
  if (cleanHostname === 'dashboard.loomdesk.online') {
    if (!isAuthenticated) return finalizeResponse(NextResponse.redirect(new URL('/login', getBaseUrl('app.loomdesk.online'))));
  }

  // --- REWRITES ---
  let targetPathname = pathname;
  
  if (isAsset) {
    targetPathname = pathname;
  } else if (cleanHostname === 'api.loomdesk.online') {
    targetPathname = pathname.startsWith('/api') ? pathname : `/api${pathname}`;
  } else if (cleanHostname === 'meet.loomdesk.online') {
    targetPathname = pathname.startsWith('/book') ? pathname : `/book${pathname === '/' ? '' : pathname}`;
  } else if (cleanHostname === 'admin.loomdesk.online' || cleanHostname === 'dashboard.loomdesk.online') {
    // Don't prefix if it's an API call or already has the dashboard prefix
    if (pathname.startsWith('/api') || pathname.startsWith('/dashboard')) {
      targetPathname = pathname;
    } else {
      targetPathname = `/dashboard${pathname === '/' ? '' : pathname}`;
    }
  } else if (cleanHostname === 'www.loomdesk.online' || cleanHostname === 'loomdesk.online' || cleanHostname === 'localhost' || cleanHostname.startsWith('192.168.')) {
    // Only rewrite to marketing if it's NOT an app route (to allow login/signup/api to work on localhost)
    if (!isAppRoute) {
      targetPathname = `/home${pathname === '/' ? '' : pathname}`;
    }
  }

  const isTargetApiRoute = targetPathname.startsWith('/api');

  // 1. API Route Logic
  if (isTargetApiRoute) {
    const origin = req.headers.get('origin');
    const allowedCorsOrigins = getAllowedCorsOrigins();
    const isAllowedOrigin = !origin || allowedCorsOrigins.includes(origin);
    const isPublicApiRoute = matchesPrefix(targetPathname, PUBLIC_API_ROUTES);

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

    if (targetPathname !== pathname) {
      url.pathname = targetPathname;
      return finalizeResponse(applyCorsHeaders(req, NextResponse.rewrite(url, { request: { headers: requestHeaders } })));
    }
    
    return finalizeResponse(
      applyCorsHeaders(req, NextResponse.next({ request: { headers: requestHeaders } }))
    );
  }

  // 2. Page Route Logic (for non-subdomain paths if they hit app.loomdesk.online directly)
  // Use the targetPathname here to check if the REWRITTEN route is protected
  const isTargetPublicRoute = matchesPrefix(targetPathname, PUBLIC_ROUTES);
  const isTargetProtectedPage = matchesPrefix(targetPathname, PROTECTED_PAGE_PREFIXES);

  if (isTargetPublicRoute && cleanHostname === 'app.loomdesk.online') {
    if (isAuthenticated) {
      // If they go to app.loomdesk.online/login while logged in, redirect them to their dashboard
      const targetDomain = (userRole === 'ADMIN' || userRole === 'TEAM_LEAD') 
          ? 'admin.loomdesk.online' 
          : 'dashboard.loomdesk.online';
      return finalizeResponse(NextResponse.redirect(new URL('/', getBaseUrl(targetDomain))));
    }
  }

  if (isTargetProtectedPage && !isAuthenticated) {
    const loginUrl = new URL('/login', getBaseUrl('app.loomdesk.online'));
    loginUrl.searchParams.set('redirectTo', pathname);
    return finalizeResponse(NextResponse.redirect(loginUrl));
  }

  // 3. RBAC Logic
  if (isAuthenticated && isTargetProtectedPage && cleanHostname === 'app.loomdesk.online') {
    // If they bypass domains and use relative /dashboard somehow
    if (!canAccessRoute(userRole, targetPathname)) {
      const fallback = targetPathname.startsWith('/dashboard') ? '/dashboard' : '/dashboard';
      return finalizeResponse(NextResponse.redirect(new URL(fallback, req.url)));
    }
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-request-id', requestId);

  if (targetPathname !== pathname) {
    url.pathname = targetPathname;
    return finalizeResponse(NextResponse.rewrite(url, { request: { headers: requestHeaders } }));
  }

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

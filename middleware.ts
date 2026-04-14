import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Public routes (no auth required)
  const publicRoutes = ["/login", "/invite"]
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

  // API routes - skip middleware for auth endpoints
  const isAuthApiRoute = pathname.startsWith("/api/auth")

  // Skip middleware for auth API routes
  if (isAuthApiRoute) {
    return NextResponse.next()
  }

  // Redirect logged in users away from public routes
  // Note: Actual auth validation happens in page components
  if (isPublicRoute) {
    const hasSession = req.cookies.get("next-auth.session-token") || req.cookies.get("__Secure-next-auth.session-token")
    if (hasSession) {
      const dashboardUrl = new URL("/dashboard", req.url)
      return NextResponse.redirect(dashboardUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
}

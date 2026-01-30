import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { UserRole } from "@prisma/client";

/**
 * Extended session user with role information
 */
interface ExtendedSessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  role?: UserRole;
}

/**
 * Public API routes that don't require authentication.
 * These routes are accessible without a valid session.
 */
const PUBLIC_ROUTES = [
  "/api/search/extract",
  "/api/search/parse-feedback",
];

/**
 * Check if a route matches the public routes allowlist
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname === route);
}

/**
 * Check if a route is an auth route (handled by NextAuth)
 */
function isAuthRoute(pathname: string): boolean {
  return pathname.startsWith("/api/auth/");
}

/**
 * Check if a route is an admin API route
 */
function isAdminRoute(pathname: string): boolean {
  return pathname.startsWith("/api/admin/");
}

/**
 * Centralized authentication middleware for API routes.
 *
 * This middleware:
 * - Protects all /api/* routes except /api/auth/* and PUBLIC_ROUTES
 * - Requires ADMIN role for /api/admin/* routes
 * - Returns 401 for unauthenticated requests to protected routes
 * - Returns 403 for non-admin requests to admin routes
 *
 * @see Issue #160: SEC-001 - Security audit finding #5 (HIGH severity)
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Only apply to API routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Skip auth routes (handled by NextAuth)
  if (isAuthRoute(pathname)) {
    return NextResponse.next();
  }

  // Allow public routes without authentication
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Check authentication for protected routes
  const session = req.auth;
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Check admin role for admin routes
  if (isAdminRoute(pathname)) {
    const user = session.user as ExtendedSessionUser;
    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      );
    }
  }

  return NextResponse.next();
});

/**
 * Middleware matcher configuration.
 * Only run middleware on API routes for efficiency.
 */
export const config = {
  matcher: ["/api/:path*"],
};

export const runtime = "nodejs";

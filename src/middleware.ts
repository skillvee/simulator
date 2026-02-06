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
const PUBLIC_API_ROUTES = [
  "/api/search/extract",
  "/api/search/parse-feedback",
];

/**
 * Public page routes that don't require authentication.
 * These routes are accessible without a valid session.
 */
const PUBLIC_PAGE_ROUTES = [
  "/invite",
  "/sign-in",
  "/sign-up",
];

/**
 * Check if a route matches the public API routes allowlist
 */
function isPublicApiRoute(pathname: string): boolean {
  return PUBLIC_API_ROUTES.some((route) => pathname === route);
}

/**
 * Check if a route is a public page route
 */
function isPublicPageRoute(pathname: string): boolean {
  return PUBLIC_PAGE_ROUTES.some((route) => pathname.startsWith(route));
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
function isAdminApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/admin/");
}

/**
 * Check if a route is a recruiter API route
 */
function isRecruiterApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/recruiter/");
}

/**
 * Check if a route is a recruiter page route
 */
function isRecruiterPageRoute(pathname: string): boolean {
  return pathname.startsWith("/recruiter");
}

/**
 * Check if a route is an assessment page route
 */
function isAssessmentPageRoute(pathname: string): boolean {
  return pathname.startsWith("/assessments/");
}

/**
 * Centralized authentication middleware for API and page routes.
 *
 * This middleware:
 * - Protects all /api/* routes except /api/auth/* and PUBLIC_API_ROUTES
 * - Requires ADMIN role for /api/admin/* routes
 * - Requires RECRUITER or ADMIN role for /api/recruiter/* routes
 * - Protects /recruiter/* page routes (requires RECRUITER or ADMIN role)
 * - Protects /assessments/* page routes (requires authentication)
 * - Allows public access to /invite/* routes
 * - Returns 401/redirects for unauthenticated requests to protected routes
 * - Returns 403/redirects for unauthorized role access
 *
 * @see Issue #160: SEC-001 - Security audit finding #5 (HIGH severity)
 * @see Issue #187: RF-019 - Update middleware for new routes
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const user = session?.user as ExtendedSessionUser | undefined;

  // Skip auth routes (handled by NextAuth)
  if (isAuthRoute(pathname)) {
    return NextResponse.next();
  }

  // Allow public page routes without authentication
  if (isPublicPageRoute(pathname)) {
    return NextResponse.next();
  }

  // Handle API routes
  if (pathname.startsWith("/api/")) {
    // Allow public API routes without authentication
    if (isPublicApiRoute(pathname)) {
      return NextResponse.next();
    }

    // Check authentication for protected API routes
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check admin role for admin API routes
    if (isAdminApiRoute(pathname)) {
      if (user?.role !== "ADMIN") {
        return NextResponse.json(
          { success: false, error: "Admin access required" },
          { status: 403 }
        );
      }
    }

    // Check recruiter role for recruiter API routes (RECRUITER or ADMIN allowed)
    if (isRecruiterApiRoute(pathname)) {
      if (user?.role !== "RECRUITER" && user?.role !== "ADMIN") {
        return NextResponse.json(
          { success: false, error: "Recruiter access required" },
          { status: 403 }
        );
      }
    }

    return NextResponse.next();
  }

  // Handle recruiter page routes
  if (isRecruiterPageRoute(pathname)) {
    // Redirect to sign-in if not authenticated
    if (!session?.user) {
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }

    // Check recruiter role (RECRUITER or ADMIN allowed)
    if (user?.role !== "RECRUITER" && user?.role !== "ADMIN") {
      // Redirect to home with error for wrong role
      const homeUrl = new URL("/", req.url);
      homeUrl.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(homeUrl);
    }

    return NextResponse.next();
  }

  // Handle assessment page routes
  if (isAssessmentPageRoute(pathname)) {
    // Redirect to sign-in if not authenticated
    if (!session?.user) {
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }

    // Note: Assessment ownership is verified at the page level, not middleware
    // This is because middleware doesn't have access to database queries
    return NextResponse.next();
  }

  // Redirect authenticated recruiters from home page to dashboard
  if (pathname === "/") {
    if (session?.user && (user?.role === "RECRUITER" || user?.role === "ADMIN")) {
      return NextResponse.redirect(new URL("/recruiter/dashboard", req.url));
    }
  }

  return NextResponse.next();
});

/**
 * Middleware matcher configuration.
 * Run middleware on API routes and protected page routes.
 *
 * Note: /invite/* routes are explicitly public.
 */
export const config = {
  matcher: [
    "/",
    "/api/:path*",
    "/recruiter/:path*",
    "/assessments/:path*",
  ],
};

export const runtime = "nodejs";

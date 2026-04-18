import { auth } from "@/auth";
import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import type { UserRole } from "@prisma/client";
import { routing } from "@/i18n/routing";
import {
  aiChatLimiter,
  aiGenerationLimiter,
  aiAnalysisLimiter,
  applyRateLimit
} from "@/lib/rate-limiter";

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
  "/api/errors",
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
 * Check if a route is a candidate dashboard page route
 */
function isCandidateDashboardRoute(pathname: string): boolean {
  return pathname.startsWith("/candidate/dashboard");
}

/**
 * Check if a route is an admin page route
 */
function isAdminPageRoute(pathname: string): boolean {
  return pathname.startsWith("/admin");
}

/**
 * Base security headers applied to all responses.
 */
const BASE_SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-XSS-Protection": "0",
};

/**
 * Assessment routes need camera and microphone for webcam recording.
 */
const ASSESSMENT_SECURITY_HEADERS: Record<string, string> = {
  ...BASE_SECURITY_HEADERS,
  "Permissions-Policy": "camera=(self), microphone=(self), geolocation=()",
};

/**
 * Apply security headers and trace ID to a NextResponse.
 * If the request has an x-trace-id header, it is propagated; otherwise a new one is generated.
 */
function applySecurityHeaders(
  response: NextResponse,
  pathname: string,
  traceId?: string
): NextResponse {
  const headers =
    pathname.startsWith("/assessments/") ||
    pathname.startsWith("/recruiter/")
      ? ASSESSMENT_SECURITY_HEADERS
      : BASE_SECURITY_HEADERS;

  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }

  if (traceId) {
    response.headers.set("x-trace-id", traceId);
  }

  return response;
}

/**
 * Create the base i18n middleware
 */
const intlMiddleware = createMiddleware(routing);

/**
 * Combined middleware for i18n and authentication.
 *
 * This middleware:
 * - Handles locale routing for all page routes
 * - Adds security headers to all responses
 * - Protects all /api/* routes except /api/auth/* and PUBLIC_API_ROUTES
 * - Requires ADMIN role for /api/admin/* routes
 * - Requires RECRUITER or ADMIN role for /api/recruiter/* routes
 * - Protects /admin/* page routes (requires ADMIN role)
 * - Protects /recruiter/* page routes (requires RECRUITER or ADMIN role)
 * - Protects /assessments/* page routes (requires authentication)
 * - Allows public access to /invite/* routes
 * - Returns 401/redirects for unauthenticated requests to protected routes
 * - Returns 403/redirects for unauthorized role access
 *
 * @see Issue #160: SEC-001 - Security audit finding #5 (HIGH severity)
 * @see Issue #187: RF-019 - Update middleware for new routes
 * @see Issue #264: AUDIT-010 - Security headers
 * @see Run 010: Admin route protection fix
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const user = session?.user as ExtendedSessionUser | undefined;

  // Extract or generate trace ID for end-to-end request tracing
  const traceId =
    req.headers.get("x-trace-id") || crypto.randomUUID();

  // For API routes, skip i18n processing
  if (pathname.startsWith("/api/")) {
    // Skip auth routes (handled by NextAuth)
    if (isAuthRoute(pathname)) {
      return applySecurityHeaders(NextResponse.next(), pathname, traceId);
    }

    // Apply rate limiting to AI endpoints BEFORE authentication
    // This prevents unauthenticated DoS attacks
    if (pathname.startsWith("/api/chat")) {
      const { limited, remaining } = applyRateLimit(req, aiChatLimiter);
      if (limited) {
        return applySecurityHeaders(
          NextResponse.json(
            {
              success: false,
              error: "Rate limit exceeded. Please try again later.",
              retryAfter: 60
            },
            {
              status: 429,
              headers: {
                'X-RateLimit-Limit': '30',
                'X-RateLimit-Remaining': remaining.toString(),
                'X-RateLimit-Reset': new Date(Date.now() + 60000).toISOString()
              }
            }
          ),
          pathname
        );
      }
    } else if (
      pathname.startsWith("/api/recruiter/simulations/generate") ||
      pathname.startsWith("/api/recruiter/simulations/parse")
    ) {
      const { limited, remaining } = applyRateLimit(req, aiGenerationLimiter);
      if (limited) {
        return applySecurityHeaders(
          NextResponse.json(
            {
              success: false,
              error: "Rate limit exceeded for generation. Please wait before trying again.",
              retryAfter: 60
            },
            {
              status: 429,
              headers: {
                'X-RateLimit-Limit': '5',
                'X-RateLimit-Remaining': remaining.toString(),
                'X-RateLimit-Reset': new Date(Date.now() + 60000).toISOString()
              }
            }
          ),
          pathname
        );
      }
    } else if (
      pathname.startsWith("/api/assessment/report") ||
      pathname.startsWith("/api/assessment/finalize")
    ) {
      const { limited, remaining } = applyRateLimit(req, aiAnalysisLimiter);
      if (limited) {
        return applySecurityHeaders(
          NextResponse.json(
            {
              success: false,
              error: "Rate limit exceeded for analysis. Please wait before trying again.",
              retryAfter: 60
            },
            {
              status: 429,
              headers: {
                'X-RateLimit-Limit': '10',
                'X-RateLimit-Remaining': remaining.toString(),
                'X-RateLimit-Reset': new Date(Date.now() + 60000).toISOString()
              }
            }
          ),
          pathname
        );
      }
    }

    // Allow public API routes without authentication
    if (isPublicApiRoute(pathname)) {
      return applySecurityHeaders(NextResponse.next(), pathname, traceId);
    }

    // Check authentication for protected API routes
    if (!session?.user) {
      return applySecurityHeaders(
        NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 }
        ),
        pathname
      );
    }

    // Check admin role for admin API routes
    if (isAdminApiRoute(pathname)) {
      if (user?.role !== "ADMIN") {
        return applySecurityHeaders(
          NextResponse.json(
            { success: false, error: "Admin access required" },
            { status: 403 }
          ),
          pathname
        );
      }
    }

    // Check recruiter role for recruiter API routes (RECRUITER or ADMIN allowed)
    if (isRecruiterApiRoute(pathname)) {
      if (user?.role !== "RECRUITER" && user?.role !== "ADMIN") {
        return applySecurityHeaders(
          NextResponse.json(
            { success: false, error: "Recruiter access required" },
            { status: 403 }
          ),
          pathname
        );
      }
    }

    return applySecurityHeaders(NextResponse.next(), pathname, traceId);
  }

  // For page routes, we need to handle i18n
  const locales = routing.locales;
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  // Extract locale and pathname without locale for route checks
  let pathWithoutLocale = pathname;
  let currentLocale = routing.defaultLocale;

  if (pathnameHasLocale) {
    const pathSegments = pathname.split("/");
    currentLocale = pathSegments[1] as "en" | "es";
    pathWithoutLocale = "/" + pathSegments.slice(2).join("/") || "/";
  }

  // Skip auth routes (handled by NextAuth)
  if (isAuthRoute(pathname)) {
    return applySecurityHeaders(intlMiddleware(req as NextRequest), pathname, traceId);
  }

  // Allow public page routes without authentication
  if (isPublicPageRoute(pathWithoutLocale)) {
    return applySecurityHeaders(intlMiddleware(req as NextRequest), pathname, traceId);
  }

  // Handle candidate dashboard routes (any authenticated user)
  if (isCandidateDashboardRoute(pathWithoutLocale)) {
    if (!session?.user) {
      const signInUrl = new URL(`/${currentLocale}/sign-in`, req.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return applySecurityHeaders(NextResponse.redirect(signInUrl), pathname, traceId);
    }
    return applySecurityHeaders(intlMiddleware(req as NextRequest), pathname, traceId);
  }

  // Handle recruiter page routes
  if (isRecruiterPageRoute(pathWithoutLocale)) {
    // Redirect to sign-in if not authenticated
    if (!session?.user) {
      const signInUrl = new URL(`/${currentLocale}/sign-in`, req.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return applySecurityHeaders(NextResponse.redirect(signInUrl), pathname, traceId);
    }

    // Check recruiter role (RECRUITER or ADMIN allowed)
    if (user?.role !== "RECRUITER" && user?.role !== "ADMIN") {
      // Redirect candidates to their own dashboard instead of showing an error
      const redirectUrl = new URL(`/${currentLocale}/candidate/dashboard`, req.url);
      return applySecurityHeaders(NextResponse.redirect(redirectUrl), pathname, traceId);
    }

    return applySecurityHeaders(intlMiddleware(req as NextRequest), pathname, traceId);
  }

  // Handle assessment page routes
  if (isAssessmentPageRoute(pathWithoutLocale)) {
    // Redirect to sign-in if not authenticated
    if (!session?.user) {
      const signInUrl = new URL(`/${currentLocale}/sign-in`, req.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return applySecurityHeaders(NextResponse.redirect(signInUrl), pathname, traceId);
    }

    // Note: Assessment ownership is verified at the page level, not middleware
    // This is because middleware doesn't have access to database queries
    return applySecurityHeaders(intlMiddleware(req as NextRequest), pathname, traceId);
  }

  // Handle admin page routes
  if (isAdminPageRoute(pathWithoutLocale)) {
    // Redirect to sign-in if not authenticated
    if (!session?.user) {
      const signInUrl = new URL(`/${currentLocale}/sign-in`, req.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return applySecurityHeaders(NextResponse.redirect(signInUrl), pathname, traceId);
    }

    // Check admin role (only ADMIN allowed)
    if (user?.role !== "ADMIN") {
      // Redirect to the user's appropriate dashboard
      if (user?.role === "RECRUITER") {
        const redirectUrl = new URL(`/${currentLocale}/recruiter/dashboard`, req.url);
        return applySecurityHeaders(NextResponse.redirect(redirectUrl), pathname, traceId);
      }
      const redirectUrl = new URL(`/${currentLocale}/candidate/dashboard`, req.url);
      return applySecurityHeaders(NextResponse.redirect(redirectUrl), pathname, traceId);
    }

    return applySecurityHeaders(intlMiddleware(req as NextRequest), pathname, traceId);
  }

  // Redirect authenticated users from home page to their dashboard
  if (pathWithoutLocale === "/") {
    if (session?.user) {
      if (user?.role === "ADMIN") {
        const redirectUrl = new URL(`/${currentLocale}/admin`, req.url);
        return applySecurityHeaders(NextResponse.redirect(redirectUrl), pathname, traceId);
      }
      if (user?.role === "RECRUITER") {
        const redirectUrl = new URL(`/${currentLocale}/recruiter/dashboard`, req.url);
        return applySecurityHeaders(NextResponse.redirect(redirectUrl), pathname, traceId);
      }
      // Candidates (USER role) go to candidate dashboard
      const redirectUrl = new URL(`/${currentLocale}/candidate/dashboard`, req.url);
      return applySecurityHeaders(NextResponse.redirect(redirectUrl), pathname, traceId);
    }
  }

  // For all other routes, apply i18n middleware
  return applySecurityHeaders(intlMiddleware(req as NextRequest), pathname, traceId);
});

/**
 * Middleware matcher configuration.
 * Run middleware on all routes except static files and _next paths.
 *
 * Note: /invite/* routes are explicitly public.
 */
export const config = {
  matcher: [
    "/",
    "/(en|es)/:path*",
    "/((?!_next|_vercel|.*\\..*).*)",
    "/api/:path*",
  ],
};

export const runtime = "nodejs";
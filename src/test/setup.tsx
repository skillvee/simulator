/**
 * Vitest Test Setup
 *
 * This file runs before each test file and configures the test environment.
 * It sets up global mocks, extends matchers, and configures the testing environment.
 *
 * @see Issue #98: REF-008
 * @see Issue #110: BUG-001
 */

import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// ============================================================================
// External Service Mocks (must be before any imports that use them)
// ============================================================================

/**
 * Mock @supabase/supabase-js
 *
 * Prevents Supabase client initialization which requires env vars.
 * Tests that need specific supabase behavior should mock @/lib/external directly.
 * @see Issue #110: BUG-001
 */
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        createSignedUrl: () =>
          Promise.resolve({
            data: { signedUrl: "https://test.com/mock-signed-url" },
          }),
        upload: () => Promise.resolve({ data: { path: "mock-path" } }),
        remove: () => Promise.resolve({ data: [] }),
        download: () => Promise.resolve({ data: null, error: null }),
        getPublicUrl: () => ({
          data: { publicUrl: "https://test.com/mock-url" },
        }),
      }),
    },
    auth: {
      signOut: () => Promise.resolve({ error: null }),
    },
  }),
}));

/**
 * Mock @t3-oss/env-nextjs
 *
 * Prevents env validation which requires real environment variables.
 * Tests that need specific env values should mock @/lib/core directly.
 * @see Issue #110: BUG-001
 */
vi.mock("@t3-oss/env-nextjs", () => ({
  createEnv: () => ({
    DATABASE_URL: "postgresql://localhost:5432/test",
    DIRECT_URL: "postgresql://localhost:5432/test",
    AUTH_SECRET: "test-secret",
    GOOGLE_CLIENT_ID: "test-google-id",
    GOOGLE_CLIENT_SECRET: "test-google-secret",
    GEMINI_API_KEY: "test-gemini-key",
    SUPABASE_SERVICE_ROLE_KEY: "test-supabase-key",
    NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    E2E_TEST_MODE: false,
    NEXT_PUBLIC_E2E_TEST_MODE: false,
    RESEND_API_KEY: undefined,
    GITHUB_TOKEN: "mock-github-token",
  }),
}));

/**
 * Mock @/auth (NextAuth)
 *
 * Prevents next-auth from trying to import next/server during test setup.
 * Tests that need specific auth behavior should override this mock.
 * @see Issue #110: BUG-001
 */
vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: { GET: vi.fn(), POST: vi.fn() },
}));

// ============================================================================
// Global Mocks
// ============================================================================

/**
 * Mock next/navigation
 *
 * Provides mock implementations for Next.js navigation hooks.
 * These are commonly used in components and need to be mocked for testing.
 */
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

/**
 * Mock next/image
 *
 * Next.js Image component requires server-side optimization.
 * Replace with a standard img element for testing.
 */
vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

/**
 * Mock next/link
 *
 * Next.js Link component for client-side navigation.
 * Replace with a standard anchor element for testing.
 */
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// ============================================================================
// Browser API Mocks
// ============================================================================

/**
 * Mock window.matchMedia
 *
 * Used by many UI libraries for responsive design.
 * Provides a basic implementation that always returns false.
 */
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

/**
 * Mock window.scrollTo
 *
 * Window scroll method used by various components.
 */
Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: vi.fn(),
});

/**
 * Mock IntersectionObserver
 *
 * Used for lazy loading and infinite scroll features.
 */
class MockIntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = "";
  readonly thresholds: readonly number[] = [];

  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn().mockReturnValue([]);
}

Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  value: MockIntersectionObserver,
});

/**
 * Mock ResizeObserver
 *
 * Used for responsive components that need to track element sizes.
 */
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  value: MockResizeObserver,
});

/**
 * Mock URL.createObjectURL and revokeObjectURL
 *
 * Used for blob handling, file previews, etc.
 */
Object.defineProperty(URL, "createObjectURL", {
  writable: true,
  value: vi.fn().mockReturnValue("blob:mock-url"),
});

Object.defineProperty(URL, "revokeObjectURL", {
  writable: true,
  value: vi.fn(),
});

// ============================================================================
// Console Suppression (Optional)
// ============================================================================

/**
 * Suppress specific console warnings in tests.
 *
 * Uncomment to suppress common React warnings that clutter test output.
 * Be careful with this - only suppress known safe warnings.
 */
// const originalError = console.error;
// console.error = (...args) => {
//   if (
//     typeof args[0] === "string" &&
//     args[0].includes("Warning: ReactDOM.render is no longer supported")
//   ) {
//     return;
//   }
//   originalError.call(console, ...args);
// };

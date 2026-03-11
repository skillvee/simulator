/**
 * Test Utilities
 *
 * Provides helper functions for testing React components.
 *
 * @example
 * import { renderWithProviders, waitForAsync } from "@/test/utils";
 *
 * test("renders component", () => {
 *   renderWithProviders(<MyComponent />);
 *   expect(screen.getByText("Hello")).toBeInTheDocument();
 * });
 *
 * @see Issue #98: REF-008
 */

import {
  render,
  type RenderOptions,
  type RenderResult,
} from "@testing-library/react";
import { SessionProvider } from "next-auth/react";
import type { ReactElement, ReactNode } from "react";

/**
 * Custom render options that extend the default testing-library options.
 */
export interface RenderWithProvidersOptions extends Omit<
  RenderOptions,
  "wrapper"
> {
  /**
   * Custom session data to use in tests.
   * If not provided, defaults to an unauthenticated session.
   */
  session?: {
    user?: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
    expires?: string;
  } | null;
}

/**
 * Wrapper component that provides all necessary context providers.
 */
function AllProviders({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

/**
 * Renders a component wrapped with all necessary providers (SessionProvider, etc.).
 *
 * This is the recommended way to render components in tests as it ensures
 * all context providers are available.
 *
 * @example
 * // Basic usage
 * renderWithProviders(<MyComponent />);
 *
 * @example
 * // With custom container
 * const { container } = renderWithProviders(<MyComponent />, {
 *   container: document.getElementById("root")!,
 * });
 *
 * @example
 * // With rerender
 * const { rerender } = renderWithProviders(<MyComponent prop="initial" />);
 * rerender(<MyComponent prop="updated" />);
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: RenderWithProvidersOptions
): RenderResult {
  const { ...renderOptions } = options ?? {};

  return render(ui, {
    wrapper: AllProviders,
    ...renderOptions,
  });
}

/**
 * Waits for a specified amount of time.
 *
 * Useful for waiting for async operations in tests, though prefer
 * using testing-library's waitFor when possible.
 *
 * @param ms - Number of milliseconds to wait. Defaults to 0 (next tick).
 *
 * @example
 * // Wait for 100ms
 * await waitForAsync(100);
 *
 * @example
 * // Wait for next tick
 * await waitForAsync();
 */
export function waitForAsync(ms = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Re-export commonly used testing utilities for convenience.
 */
export { screen, waitFor, fireEvent, within } from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";

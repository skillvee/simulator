/**
 * User Factory
 *
 * Creates mock User objects for testing.
 * @see Issue #98: REF-008
 */

import type { User } from "@prisma/client";
import { UserRole } from "@prisma/client";

/**
 * Creates a mock User with sensible defaults.
 * All fields can be overridden via the overrides parameter.
 *
 * @example
 * // Create with defaults
 * const user = createMockUser();
 *
 * @example
 * // Create admin user
 * const admin = createMockUser({ role: UserRole.ADMIN });
 *
 * @example
 * // Create user with specific email
 * const user = createMockUser({
 *   email: "jane@example.com",
 *   name: "Jane Doe",
 * });
 */
export function createMockUser(overrides?: Partial<User>): User {
  const now = new Date();

  return {
    id: "test-user-id",
    name: "Test User",
    email: "test@example.com",
    emailVerified: null,
    image: null,
    password: null,
    role: UserRole.USER,
    preferredLanguage: "en",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    dataDeleteRequestedAt: null,
    ...overrides,
  };
}

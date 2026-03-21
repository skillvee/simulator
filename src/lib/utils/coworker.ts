/**
 * Check if a coworker is a manager based on their role string.
 */
export function isManager(role: string): boolean {
  return role.toLowerCase().includes("manager");
}

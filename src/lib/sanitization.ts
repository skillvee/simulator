/**
 * Sanitization utilities for preventing XSS attacks
 */

/**
 * Sanitizes user input to prevent XSS attacks by escaping HTML special characters
 * @param input - The user input string to sanitize
 * @returns The sanitized string safe for display in HTML
 */
export function sanitizeHtml(input: string): string {
  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };

  return input.replace(/[&<>"'`=/]/g, (char) => htmlEscapeMap[char] || char);
}

/**
 * Sanitizes user input for storage in database
 * Removes any script tags and dangerous HTML while preserving basic text
 * @param input - The user input string to sanitize
 * @returns The sanitized string safe for storage
 */
export function sanitizeForStorage(input: string): string {
  // Remove script tags and their content
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove on* event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');

  // Trim whitespace
  return sanitized.trim();
}
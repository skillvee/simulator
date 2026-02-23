/**
 * Simple in-memory rate limiter for AI endpoints
 *
 * Prevents abuse of expensive AI operations by limiting requests per IP.
 * Uses a sliding window approach with in-memory storage.
 *
 * @see Agent 10 QA Run-001: Critical finding - no rate limiting on AI endpoints
 */

interface RateLimitEntry {
  requests: number[];  // Timestamps of requests
  blocked?: boolean;
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(windowMs: number = 60000, maxRequests: number = 10) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Clean up old entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Check if a request should be rate limited
   * @param identifier - Usually IP address or user ID
   * @returns true if request should be blocked
   */
  isRateLimited(identifier: string): boolean {
    const now = Date.now();
    const entry = this.store.get(identifier) || { requests: [] };

    // Remove requests outside the window
    entry.requests = entry.requests.filter(
      timestamp => now - timestamp < this.windowMs
    );

    // Check if limit exceeded
    if (entry.requests.length >= this.maxRequests) {
      entry.blocked = true;
      this.store.set(identifier, entry);
      return true;
    }

    // Add current request
    entry.requests.push(now);
    entry.blocked = false;
    this.store.set(identifier, entry);

    return false;
  }

  /**
   * Get remaining requests for an identifier
   */
  getRemainingRequests(identifier: string): number {
    const now = Date.now();
    const entry = this.store.get(identifier);

    if (!entry) return this.maxRequests;

    const validRequests = entry.requests.filter(
      timestamp => now - timestamp < this.windowMs
    );

    return Math.max(0, this.maxRequests - validRequests.length);
  }

  /**
   * Clean up old entries to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now();

    this.store.forEach((entry, key) => {
      const validRequests = entry.requests.filter(
        timestamp => now - timestamp < this.windowMs
      );

      if (validRequests.length === 0) {
        this.store.delete(key);
      } else {
        entry.requests = validRequests;
        this.store.set(key, entry);
      }
    });
  }

  /**
   * Destroy the rate limiter and clean up resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }
}

// Rate limiters for different endpoint categories
export const aiChatLimiter = new RateLimiter(60000, 30);  // 30 requests per minute for chat
export const aiGenerationLimiter = new RateLimiter(60000, 5);  // 5 requests per minute for generation
export const aiAnalysisLimiter = new RateLimiter(60000, 10);  // 10 requests per minute for analysis

/**
 * Get the client IP address from the request
 */
export function getClientIp(req: Request): string {
  // Try various headers that might contain the client IP
  const headers = req.headers;
  const forwardedFor = headers.get('x-forwarded-for');
  const realIp = headers.get('x-real-ip');
  const cfConnectingIp = headers.get('cf-connecting-ip');

  if (forwardedFor) {
    // x-forwarded-for may contain multiple IPs, get the first one
    return forwardedFor.split(',')[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback to a default if we can't determine the IP
  // In production, this should be properly configured
  return 'unknown';
}

/**
 * Apply rate limiting to AI endpoints
 */
export function applyRateLimit(
  req: Request,
  limiter: RateLimiter,
  identifier?: string
): { limited: boolean; remaining: number } {
  const id = identifier || getClientIp(req);
  const limited = limiter.isRateLimited(id);
  const remaining = limiter.getRemainingRequests(id);

  return { limited, remaining };
}
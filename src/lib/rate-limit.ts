/**
 * Simple in-memory rate limiter for API routes
 *
 * For production, consider using Redis-based rate limiting
 * with the existing Redis connection.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting
// Note: This resets on server restart and doesn't work across multiple instances
// For production, use Redis-based rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Check and update rate limit for a given identifier
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { limit: 100, windowSeconds: 60 }
): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const key = identifier;

  let entry = rateLimitStore.get(key);

  // If no entry or entry has expired, create a new one
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(key, entry);

    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      reset: entry.resetTime,
    };
  }

  // Increment the count
  entry.count++;
  rateLimitStore.set(key, entry);

  // Check if over limit
  if (entry.count > config.limit) {
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      reset: entry.resetTime,
    };
  }

  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - entry.count,
    reset: entry.resetTime,
  };
}

/**
 * Create rate limit headers for the response
 */
export function rateLimitHeaders(
  result: RateLimitResult
): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
  };
}

/**
 * Get client identifier from request (IP address or user ID)
 */
export function getClientIdentifier(request: Request, userId?: string): string {
  // Prefer user ID if authenticated
  if (userId) {
    return `user:${userId}`;
  }

  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  return `ip:${ip}`;
}

// Preset configurations for different route types
export const RateLimitPresets = {
  /** Standard API routes - 100 requests per minute */
  standard: { limit: 100, windowSeconds: 60 },

  /** Auth routes - 10 requests per minute (strict) */
  auth: { limit: 10, windowSeconds: 60 },

  /** Email sending - 5 sends per minute per user */
  emailSend: { limit: 5, windowSeconds: 60 },

  /** AI generation - 20 requests per minute */
  aiGeneration: { limit: 20, windowSeconds: 60 },

  /** Webhook endpoints - 1000 per minute (high volume) */
  webhook: { limit: 1000, windowSeconds: 60 },

  /** Import operations - 5 per hour */
  import: { limit: 5, windowSeconds: 3600 },
} as const;

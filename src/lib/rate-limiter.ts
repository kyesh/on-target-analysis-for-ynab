/**
 * Rate Limiter Implementation
 * YNAB API allows 200 requests per hour per access token
 */

import { createRateLimitError } from './errors';

interface RequestRecord {
  timestamp: number;
  endpoint: string;
}

export class RateLimiter {
  private requests: Map<string, RequestRecord[]> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 200, windowHours: number = 1) {
    this.maxRequests = maxRequests;
    this.windowMs = windowHours * 60 * 60 * 1000; // Convert hours to milliseconds
  }

  /**
   * Check if a request can be made
   */
  canMakeRequest(identifier: string = 'default', endpoint: string = ''): boolean {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];

    // Remove requests outside the window
    const validRequests = requests.filter(req => now - req.timestamp < this.windowMs);

    // Check if we're at the limit
    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    // Add current request
    validRequests.push({ timestamp: now, endpoint });
    this.requests.set(identifier, validRequests);

    return true;
  }

  /**
   * Get time until rate limit resets (in milliseconds)
   */
  getTimeUntilReset(identifier: string = 'default'): number {
    const requests = this.requests.get(identifier) || [];
    if (requests.length === 0) return 0;

    const oldestRequest = Math.min(...requests.map(req => req.timestamp));
    const resetTime = oldestRequest + this.windowMs;

    return Math.max(0, resetTime - Date.now());
  }

  /**
   * Get current request count for identifier
   */
  getCurrentRequestCount(identifier: string = 'default'): number {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    
    // Count only valid requests within the window
    return requests.filter(req => now - req.timestamp < this.windowMs).length;
  }

  /**
   * Get remaining requests for identifier
   */
  getRemainingRequests(identifier: string = 'default'): number {
    return Math.max(0, this.maxRequests - this.getCurrentRequestCount(identifier));
  }

  /**
   * Get rate limit status
   */
  getStatus(identifier: string = 'default') {
    const currentCount = this.getCurrentRequestCount(identifier);
    const remaining = this.getRemainingRequests(identifier);
    const resetTime = this.getTimeUntilReset(identifier);

    return {
      limit: this.maxRequests,
      used: currentCount,
      remaining,
      resetTime,
      resetAt: new Date(Date.now() + resetTime).toISOString()
    };
  }

  /**
   * Enforce rate limit - throws error if limit exceeded
   */
  enforceLimit(identifier: string = 'default', endpoint: string = ''): void {
    if (!this.canMakeRequest(identifier, endpoint)) {
      const resetTime = this.getTimeUntilReset(identifier);
      throw createRateLimitError(resetTime);
    }
  }

  /**
   * Clear all rate limit data (useful for testing)
   */
  clear(): void {
    this.requests.clear();
  }

  /**
   * Clear rate limit data for specific identifier
   */
  clearIdentifier(identifier: string): void {
    this.requests.delete(identifier);
  }

  /**
   * Get request history for debugging (development only)
   */
  getRequestHistory(identifier: string = 'default'): RequestRecord[] {
    if (process.env.NODE_ENV !== 'development') {
      return [];
    }
    
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    
    return requests
      .filter(req => now - req.timestamp < this.windowMs)
      .sort((a, b) => b.timestamp - a.timestamp);
  }
}

// Global rate limiter instance
export const globalRateLimiter = new RateLimiter(200, 1); // 200 requests per hour

// Rate limiter middleware for API calls
export function withRateLimit<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  identifier?: string,
  endpoint?: string
): T {
  return (async (...args: Parameters<T>) => {
    globalRateLimiter.enforceLimit(identifier, endpoint);
    return await fn(...args);
  }) as T;
}

// Utility to wait for rate limit reset
export async function waitForRateLimit(identifier: string = 'default'): Promise<void> {
  const resetTime = globalRateLimiter.getTimeUntilReset(identifier);
  
  if (resetTime > 0) {
    console.warn(`Rate limit exceeded. Waiting ${Math.ceil(resetTime / 1000)} seconds...`);
    await new Promise(resolve => setTimeout(resolve, resetTime));
  }
}

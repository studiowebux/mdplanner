/**
 * In-memory sliding-window rate limiter per IP.
 *
 * Tracks request timestamps per key (IP). Requests outside the window are
 * pruned on each check. Returns remaining quota and reset time.
 */

interface RateLimitEntry {
  timestamps: number[];
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export interface RateLimitConfig {
  /** Maximum requests allowed within the window. */
  maxRequests: number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

export class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private config: RateLimitConfig;
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor(config: RateLimitConfig) {
    this.config = config;
    // Periodic cleanup of stale entries every 60 seconds
    this.cleanupTimer = setInterval(() => this.cleanup(), 60_000);
  }

  check(key: string): RateLimitResult {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    let entry = this.store.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      this.store.set(key, entry);
    }

    // Prune timestamps outside the window
    entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

    if (entry.timestamps.length >= this.config.maxRequests) {
      const oldest = entry.timestamps[0];
      return {
        allowed: false,
        remaining: 0,
        resetAt: oldest + this.config.windowMs,
      };
    }

    entry.timestamps.push(now);
    return {
      allowed: true,
      remaining: this.config.maxRequests - entry.timestamps.length,
      resetAt: now + this.config.windowMs,
    };
  }

  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    for (const [key, entry] of this.store) {
      entry.timestamps = entry.timestamps.filter((t) => t > windowStart);
      if (entry.timestamps.length === 0) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupTimer);
    this.store.clear();
  }
}

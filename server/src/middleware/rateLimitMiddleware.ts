import type { Request, Response, NextFunction } from 'express';

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

interface BucketEntry {
  count: number;
  resetAt: number;
}

/**
 * Lightweight sliding-window rate limiter for Express REST routes.
 */
export const createRateLimiter = ({
  windowMs,
  maxRequests,
  message = 'Too many requests, please try again later.',
}: RateLimitOptions) => {
  const buckets = new Map<string, BucketEntry>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const clientIp =
      (typeof req.headers['x-forwarded-for'] === 'string'
        ? req.headers['x-forwarded-for'].split(',')[0]?.trim()
        : undefined) ||
      req.ip ||
      'unknown';
    const key = `${clientIp}:${req.path}`;

    let bucket = buckets.get(key);
    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    const remaining = Math.max(0, maxRequests - bucket.count);
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(remaining));

    if (bucket.count > maxRequests) {
      const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));
      res.status(429).json({ error: message });
      return;
    }

    next();
  };
};

/**
 * Per-socket / per-user event rate limiter for Socket.IO handlers.
 */
export class SocketEventRateLimiter {
  private buckets = new Map<string, BucketEntry>();
  private readonly windowMs: number;
  private readonly maxEvents: number;

  constructor(windowMs: number, maxEvents: number) {
    this.windowMs = windowMs;
    this.maxEvents = maxEvents;
  }

  consume(key: string): boolean {
    const now = Date.now();
    let bucket = this.buckets.get(key);
    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + this.windowMs };
      this.buckets.set(key, bucket);
    }

    bucket.count += 1;
    return bucket.count <= this.maxEvents;
  }
}

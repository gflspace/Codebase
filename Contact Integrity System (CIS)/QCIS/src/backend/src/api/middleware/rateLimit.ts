// QwickServices CIS — Rate Limiting Middleware (GAP-04)
// In-memory sliding window rate limiters with configurable thresholds.

import { Request, Response, NextFunction } from 'express';
import { config } from '../../config';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

function createRateLimiter(opts: {
  windowMs: number;
  max: number;
  keyFn?: (req: Request) => string;
  skipPaths?: string[];
}) {
  const store = new Map<string, RateLimitEntry>();

  // Cleanup stale entries every minute
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
  }, 60_000);
  cleanup.unref();

  const keyFn = opts.keyFn || ((req: Request) => {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.socket.remoteAddress
      || 'unknown';
  });

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip health check
    if (opts.skipPaths?.some((p) => req.path === p || req.path.startsWith(p))) {
      next();
      return;
    }

    // Only limit mutating methods for write limiter
    if (opts.max === config.rateLimit.writeMax && req.method === 'GET') {
      next();
      return;
    }

    const key = keyFn(req);
    const now = Date.now();
    let entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + opts.windowMs };
      store.set(key, entry);
    }

    entry.count++;

    // Set standard rate limit headers
    const remaining = Math.max(0, opts.max - entry.count);
    const resetSec = Math.ceil((entry.resetAt - now) / 1000);
    res.setHeader('X-RateLimit-Limit', opts.max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetSec);

    if (entry.count > opts.max) {
      res.setHeader('Retry-After', resetSec);
      res.status(429).json({
        error: 'Too many requests',
        retryAfterSeconds: resetSec,
      });
      return;
    }

    next();
  };
}

/** Global: 100 req/min per IP (skip /health) */
export const globalLimiter = createRateLimiter({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  skipPaths: ['/health'],
});

/** AI endpoints: 10 req/min per IP */
export const aiLimiter = createRateLimiter({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.aiMax,
});

/** Write endpoints: 30 mutating req/min per IP (GET passes through) */
export const writeLimiter = createRateLimiter({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.writeMax,
});

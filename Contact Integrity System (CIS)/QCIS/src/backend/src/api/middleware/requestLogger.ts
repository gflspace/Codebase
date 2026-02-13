import type { Request, Response, NextFunction } from 'express';
import { createLogger } from '../../shared/logger';

const logger = createLogger('http');

// ─── Request Logging Middleware ───────────────────────────────────

const SKIP_PATHS = new Set(['/api/health', '/api/metrics', '/api/ready']);

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  // Skip noisy health check endpoints
  if (SKIP_PATHS.has(req.path)) {
    return next();
  }

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, path } = req;
    const status = res.statusCode;

    // Determine log level based on status code
    let logLevel: 'error' | 'warn' | 'info';
    if (status >= 500) {
      logLevel = 'error';
    } else if (status >= 400) {
      logLevel = 'warn';
    } else {
      logLevel = 'info';
    }

    // Extract relevant metadata
    const meta: Record<string, unknown> = {
      method,
      path,
      status,
      duration_ms: duration,
      ip: req.ip || req.socket.remoteAddress,
      user_agent: req.get('user-agent'),
    };

    // Add user context if available (from auth middleware)
    if ((req as any).user?.id) {
      meta.user_id = (req as any).user.id;
    }

    // Log the request
    const msg = 'Request completed';
    logger[logLevel](msg, meta);
  });

  next();
}

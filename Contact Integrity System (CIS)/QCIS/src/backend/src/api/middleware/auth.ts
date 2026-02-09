import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../../config';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      adminUser?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

export function authenticateJWT(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as {
      id: string;
      email: string;
      role: string;
    };
    req.adminUser = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.adminUser) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (!roles.includes(req.adminUser.role)) {
      res.status(403).json({
        error: 'Insufficient permissions',
        required: roles,
        current: req.adminUser.role,
      });
      return;
    }

    next();
  };
}

export function verifyHMAC(req: Request, res: Response, next: NextFunction): void {
  const signature = req.headers['x-hmac-signature'] as string;
  const timestamp = req.headers['x-hmac-timestamp'] as string;

  if (!signature || !timestamp) {
    res.status(401).json({ error: 'Missing HMAC headers' });
    return;
  }

  // Reject requests older than 5 minutes (replay protection)
  const requestTime = parseInt(timestamp, 10);
  const now = Date.now();
  if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
    res.status(401).json({ error: 'Request timestamp too old' });
    return;
  }

  const body = JSON.stringify(req.body);
  const expected = crypto
    .createHmac('sha256', config.hmac.secret)
    .update(`${timestamp}.${body}`)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    res.status(401).json({ error: 'Invalid HMAC signature' });
    return;
  }

  next();
}

export function generateToken(user: { id: string; email: string; role: string }): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn as jwt.SignOptions["expiresIn"] }
  );
}

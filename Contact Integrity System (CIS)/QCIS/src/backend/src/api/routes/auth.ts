import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from '../../database/connection';
import { generateToken, authenticateJWT } from '../middleware/auth';
import { resolvePermissions } from '../middleware/permissions';
import { validate } from '../middleware/validation';
import { loginSchema } from '../schemas';

const router = Router();

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

// ─── IP-based rate limiting for login ───────────────────────────
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 10; // max attempts per window per IP

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of loginAttempts) {
    if (now > entry.resetAt) loginAttempts.delete(ip);
  }
}, 5 * 60 * 1000).unref();

function rateLimit(req: Request, res: Response): boolean {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false; // not limited
  }

  entry.count++;

  if (entry.count > RATE_LIMIT_MAX) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    res.set('Retry-After', String(retryAfterSec));
    res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
    return true; // limited
  }

  return false;
}

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  if (rateLimit(req, res)) return;

  try {
    const { email, password } = req.body;

    const result = await query(
      `SELECT id, email, name, role, password_hash, active,
              force_password_change, failed_login_attempts, locked_until
       FROM admin_users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const user = result.rows[0];

    if (!user.active) {
      res.status(401).json({ error: 'Account is deactivated' });
      return;
    }

    // Check lockout
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const remaining = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
      res.status(423).json({ error: `Account locked. Try again in ${remaining} minutes.` });
      return;
    }

    // Compare password: support bcrypt (preferred) and SHA256 (legacy)
    let passwordValid = false;
    if (user.password_hash.startsWith('$2a$') || user.password_hash.startsWith('$2b$')) {
      passwordValid = await bcrypt.compare(password, user.password_hash);
    } else {
      // Legacy SHA256 — migrate to bcrypt on successful login
      const sha256Hash = crypto.createHash('sha256').update(password).digest('hex');
      passwordValid = sha256Hash === user.password_hash;
      if (passwordValid) {
        const bcryptHash = await bcrypt.hash(password, 12);
        await query('UPDATE admin_users SET password_hash = $1 WHERE id = $2', [bcryptHash, user.id]);
        console.log(`[Auth] Migrated user ${user.email} from SHA256 to bcrypt`);
      }
    }

    if (!passwordValid) {
      // Increment failed attempts
      const attempts = (user.failed_login_attempts || 0) + 1;
      if (attempts >= MAX_FAILED_ATTEMPTS) {
        await query(
          `UPDATE admin_users SET failed_login_attempts = $1, locked_until = NOW() + INTERVAL '${LOCKOUT_MINUTES} minutes' WHERE id = $2`,
          [attempts, user.id]
        );
      } else {
        await query(
          'UPDATE admin_users SET failed_login_attempts = $1 WHERE id = $2',
          [attempts, user.id]
        );
      }
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Resolve permissions
    const permissions = await resolvePermissions(user.id, user.role);

    // Record successful login: reset failed attempts, record IP and time
    const clientIp = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '';
    await query(
      'UPDATE admin_users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW(), last_login_ip = $1 WHERE id = $2',
      [clientIp, user.id]
    );

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      permissions,
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions,
        force_password_change: user.force_password_change || false,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateJWT, (req: Request, res: Response) => {
  res.json({ user: req.adminUser });
});

export default router;

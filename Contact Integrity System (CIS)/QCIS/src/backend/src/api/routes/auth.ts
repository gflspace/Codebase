import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { query } from '../../database/connection';
import { generateToken, authenticateJWT } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { loginSchema } from '../schemas';

const router = Router();

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const result = await query(
      'SELECT id, email, name, role, password_hash FROM admin_users WHERE email = $1 AND active = true',
      [email]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const user = result.rows[0];

    // Compare password hash
    const hash = crypto.createHash('sha256').update(password).digest('hex');
    if (hash !== user.password_hash) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
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

import { Router, Request, Response } from 'express';
import { query } from '../../database/connection';
import { authenticateJWT, requireRole } from '../middleware/auth';
import { validateQuery, validateParams } from '../middleware/validation';
import { enforcementQuerySchema, uuidParam } from '../schemas';

const router = Router();

// GET /api/enforcement-actions
router.get(
  '/',
  authenticateJWT,
  requireRole('trust_safety', 'legal_compliance'),
  validateQuery(enforcementQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const conditions: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (req.query.user_id) {
        conditions.push(`user_id = $${paramIndex++}`);
        values.push(req.query.user_id);
      }
      if (req.query.action_type) {
        conditions.push(`action_type = $${paramIndex++}`);
        values.push(req.query.action_type);
      }
      if (req.query.active_only === 'true') {
        conditions.push(`reversed_at IS NULL AND (effective_until IS NULL OR effective_until > NOW())`);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const result = await query(
        `SELECT id, user_id, action_type, reason, reason_code, triggering_signal_ids, risk_score_id,
                effective_until, reversed_at, reversed_by, reversal_reason, automated, approved_by, metadata, created_at
         FROM enforcement_actions ${where}
         ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        [...values, limit, offset]
      );

      const countResult = await query(
        `SELECT COUNT(*) FROM enforcement_actions ${where}`,
        values
      );
      const total = parseInt(countResult.rows[0].count, 10);

      res.json({
        data: result.rows,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error('List enforcement actions error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/enforcement-actions/:id
router.get(
  '/:id',
  authenticateJWT,
  requireRole('trust_safety', 'legal_compliance'),
  validateParams(uuidParam),
  async (req: Request, res: Response) => {
    try {
      const result = await query(
        'SELECT * FROM enforcement_actions WHERE id = $1',
        [req.params.id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Enforcement action not found' });
        return;
      }

      res.json({ data: result.rows[0] });
    } catch (error) {
      console.error('Get enforcement action error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/enforcement-actions/:id/reverse
router.post(
  '/:id/reverse',
  authenticateJWT,
  requireRole('trust_safety'),
  validateParams(uuidParam),
  async (req: Request, res: Response) => {
    try {
      const { reason } = req.body;

      if (!reason) {
        res.status(400).json({ error: 'Reversal reason is required' });
        return;
      }

      const result = await query(
        `UPDATE enforcement_actions
         SET reversed_at = NOW(), reversed_by = $1, reversal_reason = $2
         WHERE id = $3 AND reversed_at IS NULL
         RETURNING *`,
        [req.adminUser!.id, reason, req.params.id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Enforcement action not found or already reversed' });
        return;
      }

      res.json({ data: result.rows[0] });
    } catch (error) {
      console.error('Reverse enforcement action error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;

import { Router, Request, Response } from 'express';
import { query } from '../../database/connection';
import { authenticateJWT, requirePermission } from '../middleware/auth';
import { validateQuery, validateParams } from '../middleware/validation';
import { enforcementQuerySchema, uuidParam } from '../schemas';
import { emitEnforcementReversed } from '../../events/emit';

const router = Router();

// GET /api/enforcement-actions
router.get(
  '/',
  authenticateJWT,
  requirePermission('enforcement.view'),
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
        conditions.push(`ea.user_id = $${paramIndex++}`);
        values.push(req.query.user_id);
      }
      if (req.query.action_type) {
        conditions.push(`ea.action_type = $${paramIndex++}`);
        values.push(req.query.action_type);
      }
      if (req.query.active_only === 'true') {
        conditions.push(`ea.reversed_at IS NULL AND (ea.effective_until IS NULL OR ea.effective_until > NOW())`);
      }
      if (req.query.category) {
        conditions.push(`u.service_category = $${paramIndex++}`);
        values.push(req.query.category);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const result = await query(
        `SELECT ea.id, ea.user_id, ea.action_type, ea.reason, ea.reason_code, ea.triggering_signal_ids, ea.risk_score_id,
                ea.effective_until, ea.reversed_at, ea.reversed_by, ea.reversal_reason, ea.automated, ea.approved_by, ea.metadata, ea.created_at,
                u.display_name AS user_name, u.email AS user_email, u.phone AS user_phone, u.user_type, u.service_category, u.trust_score AS user_trust_score
         FROM enforcement_actions ea
         LEFT JOIN users u ON u.id = ea.user_id
         ${where}
         ORDER BY ea.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        [...values, limit, offset]
      );

      const countResult = await query(
        `SELECT COUNT(*) FROM enforcement_actions ea LEFT JOIN users u ON u.id = ea.user_id ${where}`,
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
  requirePermission('enforcement.view'),
  validateParams(uuidParam),
  async (req: Request, res: Response) => {
    try {
      const result = await query(
        `SELECT ea.*, u.display_name AS user_name, u.email AS user_email, u.phone AS user_phone, u.user_type, u.service_category, u.trust_score AS user_trust_score
         FROM enforcement_actions ea LEFT JOIN users u ON u.id = ea.user_id WHERE ea.id = $1`,
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
  requirePermission('enforcement.reverse'),
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

      const row = result.rows[0];
      res.json({ data: row });

      // Fire-and-forget: emit domain event to event bus
      emitEnforcementReversed({
        id: row.id,
        user_id: row.user_id,
        action_type: row.action_type,
        reversal_reason: row.reversal_reason,
      });
    } catch (error) {
      console.error('Reverse enforcement action error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;

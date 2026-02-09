import { Router, Request, Response } from 'express';
import { query } from '../../database/connection';
import { authenticateJWT, requireRole } from '../middleware/auth';
import { validate, validateQuery, validateParams } from '../middleware/validation';
import { alertQuerySchema, updateAlertSchema, uuidParam } from '../schemas';

const router = Router();

// GET /api/alerts
router.get(
  '/',
  authenticateJWT,
  requireRole('trust_safety', 'ops'),
  validateQuery(alertQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const conditions: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (req.query.status) {
        conditions.push(`status = $${paramIndex++}`);
        values.push(req.query.status);
      }
      if (req.query.priority) {
        conditions.push(`priority = $${paramIndex++}`);
        values.push(req.query.priority);
      }
      if (req.query.assigned_to) {
        conditions.push(`assigned_to = $${paramIndex++}`);
        values.push(req.query.assigned_to);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const result = await query(
        `SELECT id, user_id, priority, status, title, description, assigned_to, risk_signal_ids, auto_generated, created_at, updated_at
         FROM alerts ${where}
         ORDER BY
           CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END,
           created_at DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        [...values, limit, offset]
      );

      const countResult = await query(
        `SELECT COUNT(*) FROM alerts ${where}`,
        values
      );
      const total = parseInt(countResult.rows[0].count, 10);

      res.json({
        data: result.rows,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error('List alerts error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/alerts/:id
router.get(
  '/:id',
  authenticateJWT,
  requireRole('trust_safety', 'ops'),
  validateParams(uuidParam),
  async (req: Request, res: Response) => {
    try {
      const result = await query('SELECT * FROM alerts WHERE id = $1', [req.params.id]);

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Alert not found' });
        return;
      }

      res.json({ data: result.rows[0] });
    } catch (error) {
      console.error('Get alert error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PATCH /api/alerts/:id
router.patch(
  '/:id',
  authenticateJWT,
  requireRole('trust_safety'),
  validateParams(uuidParam),
  validate(updateAlertSchema),
  async (req: Request, res: Response) => {
    try {
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(req.body)) {
        updates.push(`${key} = $${paramIndex++}`);
        values.push(value);
      }

      if (updates.length === 0) {
        res.status(400).json({ error: 'No fields to update' });
        return;
      }

      values.push(req.params.id);
      const result = await query(
        `UPDATE alerts SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Alert not found' });
        return;
      }

      res.json({ data: result.rows[0] });
    } catch (error) {
      console.error('Update alert error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;

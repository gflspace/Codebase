import { Router, Request, Response } from 'express';
import { query } from '../../database/connection';
import { authenticateJWT, requirePermission } from '../middleware/auth';
import { validateQuery, validateParams } from '../middleware/validation';
import { riskScoreQuerySchema, uuidParam } from '../schemas';

const router = Router();

// GET /api/risk-scores
router.get(
  '/',
  authenticateJWT,
  requirePermission('risk.view'),
  validateQuery(riskScoreQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const conditions: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (req.query.user_id) {
        conditions.push(`rs.user_id = $${paramIndex++}`);
        values.push(req.query.user_id);
      }
      if (req.query.tier) {
        conditions.push(`rs.tier = $${paramIndex++}`);
        values.push(req.query.tier);
      }
      if (req.query.min_score) {
        conditions.push(`rs.score >= $${paramIndex++}`);
        values.push(req.query.min_score);
      }
      if (req.query.category) {
        conditions.push(`u.service_category = $${paramIndex++}`);
        values.push(req.query.category);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const result = await query(
        `SELECT rs.id, rs.user_id, rs.score, rs.tier, rs.factors, rs.trend, rs.signal_count, rs.last_signal_at, rs.created_at,
                u.display_name AS user_name, u.email AS user_email, u.phone AS user_phone, u.user_type, u.service_category
         FROM risk_scores rs
         LEFT JOIN users u ON u.id = rs.user_id
         ${where}
         ORDER BY rs.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        [...values, limit, offset]
      );

      const countResult = await query(
        `SELECT COUNT(*) FROM risk_scores rs LEFT JOIN users u ON u.id = rs.user_id ${where}`,
        values
      );
      const total = parseInt(countResult.rows[0].count, 10);

      res.json({
        data: result.rows,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error('List risk scores error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/risk-scores/user/:id (latest score for a user)
router.get(
  '/user/:id',
  authenticateJWT,
  requirePermission('risk.view'),
  validateParams(uuidParam),
  async (req: Request, res: Response) => {
    try {
      const result = await query(
        'SELECT * FROM risk_scores WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
        [req.params.id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'No risk score found for user' });
        return;
      }

      res.json({ data: result.rows[0] });
    } catch (error) {
      console.error('Get user risk score error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/risk-scores/:id
router.get(
  '/:id',
  authenticateJWT,
  requirePermission('risk.view'),
  validateParams(uuidParam),
  async (req: Request, res: Response) => {
    try {
      const result = await query(
        'SELECT * FROM risk_scores WHERE id = $1',
        [req.params.id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Risk score not found' });
        return;
      }

      res.json({ data: result.rows[0] });
    } catch (error) {
      console.error('Get risk score error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;

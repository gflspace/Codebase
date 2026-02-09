import { Router, Request, Response } from 'express';
import { query } from '../../database/connection';
import { authenticateJWT, requireRole } from '../middleware/auth';
import { validateQuery, validateParams } from '../middleware/validation';
import { riskScoreQuerySchema, uuidParam } from '../schemas';

const router = Router();

// GET /api/risk-scores
router.get(
  '/',
  authenticateJWT,
  requireRole('trust_safety', 'ops', 'legal_compliance'),
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
        conditions.push(`user_id = $${paramIndex++}`);
        values.push(req.query.user_id);
      }
      if (req.query.tier) {
        conditions.push(`tier = $${paramIndex++}`);
        values.push(req.query.tier);
      }
      if (req.query.min_score) {
        conditions.push(`score >= $${paramIndex++}`);
        values.push(req.query.min_score);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const result = await query(
        `SELECT id, user_id, score, tier, factors, trend, signal_count, last_signal_at, created_at
         FROM risk_scores ${where}
         ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        [...values, limit, offset]
      );

      const countResult = await query(
        `SELECT COUNT(*) FROM risk_scores ${where}`,
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
  requireRole('trust_safety', 'ops', 'legal_compliance'),
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
  requireRole('trust_safety', 'ops', 'legal_compliance'),
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

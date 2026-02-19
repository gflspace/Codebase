import { Router, Request, Response } from 'express';
import { query } from '../../database/connection';
import { authenticateJWT, requirePermission } from '../middleware/auth';
import { validate, validateQuery } from '../middleware/validation';
import { createRatingSchema, ratingQuerySchema } from '../schemas';
import { generateId } from '../../shared/utils';
import { emitRatingSubmitted } from '../../events/emit';

const router = Router();

// POST /api/ratings
router.post(
  '/',
  authenticateJWT,
  requirePermission('ratings.manage'),
  validate(createRatingSchema),
  async (req: Request, res: Response) => {
    try {
      const id = generateId();
      const { client_id, provider_id, booking_id, score, comment } = req.body;

      const result = await query(
        `INSERT INTO ratings (id, client_id, provider_id, booking_id, score, comment)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, client_id, provider_id, booking_id, score, comment, metadata, created_at`,
        [id, client_id, provider_id, booking_id || null, score, comment || null]
      );

      res.status(201).json({ data: result.rows[0] });

      // Fire-and-forget: emit rating submitted event
      emitRatingSubmitted({
        id,
        client_id,
        provider_id,
        booking_id,
        score,
        comment,
      });
    } catch (error) {
      console.error('Create rating error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/ratings
router.get(
  '/',
  authenticateJWT,
  requirePermission('overview.view'),
  validateQuery(ratingQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const conditions: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (req.query.provider_id) {
        conditions.push(`provider_id = $${paramIndex++}`);
        values.push(req.query.provider_id);
      }
      if (req.query.client_id) {
        conditions.push(`client_id = $${paramIndex++}`);
        values.push(req.query.client_id);
      }
      if (req.query.min_score) {
        conditions.push(`score >= $${paramIndex++}`);
        values.push(req.query.min_score);
      }
      if (req.query.max_score) {
        conditions.push(`score <= $${paramIndex++}`);
        values.push(req.query.max_score);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const result = await query(
        `SELECT id, client_id, provider_id, booking_id, score, comment, metadata, created_at
         FROM ratings ${where} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        [...values, limit, offset]
      );

      const countResult = await query(`SELECT COUNT(*) FROM ratings ${where}`, values);
      const total = parseInt(countResult.rows[0].count, 10);

      res.json({
        data: result.rows,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error('List ratings error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;

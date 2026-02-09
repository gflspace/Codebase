import { Router, Request, Response } from 'express';
import { query } from '../../database/connection';
import { authenticateJWT, requireRole } from '../middleware/auth';
import { validate, validateQuery, validateParams } from '../middleware/validation';
import { riskSignalSchema, signalQuerySchema, uuidParam } from '../schemas';
import { generateId } from '../../shared/utils';

const router = Router();

// GET /api/risk-signals
router.get(
  '/',
  authenticateJWT,
  requireRole('trust_safety', 'ops', 'legal_compliance'),
  validateQuery(signalQuerySchema),
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
      if (req.query.signal_type) {
        conditions.push(`signal_type = $${paramIndex++}`);
        values.push(req.query.signal_type);
      }
      if (req.query.min_confidence) {
        conditions.push(`confidence >= $${paramIndex++}`);
        values.push(req.query.min_confidence);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const result = await query(
        `SELECT id, source_event_id, user_id, signal_type, confidence, evidence, obfuscation_flags, pattern_flags, created_at
         FROM risk_signals ${where}
         ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        [...values, limit, offset]
      );

      const countResult = await query(
        `SELECT COUNT(*) FROM risk_signals ${where}`,
        values
      );
      const total = parseInt(countResult.rows[0].count, 10);

      res.json({
        data: result.rows,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error('List risk signals error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/risk-signals/:id
router.get(
  '/:id',
  authenticateJWT,
  requireRole('trust_safety', 'ops', 'legal_compliance'),
  validateParams(uuidParam),
  async (req: Request, res: Response) => {
    try {
      const result = await query(
        'SELECT * FROM risk_signals WHERE id = $1',
        [req.params.id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Risk signal not found' });
        return;
      }

      res.json({ data: result.rows[0] });
    } catch (error) {
      console.error('Get risk signal error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/risk-signals (internal: detection → backend)
router.post(
  '/',
  authenticateJWT,
  requireRole('trust_safety'),
  validate(riskSignalSchema),
  async (req: Request, res: Response) => {
    try {
      const id = generateId();
      const { source_event_id, user_id, signal_type, confidence, evidence, obfuscation_flags, pattern_flags } = req.body;

      const result = await query(
        `INSERT INTO risk_signals (id, source_event_id, user_id, signal_type, confidence, evidence, obfuscation_flags, pattern_flags)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [id, source_event_id, user_id || null, signal_type, confidence, JSON.stringify(evidence), obfuscation_flags, pattern_flags]
      );

      res.status(201).json({ data: result.rows[0] });
    } catch (error) {
      console.error('Create risk signal error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;

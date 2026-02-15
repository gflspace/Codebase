// QwickServices CIS — Phase 4: Correlation API Routes
// Exposes signal_correlations data for the dashboard and external consumers.

import { Router, Request, Response } from 'express';
import { query } from '../../database/connection';
import { authenticateJWT, requirePermission } from '../middleware/auth';

const router = Router();

// ─── GET / — List correlations with filters ────────────────────

router.get(
  '/',
  authenticateJWT,
  requirePermission('intelligence.view'),
  async (req: Request, res: Response) => {
    try {
      const conditions: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      if (req.query.user_id) {
        conditions.push(`(sc.user_id = $${idx} OR sc.counterparty_id = $${idx})`);
        values.push(req.query.user_id);
        idx++;
      }

      if (req.query.type) {
        conditions.push(`sc.correlation_type = $${idx++}`);
        values.push(req.query.type);
      }

      if (req.query.from) {
        conditions.push(`sc.created_at >= $${idx++}`);
        values.push(req.query.from);
      }

      if (req.query.to) {
        conditions.push(`sc.created_at <= $${idx++}`);
        values.push(req.query.to);
      }

      const page = parseInt(String(req.query.page || '1'), 10);
      const limit = Math.min(parseInt(String(req.query.limit || '50'), 10), 100);
      const offset = (page - 1) * limit;

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const [dataResult, countResult] = await Promise.all([
        query(
          `SELECT sc.id, sc.correlation_type, sc.user_id, sc.counterparty_id,
                  sc.primary_signal_id, sc.secondary_signal_id, sc.booking_id,
                  sc.confidence, sc.time_delta_seconds, sc.evidence, sc.created_at,
                  u1.display_name AS user_name, u2.display_name AS counterparty_name
           FROM signal_correlations sc
           LEFT JOIN users u1 ON u1.id = sc.user_id
           LEFT JOIN users u2 ON u2.id = sc.counterparty_id
           ${where}
           ORDER BY sc.created_at DESC
           LIMIT $${idx} OFFSET $${idx + 1}`,
          [...values, limit, offset]
        ),
        query(
          `SELECT COUNT(*) FROM signal_correlations sc ${where}`,
          values
        ),
      ]);

      res.json({
        data: dataResult.rows,
        pagination: {
          page,
          limit,
          total: parseInt(countResult.rows[0].count, 10),
        },
      });
    } catch (err) {
      console.error('[Correlations] List error:', err);
      res.status(500).json({ error: 'Failed to list correlations' });
    }
  }
);

// ─── GET /clusters — Grouped by user pair with aggregates ──────

router.get(
  '/clusters',
  authenticateJWT,
  requirePermission('intelligence.view'),
  async (req: Request, res: Response) => {
    try {
      const conditions: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      if (req.query.type) {
        conditions.push(`sc.correlation_type = $${idx++}`);
        values.push(req.query.type);
      }

      if (req.query.from) {
        conditions.push(`sc.created_at >= $${idx++}`);
        values.push(req.query.from);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const limit = Math.min(parseInt(String(req.query.limit || '50'), 10), 100);

      const result = await query(
        `SELECT sc.user_id, sc.counterparty_id, sc.correlation_type,
                u1.display_name AS user_name, u2.display_name AS counterparty_name,
                COUNT(*) AS signal_count,
                AVG(sc.confidence) AS avg_confidence,
                MIN(sc.created_at) AS first_seen,
                MAX(sc.created_at) AS last_seen,
                COALESCE(SUM((sc.evidence->>'booking_value')::numeric), 0) AS total_booking_value
         FROM signal_correlations sc
         LEFT JOIN users u1 ON u1.id = sc.user_id
         LEFT JOIN users u2 ON u2.id = sc.counterparty_id
         ${where}
         GROUP BY sc.user_id, sc.counterparty_id, sc.correlation_type,
                  u1.display_name, u2.display_name
         ORDER BY COUNT(*) DESC
         LIMIT $${idx}`,
        [...values, limit]
      );

      res.json({ data: result.rows });
    } catch (err) {
      console.error('[Correlations] Clusters error:', err);
      res.status(500).json({ error: 'Failed to list correlation clusters' });
    }
  }
);

export default router;

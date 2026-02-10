import { Router, Request, Response } from 'express';
import { query } from '../../database/connection';
import { authenticateJWT, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/stats/overview — aggregate counts
router.get(
  '/overview',
  authenticateJWT,
  requireRole('trust_safety', 'ops', 'legal_compliance'),
  async (_req: Request, res: Response) => {
    try {
      const [alertStats, caseStats, enforcementStats, scoreStats] = await Promise.all([
        query(`
          SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE status = 'open') AS open,
            COUNT(*) FILTER (WHERE status = 'assigned') AS assigned,
            COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
            COUNT(*) FILTER (WHERE status = 'resolved') AS resolved,
            COUNT(*) FILTER (WHERE priority = 'critical') AS critical,
            COUNT(*) FILTER (WHERE priority = 'high') AS high,
            COUNT(*) FILTER (WHERE priority = 'medium') AS medium,
            COUNT(*) FILTER (WHERE priority = 'low') AS low
          FROM alerts
        `),
        query(`
          SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE status = 'open') AS open,
            COUNT(*) FILTER (WHERE status = 'investigating') AS investigating,
            COUNT(*) FILTER (WHERE status = 'pending_action') AS pending_action,
            COUNT(*) FILTER (WHERE status = 'resolved') AS resolved,
            COUNT(*) FILTER (WHERE status = 'closed') AS closed
          FROM cases
        `),
        query(`
          SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE reversed_at IS NULL AND (effective_until IS NULL OR effective_until > NOW())) AS active,
            COUNT(*) FILTER (WHERE reversed_at IS NOT NULL) AS reversed,
            COUNT(*) FILTER (WHERE automated = true) AS automated
          FROM enforcement_actions
        `),
        query(`
          SELECT
            COALESCE(AVG(score), 0) AS avg_score,
            COUNT(DISTINCT user_id) AS user_count
          FROM risk_scores rs
          WHERE rs.created_at = (
            SELECT MAX(created_at) FROM risk_scores WHERE user_id = rs.user_id
          )
        `),
      ]);

      res.json({
        data: {
          alerts: alertStats.rows[0],
          cases: caseStats.rows[0],
          enforcements: enforcementStats.rows[0],
          risk: scoreStats.rows[0],
        },
      });
    } catch (error) {
      console.error('Stats overview error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/stats/by-category — grouped by service_category
router.get(
  '/by-category',
  authenticateJWT,
  requireRole('trust_safety', 'ops', 'legal_compliance'),
  async (_req: Request, res: Response) => {
    try {
      const result = await query(`
        SELECT
          COALESCE(u.service_category, 'Uncategorized') AS category,
          COUNT(DISTINCT a.id) AS alert_count,
          COUNT(DISTINCT c.id) AS case_count,
          COUNT(DISTINCT ea.id) AS enforcement_count,
          COALESCE(AVG(u.trust_score), 0) AS avg_trust_score
        FROM users u
        LEFT JOIN alerts a ON a.user_id = u.id
        LEFT JOIN cases c ON c.user_id = u.id
        LEFT JOIN enforcement_actions ea ON ea.user_id = u.id
        WHERE u.user_type IN ('customer', 'provider')
        GROUP BY u.service_category
        ORDER BY alert_count DESC
      `);

      res.json({ data: result.rows });
    } catch (error) {
      console.error('Stats by-category error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/stats/by-criticality — grouped by priority/severity
router.get(
  '/by-criticality',
  authenticateJWT,
  requireRole('trust_safety', 'ops', 'legal_compliance'),
  async (_req: Request, res: Response) => {
    try {
      const [alertsByPriority, enforcementsByType] = await Promise.all([
        query(`
          SELECT priority, COUNT(*) AS count
          FROM alerts
          GROUP BY priority
          ORDER BY CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END
        `),
        query(`
          SELECT action_type, COUNT(*) AS count
          FROM enforcement_actions
          GROUP BY action_type
          ORDER BY count DESC
        `),
      ]);

      res.json({
        data: {
          alerts_by_priority: alertsByPriority.rows,
          enforcements_by_type: enforcementsByType.rows,
        },
      });
    } catch (error) {
      console.error('Stats by-criticality error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/stats/trends — daily counts for last 30 days
router.get(
  '/trends',
  authenticateJWT,
  requireRole('trust_safety', 'ops', 'legal_compliance'),
  async (_req: Request, res: Response) => {
    try {
      const [alertTrends, caseTrends, enforcementTrends] = await Promise.all([
        query(`
          SELECT DATE(created_at) AS date, COUNT(*) AS count
          FROM alerts
          WHERE created_at >= NOW() - INTERVAL '30 days'
          GROUP BY DATE(created_at)
          ORDER BY date
        `),
        query(`
          SELECT DATE(created_at) AS date, COUNT(*) AS count
          FROM cases
          WHERE created_at >= NOW() - INTERVAL '30 days'
          GROUP BY DATE(created_at)
          ORDER BY date
        `),
        query(`
          SELECT DATE(created_at) AS date, COUNT(*) AS count
          FROM enforcement_actions
          WHERE created_at >= NOW() - INTERVAL '30 days'
          GROUP BY DATE(created_at)
          ORDER BY date
        `),
      ]);

      res.json({
        data: {
          alerts: alertTrends.rows,
          cases: caseTrends.rows,
          enforcements: enforcementTrends.rows,
        },
      });
    } catch (error) {
      console.error('Stats trends error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;

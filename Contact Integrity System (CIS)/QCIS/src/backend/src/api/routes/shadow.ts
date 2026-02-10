import { Router, Request, Response } from 'express';
import { authenticateJWT, requirePermission } from '../middleware/auth';
import { config } from '../../config';
import { query } from '../../database/connection';
import { getEventBus } from '../../events/bus';

const router = Router();

// GET /api/shadow/status — shadow mode status and metrics
router.get(
  '/status',
  authenticateJWT,
  requirePermission('system_health.view'),
  async (_req: Request, res: Response) => {
    try {
      // Gather shadow mode metrics
      const [
        signalCount,
        shadowActionCount,
        recentSignals,
        tierDistribution,
      ] = await Promise.all([
        query('SELECT COUNT(*) FROM risk_signals').then((r) => parseInt(r.rows[0].count, 10)).catch(() => 0),
        query("SELECT COUNT(*) FROM enforcement_actions WHERE metadata->>'shadow_mode' = 'true'").then((r) => parseInt(r.rows[0].count, 10)).catch(() => 0),
        query("SELECT COUNT(*) FROM risk_signals WHERE created_at >= NOW() - INTERVAL '24 hours'").then((r) => parseInt(r.rows[0].count, 10)).catch(() => 0),
        query('SELECT tier, COUNT(*) as count FROM risk_scores GROUP BY tier').then((r) => r.rows).catch(() => []),
      ]);

      const bus = getEventBus();
      const dlq = bus.getDeadLetterQueue();

      res.json({
        shadow_mode: config.shadowMode,
        enforcement_kill_switch: config.enforcementKillSwitch,
        metrics: {
          total_signals: signalCount,
          shadow_actions: shadowActionCount,
          signals_last_24h: recentSignals,
          tier_distribution: tierDistribution,
          dead_letter_queue_size: dlq.length,
          registered_consumers: bus.getRegisteredConsumers(),
        },
        readiness_checklist: generateReadinessChecklist(signalCount, shadowActionCount),
      });
    } catch (error) {
      console.error('Shadow status error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/shadow/metrics — detailed metrics for internal dashboards
router.get(
  '/metrics',
  authenticateJWT,
  requirePermission('system_health.view'),
  async (_req: Request, res: Response) => {
    try {
      const [
        signalsByType,
        signalsByDay,
        avgConfidence,
        actionsByType,
        avgProcessingTime,
      ] = await Promise.all([
        query(
          'SELECT signal_type, COUNT(*) as count FROM risk_signals GROUP BY signal_type ORDER BY count DESC'
        ).then((r) => r.rows).catch(() => []),

        query(
          `SELECT DATE(created_at) as day, COUNT(*) as count
           FROM risk_signals
           WHERE created_at >= NOW() - INTERVAL '30 days'
           GROUP BY DATE(created_at)
           ORDER BY day`
        ).then((r) => r.rows).catch(() => []),

        query(
          'SELECT AVG(confidence) as avg, MIN(confidence) as min, MAX(confidence) as max FROM risk_signals'
        ).then((r) => r.rows[0]).catch(() => ({ avg: 0, min: 0, max: 0 })),

        query(
          'SELECT action_type, COUNT(*) as count FROM enforcement_actions GROUP BY action_type ORDER BY count DESC'
        ).then((r) => r.rows).catch(() => []),

        query(
          `SELECT AVG(EXTRACT(EPOCH FROM (al2.timestamp - al1.timestamp))) * 1000 as avg_ms
           FROM audit_logs al1
           JOIN audit_logs al2 ON al1.entity_id = al2.entity_id
           WHERE al1.action LIKE 'event.message%'
           AND al2.action LIKE 'enforcement.%'
           LIMIT 100`
        ).then((r) => r.rows[0]?.avg_ms).catch(() => null),
      ]);

      res.json({
        signals_by_type: signalsByType,
        signals_by_day: signalsByDay,
        confidence_stats: avgConfidence,
        actions_by_type: actionsByType,
        avg_pipeline_latency_ms: avgProcessingTime,
      });
    } catch (error) {
      console.error('Shadow metrics error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

function generateReadinessChecklist(signalCount: number, shadowActionCount: number) {
  return {
    items: [
      {
        check: 'Detection pipeline produces signals',
        passed: signalCount > 0,
        required: true,
      },
      {
        check: 'Shadow enforcement actions generated',
        passed: shadowActionCount > 0,
        required: true,
      },
      {
        check: 'Minimum 100 signals processed',
        passed: signalCount >= 100,
        required: true,
      },
      {
        check: 'False-positive rate below 5%',
        passed: null, // Requires manual evaluation
        required: true,
      },
      {
        check: 'Admin dashboard functional',
        passed: null, // Requires manual verification
        required: true,
      },
      {
        check: 'Appeal workflow tested end-to-end',
        passed: null, // Requires manual verification
        required: true,
      },
      {
        check: 'Kill switch verified functional',
        passed: null, // Requires manual verification
        required: true,
      },
    ],
    ready_for_active: false, // Manual gate — never auto-activate
  };
}

export default router;

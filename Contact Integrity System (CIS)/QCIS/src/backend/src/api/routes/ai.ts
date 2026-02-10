import { Router, Request, Response } from 'express';
import { query } from '../../database/connection';
import { authenticateJWT, requirePermission } from '../middleware/auth';
import { config } from '../../config';
import * as openai from '../../services/openai';

const router = Router();

// Check if OpenAI is configured
function requireOpenAI(_req: Request, res: Response, next: () => void) {
  if (!config.openai.apiKey) {
    res.status(503).json({ error: 'OpenAI API key not configured. Set OPENAI_API_KEY environment variable.' });
    return;
  }
  next();
}

// POST /api/ai/risk-summary
router.post(
  '/risk-summary',
  authenticateJWT,
  requirePermission('alerts.ai_summary'),
  requireOpenAI,
  async (req: Request, res: Response) => {
    try {
      const { user_id } = req.body;
      if (!user_id) {
        res.status(400).json({ error: 'user_id is required' });
        return;
      }

      const [userResult, alertCount, caseCount, enfCount, signals] = await Promise.all([
        query('SELECT display_name, trust_score, status, user_type, service_category FROM users WHERE id = $1', [user_id]),
        query('SELECT COUNT(*) FROM alerts WHERE user_id = $1', [user_id]),
        query('SELECT COUNT(*) FROM cases WHERE user_id = $1', [user_id]),
        query('SELECT COUNT(*) FROM enforcement_actions WHERE user_id = $1', [user_id]),
        query('SELECT DISTINCT signal_type FROM risk_signals WHERE user_id = $1', [user_id]),
      ]);

      if (userResult.rows.length === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const user = userResult.rows[0];
      const result = await openai.generateRiskSummary({
        display_name: user.display_name || 'Unknown',
        trust_score: parseFloat(user.trust_score),
        status: user.status,
        user_type: user.user_type,
        service_category: user.service_category,
        alert_count: parseInt(alertCount.rows[0].count),
        case_count: parseInt(caseCount.rows[0].count),
        enforcement_count: parseInt(enfCount.rows[0].count),
        signals: signals.rows.map((r: { signal_type: string }) => r.signal_type),
      });

      res.json({ data: result });
    } catch (error) {
      console.error('AI risk-summary error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/ai/appeal-analysis
router.post(
  '/appeal-analysis',
  authenticateJWT,
  requirePermission('appeals.ai_analysis'),
  requireOpenAI,
  async (req: Request, res: Response) => {
    try {
      const { appeal_id } = req.body;
      if (!appeal_id) {
        res.status(400).json({ error: 'appeal_id is required' });
        return;
      }

      const appealResult = await query(
        `SELECT a.*, ea.action_type, ea.reason AS enforcement_reason, u.display_name, u.trust_score
         FROM appeals a
         JOIN enforcement_actions ea ON ea.id = a.enforcement_action_id
         JOIN users u ON u.id = a.user_id
         WHERE a.id = $1`,
        [appeal_id]
      );

      if (appealResult.rows.length === 0) {
        res.status(404).json({ error: 'Appeal not found' });
        return;
      }

      const appeal = appealResult.rows[0];
      const priorViolations = await query(
        'SELECT COUNT(*) FROM enforcement_actions WHERE user_id = $1',
        [appeal.user_id]
      );

      const result = await openai.analyzeAppeal({
        user_name: appeal.display_name || 'Unknown',
        appeal_reason: appeal.reason,
        enforcement_type: appeal.action_type,
        enforcement_reason: appeal.enforcement_reason,
        trust_score: parseFloat(appeal.trust_score),
        prior_violations: parseInt(priorViolations.rows[0].count),
      });

      res.json({ data: result });
    } catch (error) {
      console.error('AI appeal-analysis error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/ai/pattern-detection
router.post(
  '/pattern-detection',
  authenticateJWT,
  requirePermission('risk.ai_patterns'),
  requireOpenAI,
  async (_req: Request, res: Response) => {
    try {
      const [alerts, signals] = await Promise.all([
        query(`
          SELECT a.priority, a.title, u.service_category AS category
          FROM alerts a
          LEFT JOIN users u ON u.id = a.user_id
          WHERE a.created_at >= NOW() - INTERVAL '30 days'
          ORDER BY a.created_at DESC LIMIT 50
        `),
        query(`
          SELECT signal_type, confidence
          FROM risk_signals
          WHERE created_at >= NOW() - INTERVAL '30 days'
          ORDER BY created_at DESC LIMIT 100
        `),
      ]);

      const result = await openai.detectPatterns({
        alerts: alerts.rows,
        signals: signals.rows,
      });

      res.json({ data: result });
    } catch (error) {
      console.error('AI pattern-detection error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/ai/predictive-alert
router.post(
  '/predictive-alert',
  authenticateJWT,
  requirePermission('risk.ai_predictive'),
  requireOpenAI,
  async (req: Request, res: Response) => {
    try {
      const { user_id } = req.body;
      if (!user_id) {
        res.status(400).json({ error: 'user_id is required' });
        return;
      }

      const [userResult, scoreResult, signalResult, enfResult] = await Promise.all([
        query('SELECT display_name, trust_score FROM users WHERE id = $1', [user_id]),
        query('SELECT trend FROM risk_scores WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [user_id]),
        query('SELECT DISTINCT signal_type FROM risk_signals WHERE user_id = $1 ORDER BY signal_type LIMIT 10', [user_id]),
        query('SELECT action_type FROM enforcement_actions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5', [user_id]),
      ]);

      if (userResult.rows.length === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const user = userResult.rows[0];
      const result = await openai.generatePredictiveAlert({
        user_name: user.display_name || 'Unknown',
        trust_score: parseFloat(user.trust_score),
        trend: scoreResult.rows[0]?.trend || 'stable',
        recent_signals: signalResult.rows.map((r: { signal_type: string }) => r.signal_type),
        enforcement_history: enfResult.rows.map((r: { action_type: string }) => r.action_type),
      });

      res.json({ data: result });
    } catch (error) {
      console.error('AI predictive-alert error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;

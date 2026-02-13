// QwickServices CIS — Phase 3B: Pre-Transaction Evaluation Endpoint
// Synchronous endpoint for booking/payment/provider decisions.
// Dual-mode auth: HMAC (service-to-service) or JWT (admin testing).
// Fail-open: on any error, returns decision: 'allow' to prevent CIS from blocking platform ops.

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { query } from '../../database/connection';
import { evaluateSchema } from '../schemas';
import { evaluateContextualTrigger, getEnforcementHistory, EventContext } from '../../enforcement/triggers';
import { executeAction } from '../../enforcement/actions';
import { createAdminAlert } from '../../enforcement/notifications';
import { RiskTier } from '../../scoring/tiers';
import { generateId } from '../../shared/utils';
import { loadActiveRules, buildRuleContext, evaluateRules } from '../../rules';
import { executeRuleSideEffects } from '../../rules/actions';

const router = Router();

// ─── Action type to EventContext mapping ─────────────────────

const ACTION_TO_CONTEXT: Record<string, EventContext> = {
  'booking.create': 'booking',
  'payment.initiate': 'payment',
  'provider.register': 'provider',
};

// ─── Dual-mode auth middleware ───────────────────────────────

function authenticateDual(req: Request, res: Response): boolean {
  // Try HMAC first (service-to-service)
  const hmacSig = req.headers['x-hmac-signature'] as string | undefined;
  const hmacTs = req.headers['x-hmac-timestamp'] as string | undefined;

  if (hmacSig && hmacTs) {
    const requestTime = parseInt(hmacTs, 10);
    if (Math.abs(Date.now() - requestTime) > 5 * 60 * 1000) {
      res.status(401).json({ error: 'Request timestamp too old' });
      return false;
    }
    const body = JSON.stringify(req.body);
    const expected = crypto
      .createHmac('sha256', config.hmac.secret)
      .update(`${hmacTs}.${body}`)
      .digest('hex');

    if (hmacSig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(hmacSig), Buffer.from(expected))) {
      res.status(401).json({ error: 'Invalid HMAC signature' });
      return false;
    }
    return true;
  }

  // Try JWT (admin testing)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      jwt.verify(token, config.jwt.secret);
      return true;
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' });
      return false;
    }
  }

  res.status(401).json({ error: 'Missing authentication (HMAC or JWT required)' });
  return false;
}

// ─── POST /api/evaluate ──────────────────────────────────────

router.post('/', async (req: Request, res: Response) => {
  const startTime = Date.now();

  // Auth
  if (!authenticateDual(req, res)) return;

  // Validate
  const parsed = evaluateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation error', details: parsed.error.issues });
    return;
  }

  const { action_type, user_id, counterparty_id, metadata: reqMetadata } = parsed.data;
  const context = ACTION_TO_CONTEXT[action_type] || 'general';

  try {
    // Kill switch: always allow
    if (config.enforcementKillSwitch) {
      const evalTimeMs = Date.now() - startTime;
      await logEvaluation(user_id, counterparty_id, action_type, 'allow', 0, 'monitor', 'Kill switch active', [], null, evalTimeMs, false, reqMetadata);
      res.json({
        decision: 'allow',
        risk_score: 0,
        risk_tier: 'monitor',
        reason: 'Kill switch active',
        signals: [],
        evaluation_time_ms: evalTimeMs,
      });
      return;
    }

    // Hot path: 2 indexed queries
    const [scoreResult, signalResult] = await Promise.all([
      query(
        'SELECT id, score, tier, factors FROM risk_scores WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
        [user_id]
      ),
      query(
        `SELECT signal_type, pattern_flags FROM risk_signals
         WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
         ORDER BY created_at DESC LIMIT 20`,
        [user_id]
      ),
    ]);

    // No score = low risk, allow
    if (scoreResult.rows.length === 0) {
      const evalTimeMs = Date.now() - startTime;
      await logEvaluation(user_id, counterparty_id, action_type, 'allow', 0, 'monitor', 'No risk score on file', [], null, evalTimeMs, config.shadowMode, reqMetadata);
      res.json({
        decision: 'allow',
        risk_score: 0,
        risk_tier: 'monitor',
        reason: 'No risk score on file',
        signals: [],
        evaluation_time_ms: evalTimeMs,
      });
      return;
    }

    const score = parseFloat(scoreResult.rows[0].score);
    const tier = scoreResult.rows[0].tier as RiskTier;
    const riskScoreId = scoreResult.rows[0].id as string;
    const signals = signalResult.rows.map((r: { signal_type: string }) => r.signal_type);

    // Shadow mode: always allow but log what would happen
    const isShadow = config.shadowMode;

    // Decision logic
    let decision: 'allow' | 'flag' | 'block';
    let reason: string;
    let enforcementId: string | null = null;

    if (score < 40) {
      decision = 'allow';
      reason = 'Risk score within acceptable range';
    } else if (score < 70) {
      decision = isShadow ? 'allow' : 'flag';
      reason = isShadow
        ? `[SHADOW] Would flag: risk score ${score} in medium range`
        : `Risk score ${score} requires review`;

      // Create enforcement action for flag
      if (!isShadow) {
        const history = await getEnforcementHistory(user_id);
        const patternFlags = extractPatternFlags(signalResult.rows);
        const evaluation = evaluateContextualTrigger(tier, history, patternFlags, context);
        if (evaluation.action) {
          const applied = await executeAction(user_id, evaluation, [], riskScoreId);
          if (applied) {
            enforcementId = applied.id;
            await createAdminAlert(applied);
          }
        }
      }
    } else {
      decision = isShadow ? 'allow' : 'block';
      reason = isShadow
        ? `[SHADOW] Would block: risk score ${score} exceeds threshold`
        : `Risk score ${score} exceeds safe threshold`;

      // Create enforcement action for block
      const history = await getEnforcementHistory(user_id);
      const patternFlags = extractPatternFlags(signalResult.rows);
      const evaluation = evaluateContextualTrigger(tier, history, patternFlags, context);
      if (evaluation.action) {
        const applied = await executeAction(user_id, evaluation, [], riskScoreId);
        if (applied) {
          enforcementId = applied.id;
          if (!isShadow) {
            await createAdminAlert(applied);
          }
        }
      }
    }

    // Step 4.5: Evaluate admin rules (Layer 9)
    const ruleEventType = action_type === 'booking.create' ? 'booking.created'
      : action_type === 'payment.initiate' ? 'transaction.initiated'
      : action_type === 'provider.register' ? 'provider.registered'
      : action_type;

    try {
      const rules = await loadActiveRules(ruleEventType);
      if (rules.length > 0) {
        const history = decision !== 'allow' ? await getEnforcementHistory(user_id) : {
          totalActions: 0, recentActions: 0, lastActionType: null, sameTypeViolations: 0, hasActiveRestriction: false,
        };
        const ruleCtx = await buildRuleContext(user_id, score, tier, history, extractPatternFlags(signalResult.rows), ruleEventType);
        const ruleResult = await evaluateRules(rules, ruleCtx, user_id);

        // If enforcement override changes the decision
        if (ruleResult.enforcementOverride) {
          const overrideAction = ruleResult.enforcementOverride.action;
          if (overrideAction) {
            const blockActions = ['temporary_restriction', 'account_suspension', 'booking_blocked', 'payment_blocked', 'provider_suspended'];
            const flagActions = ['hard_warning', 'booking_flagged', 'payment_held', 'provider_demoted', 'message_throttled'];
            if (blockActions.includes(overrideAction) && !isShadow) {
              decision = 'block';
              reason = ruleResult.enforcementOverride.reason;
            } else if (flagActions.includes(overrideAction) && !isShadow) {
              decision = decision === 'block' ? 'block' : 'flag';
              reason = ruleResult.enforcementOverride.reason;
            }
          }
        }

        // Execute side-effects
        await executeRuleSideEffects(ruleResult, user_id);
      }
    } catch (err) {
      console.error('[Evaluate] Rule evaluation error (non-fatal):', err);
    }

    const evalTimeMs = Date.now() - startTime;
    await logEvaluation(user_id, counterparty_id, action_type, decision, score, tier, reason, signals, enforcementId, evalTimeMs, isShadow, reqMetadata);

    res.json({
      decision,
      risk_score: score,
      risk_tier: tier,
      reason,
      signals,
      enforcement_id: enforcementId,
      evaluation_time_ms: evalTimeMs,
    });
  } catch (err) {
    // Fail-open: on any error, return allow
    console.error('[Evaluate] Error during evaluation, failing open:', err);
    const evalTimeMs = Date.now() - startTime;
    res.json({
      decision: 'allow',
      risk_score: 0,
      risk_tier: 'unknown',
      reason: 'Evaluation error — fail-open policy applied',
      signals: [],
      evaluation_time_ms: evalTimeMs,
    });
  }
});

// ─── Helpers ─────────────────────────────────────────────────

function extractPatternFlags(rows: Array<{ pattern_flags?: string[] }>): string[] {
  const flags: string[] = [];
  for (const row of rows) {
    if (row.pattern_flags) {
      flags.push(...row.pattern_flags);
    }
  }
  return [...new Set(flags)];
}

async function logEvaluation(
  userId: string,
  counterpartyId: string | undefined,
  actionType: string,
  decision: string,
  riskScore: number,
  riskTier: string,
  reason: string,
  signals: string[],
  enforcementId: string | null,
  evalTimeMs: number,
  shadowMode: boolean,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await query(
      `INSERT INTO evaluation_log (id, user_id, counterparty_id, action_type, decision, risk_score, risk_tier, reason, signals, enforcement_id, evaluation_time_ms, shadow_mode, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        generateId(), userId, counterpartyId || null, actionType, decision,
        riskScore, riskTier, reason, signals, enforcementId,
        evalTimeMs, shadowMode, JSON.stringify(metadata || {}),
      ]
    );
  } catch (err) {
    console.error('[Evaluate] Failed to log evaluation:', err);
  }
}

export default router;

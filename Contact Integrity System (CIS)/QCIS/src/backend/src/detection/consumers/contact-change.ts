// QwickServices CIS — Phase 2C: Contact Change Detection Consumer
// Detects phone/email changes by users with elevated risk tiers or
// recent enforcement history. Higher confidence if new value matches a flagged user.
// Note: CONTACT_FIELD_CHANGED event emission is a Phase 2D dependency.

import { DomainEvent, EventType, ContactFieldChangedPayload } from '../../events/types';
import { SignalType } from '../signals';
import { persistSignal } from '../persist';
import { query } from '../../database/connection';

// ─── Detection Logic ────────────────────────────────────────────

async function detectContactChange(event: DomainEvent): Promise<void> {
  const payload = event.payload as unknown as ContactFieldChangedPayload;
  if (!payload.user_id || !payload.field || !payload.new_value) return;

  try {
    // Check user's current risk tier
    const tierResult = await query(
      `SELECT tier FROM risk_scores
       WHERE user_id = $1
       ORDER BY scored_at DESC LIMIT 1`,
      [payload.user_id]
    );
    const tier = tierResult.rows[0]?.tier ?? 'MONITOR';

    // Check for recent enforcement actions (last 30 days)
    const enforcementResult = await query(
      `SELECT COUNT(*) AS action_count
       FROM enforcement_actions
       WHERE user_id = $1
         AND created_at >= NOW() - INTERVAL '30 days'`,
      [payload.user_id]
    );
    const enforcementCount = parseInt(enforcementResult.rows[0]?.action_count ?? '0', 10);

    const isHighRisk = tier === 'HIGH' || tier === 'CRITICAL';
    const hasRecentEnforcement = enforcementCount > 0;

    // Only emit signal if user is high-risk or has recent enforcement
    if (!isHighRisk && !hasRecentEnforcement) return;

    // Check if new value matches another flagged user
    const fieldColumn = payload.field === 'phone' ? 'phone' : 'email';
    const crossRefResult = await query(
      `SELECT u.id FROM users u
       INNER JOIN risk_scores rs ON rs.user_id = u.id
       WHERE u.${fieldColumn} = $1
         AND u.id != $2
         AND rs.tier IN ('HIGH', 'CRITICAL')
       ORDER BY rs.scored_at DESC LIMIT 1`,
      [payload.new_value, payload.user_id]
    );
    const matchesFlaggedUser = crossRefResult.rows.length > 0;

    const signalType = payload.field === 'phone'
      ? SignalType.CONTACT_PHONE_CHANGED
      : SignalType.CONTACT_EMAIL_CHANGED;

    const baseConfidence = isHighRisk || hasRecentEnforcement ? 0.75 : 0.5;
    const confidence = matchesFlaggedUser ? 0.85 : baseConfidence;

    await persistSignal(event.id, payload.user_id, {
      signal_type: signalType,
      confidence,
      evidence: {
        user_id: payload.user_id,
        field: payload.field,
        tier,
        enforcement_count_30d: enforcementCount,
        matches_flagged_user: matchesFlaggedUser,
      },
    });
  } catch (err) {
    console.error('[ContactChange] detectContactChange error:', err);
  }
}

// ─── Event Handler ──────────────────────────────────────────────

async function handleContactChangeEvent(event: DomainEvent): Promise<void> {
  if (event.type !== EventType.CONTACT_FIELD_CHANGED) return;
  await detectContactChange(event);
}

// ─── Consumer Registration ──────────────────────────────────────

export function registerContactChangeConsumer(): void {
  const { getEventBus } = require('../../events/bus');
  const bus = getEventBus();

  bus.registerConsumer({
    name: 'contact-change-detection',
    eventTypes: [EventType.CONTACT_FIELD_CHANGED],
    handler: handleContactChangeEvent,
  });
}

// Export internals for testing
export {
  detectContactChange,
  handleContactChangeEvent,
};

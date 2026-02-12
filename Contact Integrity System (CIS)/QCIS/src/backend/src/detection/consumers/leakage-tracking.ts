// QwickServices CIS — Phase 3A: Off-Platform Leakage Funnel Consumer
// Tracks leakage progression: signal → attempt → confirmation → leakage
// Listens to MESSAGE_CREATED, MESSAGE_EDITED, BOOKING_CANCELLED

import { DomainEvent, EventType, MessageEventPayload, BookingEventPayload } from '../../events/types';
import { emitLeakageStageAdvanced } from '../../events/emit';
import { query } from '../../database/connection';
import { generateId } from '../../shared/utils';

const OFF_PLATFORM_SIGNAL_TYPES = [
  'CONTACT_PHONE', 'CONTACT_EMAIL', 'CONTACT_SOCIAL',
  'CONTACT_MESSAGING_APP', 'PAYMENT_EXTERNAL', 'OFF_PLATFORM_INTENT',
];

const STAGE_ORDER = ['signal', 'attempt', 'confirmation', 'leakage'];

// ─── Detection Logic ────────────────────────────────────────────

async function getRecentOffPlatformSignals(
  userId: string,
  counterpartyId: string
): Promise<Array<{ id: string; signal_type: string }>> {
  try {
    const result = await query(
      `SELECT id, signal_type FROM risk_signals
       WHERE user_id = $1
         AND signal_type = ANY($2)
         AND created_at >= NOW() - INTERVAL '7 days'
       ORDER BY created_at DESC
       LIMIT 20`,
      [userId, OFF_PLATFORM_SIGNAL_TYPES]
    );
    return result.rows;
  } catch (err) {
    console.error('[LeakageTracking] getRecentOffPlatformSignals error:', err);
    return [];
  }
}

async function getExistingLeakageEvent(
  userId: string,
  counterpartyId: string
): Promise<{ id: string; stage: string; signal_ids: string[]; evidence: Record<string, unknown> } | null> {
  try {
    const result = await query(
      `SELECT id, stage, signal_ids, evidence FROM leakage_events
       WHERE user_id = $1 AND counterparty_id = $2
         AND created_at >= NOW() - INTERVAL '7 days'
       ORDER BY created_at DESC LIMIT 1`,
      [userId, counterpartyId]
    );
    return result.rows[0] || null;
  } catch (err) {
    console.error('[LeakageTracking] getExistingLeakageEvent error:', err);
    return null;
  }
}

async function estimateRevenueLoss(
  userId: string,
  counterpartyId: string,
  serviceCategory?: string
): Promise<number | null> {
  try {
    // Try to find a booking amount between these users
    const bookingResult = await query(
      `SELECT amount FROM bookings
       WHERE client_id = $1 AND provider_id = $2
         AND amount IS NOT NULL
       ORDER BY created_at DESC LIMIT 1`,
      [userId, counterpartyId]
    );
    if (bookingResult.rows[0]?.amount) {
      return parseFloat(bookingResult.rows[0].amount);
    }

    // Fall back to category average
    const avgResult = await query(
      `SELECT AVG(amount) AS avg_amount FROM bookings
       WHERE amount IS NOT NULL AND status = 'completed'
       LIMIT 1`
    );
    const avg = parseFloat(avgResult.rows[0]?.avg_amount ?? '0');
    return avg > 0 ? Math.round(avg * 100) / 100 : null;
  } catch (err) {
    console.error('[LeakageTracking] estimateRevenueLoss error:', err);
    return null;
  }
}

async function createLeakageEvent(
  userId: string,
  counterpartyId: string,
  signalIds: string[],
  signalTypes: string[]
): Promise<void> {
  try {
    const id = generateId();
    const destination = detectPlatformDestination(signalTypes);

    await query(
      `INSERT INTO leakage_events (id, user_id, counterparty_id, stage, signal_ids, evidence, platform_destination)
       VALUES ($1, $2, $3, 'signal', $4, $5, $6)`,
      [
        id,
        userId,
        counterpartyId,
        signalIds,
        JSON.stringify({ signal_types: signalTypes, initial_detection: new Date().toISOString() }),
        destination,
      ]
    );
  } catch (err) {
    console.error('[LeakageTracking] createLeakageEvent error:', err);
  }
}

async function advanceLeakageStage(
  leakageEventId: string,
  userId: string,
  counterpartyId: string | undefined,
  currentStage: string,
  newSignalIds: string[],
  additionalEvidence: Record<string, unknown>
): Promise<void> {
  const currentIdx = STAGE_ORDER.indexOf(currentStage);
  if (currentIdx < 0 || currentIdx >= STAGE_ORDER.length - 1) return;

  const nextStage = STAGE_ORDER[currentIdx + 1];

  try {
    const revenueLoss = nextStage === 'confirmation' || nextStage === 'leakage'
      ? await estimateRevenueLoss(userId, counterpartyId || userId)
      : null;

    await query(
      `UPDATE leakage_events
       SET stage = $1,
           signal_ids = signal_ids || $2,
           evidence = evidence || $3,
           estimated_revenue_loss = COALESCE($4, estimated_revenue_loss),
           updated_at = NOW()
       WHERE id = $5`,
      [nextStage, newSignalIds, JSON.stringify(additionalEvidence), revenueLoss, leakageEventId]
    );

    await emitLeakageStageAdvanced({
      leakage_event_id: leakageEventId,
      user_id: userId,
      counterparty_id: counterpartyId,
      previous_stage: currentStage,
      new_stage: nextStage,
    });
  } catch (err) {
    console.error('[LeakageTracking] advanceLeakageStage error:', err);
  }
}

function detectPlatformDestination(signalTypes: string[]): string | null {
  if (signalTypes.includes('CONTACT_MESSAGING_APP')) return 'messaging_app';
  if (signalTypes.includes('CONTACT_SOCIAL')) return 'social_media';
  if (signalTypes.includes('CONTACT_PHONE')) return 'phone';
  if (signalTypes.includes('CONTACT_EMAIL')) return 'email';
  if (signalTypes.includes('PAYMENT_EXTERNAL')) return 'external_payment';
  return null;
}

// ─── Message-triggered leakage detection ─────────────────────────

async function handleMessageLeakage(event: DomainEvent): Promise<void> {
  const payload = event.payload as unknown as MessageEventPayload;
  if (!payload.sender_id || !payload.receiver_id) return;

  const signals = await getRecentOffPlatformSignals(payload.sender_id, payload.receiver_id);
  if (signals.length === 0) return;

  const signalIds = signals.map((s) => s.id);
  const signalTypes = [...new Set(signals.map((s) => s.signal_type))];

  const existing = await getExistingLeakageEvent(payload.sender_id, payload.receiver_id);

  if (!existing) {
    // Stage 1: Create new leakage event
    await createLeakageEvent(payload.sender_id, payload.receiver_id, signalIds, signalTypes);
    return;
  }

  // Check if we have a new signal type not in existing evidence
  const existingTypes: string[] = (existing.evidence as { signal_types?: string[] })?.signal_types || [];
  const newTypes = signalTypes.filter((t) => !existingTypes.includes(t));

  if (newTypes.length > 0 && existing.stage === 'signal') {
    // Advance to Stage 2 (ATTEMPT) — different signal type detected
    await advanceLeakageStage(
      existing.id,
      payload.sender_id,
      payload.receiver_id,
      existing.stage,
      signalIds,
      { new_signal_types: newTypes, advanced_at: new Date().toISOString() }
    );
  }
}

// ─── Booking cancellation leakage detection ──────────────────────

async function handleBookingCancellationLeakage(event: DomainEvent): Promise<void> {
  const payload = event.payload as unknown as BookingEventPayload;
  if (!payload.client_id || !payload.provider_id) return;

  // Check if a leakage_event at Stage 2 exists for (client, provider)
  const existing = await getExistingLeakageEvent(payload.client_id, payload.provider_id);

  if (existing && existing.stage === 'attempt') {
    await advanceLeakageStage(
      existing.id,
      payload.client_id,
      payload.provider_id,
      existing.stage,
      [],
      {
        booking_cancelled: payload.booking_id,
        cancellation_at: new Date().toISOString(),
      }
    );
  }
}

// ─── Event Handler ──────────────────────────────────────────────

async function handleLeakageEvent(event: DomainEvent): Promise<void> {
  switch (event.type) {
    case EventType.MESSAGE_CREATED:
    case EventType.MESSAGE_EDITED:
      await handleMessageLeakage(event);
      break;
    case EventType.BOOKING_CANCELLED:
      await handleBookingCancellationLeakage(event);
      break;
  }
}

// ─── Consumer Registration ──────────────────────────────────────

export function registerLeakageConsumer(): void {
  const { getEventBus } = require('../../events/bus');
  const bus = getEventBus();

  bus.registerConsumer({
    name: 'leakage-tracking',
    eventTypes: [
      EventType.MESSAGE_CREATED,
      EventType.MESSAGE_EDITED,
      EventType.BOOKING_CANCELLED,
    ],
    handler: handleLeakageEvent,
  });
}

// Export internals for testing
export {
  handleMessageLeakage,
  handleBookingCancellationLeakage,
  handleLeakageEvent,
  getRecentOffPlatformSignals,
  getExistingLeakageEvent,
  createLeakageEvent,
  advanceLeakageStage,
  estimateRevenueLoss,
  detectPlatformDestination,
};

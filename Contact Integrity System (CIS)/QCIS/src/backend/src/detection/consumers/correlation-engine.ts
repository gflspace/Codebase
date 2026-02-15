// QwickServices CIS — Phase 4: Cross-Signal Correlation Engine
// Detects off-platform transaction attempts by correlating booking events
// with prior contact-sharing signals from the same user pair.

import { DomainEvent, EventType, BookingEventPayload } from '../../events/types';
import { SignalType } from '../signals';
import { persistSignal } from '../persist';
import { query } from '../../database/connection';
import { generateId } from '../../shared/utils';

// Contact signal types to look for in correlation windows
const CONTACT_SIGNAL_TYPES = [
  'CONTACT_PHONE', 'CONTACT_EMAIL', 'CONTACT_SOCIAL',
  'CONTACT_MESSAGING_APP', 'OFF_PLATFORM_INTENT',
];

// ─── Correlation: Contact shared → Booking cancelled ─────────

async function detectContactThenCancel(
  event: DomainEvent,
  payload: BookingEventPayload
): Promise<void> {
  try {
    // Look back 6 hours for contact signals between same user pair
    const result = await query(
      `SELECT rs.id, rs.signal_type, rs.confidence, rs.created_at,
              rs.obfuscation_flags, rs.evidence
       FROM risk_signals rs
       WHERE rs.user_id = $1
         AND rs.signal_type = ANY($2)
         AND rs.created_at >= NOW() - INTERVAL '6 hours'
       ORDER BY rs.created_at DESC
       LIMIT 5`,
      [payload.client_id, CONTACT_SIGNAL_TYPES]
    );

    if (result.rows.length === 0) return;

    const contactSignal = result.rows[0];
    const timeDelta = Math.floor(
      (new Date(event.timestamp).getTime() - new Date(contactSignal.created_at).getTime()) / 1000
    );

    // Calculate confidence
    const hasObfuscation = contactSignal.obfuscation_flags && contactSignal.obfuscation_flags.length > 0;
    const isQuickCancel = timeDelta < 3600; // < 1 hour
    let confidence = 0.7;
    if (hasObfuscation) confidence += 0.1;
    if (isQuickCancel) confidence += 0.1;
    confidence = Math.min(1.0, confidence);

    // Insert correlation record
    await query(
      `INSERT INTO signal_correlations
       (id, correlation_type, user_id, counterparty_id, primary_signal_id, booking_id, confidence, time_delta_seconds, evidence)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        generateId(),
        'contact_then_cancel',
        payload.client_id,
        payload.provider_id,
        contactSignal.id,
        payload.booking_id,
        confidence,
        timeDelta,
        JSON.stringify({
          contact_signal_type: contactSignal.signal_type,
          obfuscation_detected: hasObfuscation,
          cancel_within_1hr: isQuickCancel,
        }),
      ]
    );

    // Generate a new risk signal
    await persistSignal(event.id, payload.client_id, {
      signal_type: SignalType.BOOKING_CANCEL_AFTER_CONTACT,
      confidence,
      evidence: {
        booking_id: payload.booking_id,
        contact_signal_id: contactSignal.id,
        contact_signal_type: contactSignal.signal_type,
        time_delta_seconds: timeDelta,
        obfuscation_detected: hasObfuscation,
      },
      pattern_flags: ['CORRELATION_CONTACT_CANCEL'],
    });

    console.log(
      `[CorrelationEngine] contact_then_cancel: user=${payload.client_id.slice(0, 8)}, confidence=${confidence}, delta=${timeDelta}s`
    );
  } catch (err) {
    console.error('[CorrelationEngine] detectContactThenCancel error:', err);
  }
}

// ─── Correlation: Contact shared → Fake/quick completion ─────

async function detectContactThenFakeComplete(
  event: DomainEvent,
  payload: BookingEventPayload
): Promise<void> {
  try {
    // Get booking duration
    const bookingResult = await query(
      `SELECT EXTRACT(EPOCH FROM (updated_at - scheduled_at)) AS duration_secs,
              service_category
       FROM bookings WHERE id = $1 AND scheduled_at IS NOT NULL`,
      [payload.booking_id]
    );
    if (bookingResult.rows.length === 0) return;

    const { duration_secs, service_category } = bookingResult.rows[0];
    if (!duration_secs || !service_category) return;

    // Get category average
    const avgResult = await query(
      `SELECT AVG(EXTRACT(EPOCH FROM (updated_at - scheduled_at))) AS avg_duration
       FROM bookings WHERE service_category = $1 AND status = 'completed' AND scheduled_at IS NOT NULL`,
      [service_category]
    );
    const avgDuration = parseFloat(avgResult.rows[0]?.avg_duration ?? '0');
    if (avgDuration <= 0) return;

    // Only flag if booking completed in <25% of average duration
    if (parseFloat(duration_secs) >= avgDuration * 0.25) return;

    // Look back 6 hours for contact signals
    const contactResult = await query(
      `SELECT rs.id, rs.signal_type, rs.created_at
       FROM risk_signals rs
       WHERE rs.user_id = $1
         AND rs.signal_type = ANY($2)
         AND rs.created_at >= NOW() - INTERVAL '6 hours'
       ORDER BY rs.created_at DESC LIMIT 1`,
      [payload.client_id, CONTACT_SIGNAL_TYPES]
    );

    if (contactResult.rows.length === 0) return;

    const contactSignal = contactResult.rows[0];
    const timeDelta = Math.floor(
      (new Date(event.timestamp).getTime() - new Date(contactSignal.created_at).getTime()) / 1000
    );

    const confidence = Math.min(1.0, 0.75);

    await query(
      `INSERT INTO signal_correlations
       (id, correlation_type, user_id, counterparty_id, primary_signal_id, booking_id, confidence, time_delta_seconds, evidence)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        generateId(),
        'contact_then_fake_complete',
        payload.client_id,
        payload.provider_id,
        contactSignal.id,
        payload.booking_id,
        confidence,
        timeDelta,
        JSON.stringify({
          contact_signal_type: contactSignal.signal_type,
          booking_duration_secs: parseFloat(duration_secs),
          category_avg_secs: avgDuration,
        }),
      ]
    );

    await persistSignal(event.id, payload.client_id, {
      signal_type: SignalType.OFF_PLATFORM_TRANSACTION_CORRELATED,
      confidence,
      evidence: {
        booking_id: payload.booking_id,
        contact_signal_id: contactSignal.id,
        duration_secs: parseFloat(duration_secs),
        category_avg_secs: avgDuration,
      },
      pattern_flags: ['CORRELATION_CONTACT_FAKE_COMPLETE'],
    });

    console.log(
      `[CorrelationEngine] contact_then_fake_complete: user=${payload.client_id.slice(0, 8)}, confidence=${confidence}`
    );
  } catch (err) {
    console.error('[CorrelationEngine] detectContactThenFakeComplete error:', err);
  }
}

// ─── Event Handler ──────────────────────────────────────────────

async function handleCorrelationEvent(event: DomainEvent): Promise<void> {
  const payload = event.payload as unknown as BookingEventPayload;
  if (!payload.client_id || !payload.provider_id) return;

  switch (event.type) {
    case EventType.BOOKING_CANCELLED:
      await detectContactThenCancel(event, payload);
      break;

    case EventType.BOOKING_COMPLETED:
      await detectContactThenFakeComplete(event, payload);
      break;

    case EventType.BOOKING_NO_SHOW:
      // No-shows after contact sharing are also suspicious
      await detectContactThenCancel(event, payload);
      break;
  }
}

// ─── Consumer Registration ──────────────────────────────────────

export function registerCorrelationConsumer(): void {
  const { getEventBus } = require('../../events/bus');
  const bus = getEventBus();

  bus.registerConsumer({
    name: 'correlation-engine',
    eventTypes: [
      EventType.BOOKING_CANCELLED,
      EventType.BOOKING_COMPLETED,
      EventType.BOOKING_NO_SHOW,
    ],
    handler: handleCorrelationEvent,
  });
}

export {
  detectContactThenCancel,
  detectContactThenFakeComplete,
  handleCorrelationEvent,
};

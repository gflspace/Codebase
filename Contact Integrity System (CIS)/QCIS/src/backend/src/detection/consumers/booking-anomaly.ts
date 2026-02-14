// QwickServices CIS — Phase 2C: Booking Anomaly Detection Consumer
// Analyzes booking events for cancellation fraud, fake completions,
// provider repeat patterns, time clustering, and value anomalies.

import { DomainEvent, EventType, BookingEventPayload } from '../../events/types';
import { SignalType } from '../signals';
import { persistSignal } from '../persist';
import { query } from '../../database/connection';

// ─── Detection Logic ────────────────────────────────────────────

async function detectRapidCancellation(
  event: DomainEvent,
  payload: BookingEventPayload
): Promise<void> {
  try {
    const result = await query(
      `SELECT COUNT(*) AS cancel_count
       FROM bookings
       WHERE client_id = $1
         AND status = 'cancelled'
         AND updated_at >= NOW() - INTERVAL '7 days'`,
      [payload.client_id]
    );
    const count = parseInt(result.rows[0]?.cancel_count ?? '0', 10);
    if (count >= 3) {
      const extra = count - 3;
      await persistSignal(event.id, payload.client_id, {
        signal_type: SignalType.BOOKING_RAPID_CANCELLATION,
        confidence: Math.min(1.0, 0.7 + extra * 0.1),
        evidence: { booking_id: payload.booking_id, cancel_count_7d: count },
      });
    }
  } catch (err) {
    console.error('[BookingAnomaly] detectRapidCancellation error:', err);
  }
}

async function detectFakeCompletionFromCancel(
  event: DomainEvent,
  payload: BookingEventPayload
): Promise<void> {
  try {
    const result = await query(
      `SELECT created_at, updated_at
       FROM bookings
       WHERE id = $1`,
      [payload.booking_id]
    );
    if (result.rows.length === 0) return;
    const { created_at, updated_at } = result.rows[0];
    const diffMs = new Date(updated_at).getTime() - new Date(created_at).getTime();
    if (diffMs < 30 * 60 * 1000) {
      await persistSignal(event.id, payload.client_id, {
        signal_type: SignalType.BOOKING_FAKE_COMPLETION,
        confidence: 0.6,
        evidence: { booking_id: payload.booking_id, cancel_after_minutes: Math.round(diffMs / 60000) },
      });
    }
  } catch (err) {
    console.error('[BookingAnomaly] detectFakeCompletionFromCancel error:', err);
  }
}

async function detectFakeCompletionFromComplete(
  event: DomainEvent,
  payload: BookingEventPayload
): Promise<void> {
  try {
    // Get this booking's duration
    const bookingResult = await query(
      `SELECT EXTRACT(EPOCH FROM (updated_at - scheduled_at)) AS duration_secs,
              service_category
       FROM bookings WHERE id = $1`,
      [payload.booking_id]
    );
    if (bookingResult.rows.length === 0) return;
    const { duration_secs, service_category } = bookingResult.rows[0];
    if (!duration_secs || !service_category) return;

    // Get category average
    const avgResult = await query(
      `SELECT AVG(EXTRACT(EPOCH FROM (updated_at - scheduled_at))) AS avg_duration
       FROM bookings
       WHERE service_category = $1
         AND status = 'completed'
         AND scheduled_at IS NOT NULL`,
      [service_category]
    );
    const avgDuration = parseFloat(avgResult.rows[0]?.avg_duration ?? '0');
    if (avgDuration <= 0) return;

    if (parseFloat(duration_secs) < avgDuration * 0.25) {
      await persistSignal(event.id, payload.client_id, {
        signal_type: SignalType.BOOKING_FAKE_COMPLETION,
        confidence: 0.65,
        evidence: {
          booking_id: payload.booking_id,
          duration_secs: parseFloat(duration_secs),
          category_avg_secs: avgDuration,
        },
      });
    }
  } catch (err) {
    console.error('[BookingAnomaly] detectFakeCompletionFromComplete error:', err);
  }
}

async function detectSameProviderRepeat(
  event: DomainEvent,
  payload: BookingEventPayload
): Promise<void> {
  try {
    const result = await query(
      `SELECT COUNT(*) AS repeat_count
       FROM bookings
       WHERE client_id = $1
         AND provider_id = $2
         AND status = 'completed'
         AND updated_at >= NOW() - INTERVAL '30 days'`,
      [payload.client_id, payload.provider_id]
    );
    const count = parseInt(result.rows[0]?.repeat_count ?? '0', 10);
    if (count >= 5) {
      await persistSignal(event.id, payload.client_id, {
        signal_type: SignalType.BOOKING_SAME_PROVIDER_REPEAT,
        confidence: 0.5,
        evidence: {
          booking_id: payload.booking_id,
          provider_id: payload.provider_id,
          repeat_count_30d: count,
        },
      });
    }
  } catch (err) {
    console.error('[BookingAnomaly] detectSameProviderRepeat error:', err);
  }
}

async function detectTimeClustering(
  event: DomainEvent,
  payload: BookingEventPayload
): Promise<void> {
  if (!payload.scheduled_at) return;
  try {
    const hour = new Date(payload.scheduled_at).getUTCHours();
    if (hour >= 2 && hour <= 5) {
      await persistSignal(event.id, payload.client_id, {
        signal_type: SignalType.BOOKING_TIME_CLUSTERING,
        confidence: 0.4,
        evidence: { booking_id: payload.booking_id, scheduled_hour_utc: hour },
      });
    }
  } catch (err) {
    console.error('[BookingAnomaly] detectTimeClustering error:', err);
  }
}

async function detectValueAnomaly(
  event: DomainEvent,
  payload: BookingEventPayload
): Promise<void> {
  if (!payload.amount || !payload.service_category) return;
  try {
    const result = await query(
      `SELECT AVG(amount) AS avg_amount, STDDEV(amount) AS stddev_amount
       FROM bookings
       WHERE service_category = $1
         AND amount IS NOT NULL`,
      [payload.service_category]
    );
    const avg = parseFloat(result.rows[0]?.avg_amount ?? '0');
    const stddev = parseFloat(result.rows[0]?.stddev_amount ?? '0');
    if (stddev <= 0) return;

    const deviation = Math.abs(payload.amount - avg) / stddev;
    if (deviation > 2) {
      await persistSignal(event.id, payload.client_id, {
        signal_type: SignalType.BOOKING_VALUE_ANOMALY,
        confidence: 0.55,
        evidence: {
          booking_id: payload.booking_id,
          amount: payload.amount,
          category_avg: avg,
          category_stddev: stddev,
          sigma_deviation: Math.round(deviation * 100) / 100,
        },
      });
    }
  } catch (err) {
    console.error('[BookingAnomaly] detectValueAnomaly error:', err);
  }
}

async function detectNoShowPattern(
  event: DomainEvent,
  payload: BookingEventPayload
): Promise<void> {
  try {
    await persistSignal(event.id, payload.client_id, {
      signal_type: SignalType.BOOKING_CANCEL_PATTERN,
      confidence: 0.7,
      evidence: { booking_id: payload.booking_id, trigger: 'no_show' },
    });
  } catch (err) {
    console.error('[BookingAnomaly] detectNoShowPattern error:', err);
  }
}

// ─── Phase 4: Repeated Unpaid Booking Detection ────────────────

async function detectRepeatedUnpaid(
  event: DomainEvent,
  payload: BookingEventPayload
): Promise<void> {
  try {
    // Query bookings for user pair where status = 'completed' in last 30 days
    // Cross-reference with payments: bookings with no corresponding completed payment
    const result = await query(
      `SELECT b.id AS booking_id, b.amount
       FROM bookings b
       LEFT JOIN transactions t
         ON t.booking_id = b.id AND t.status IN ('completed', 'success')
       WHERE b.client_id = $1
         AND b.provider_id = $2
         AND b.status = 'completed'
         AND b.updated_at >= NOW() - INTERVAL '30 days'
         AND t.id IS NULL`,
      [payload.client_id, payload.provider_id]
    );

    const unpaidCount = result.rows.length;
    if (unpaidCount >= 2) {
      const confidence = Math.min(1.0, 0.6 + (unpaidCount - 2) * 0.1);
      await persistSignal(event.id, payload.client_id, {
        signal_type: SignalType.REPEATED_UNPAID_BOOKING,
        confidence,
        evidence: {
          booking_id: payload.booking_id,
          provider_id: payload.provider_id,
          unpaid_booking_count: unpaidCount,
          unpaid_booking_ids: result.rows.map((r: { booking_id: string }) => r.booking_id),
        },
        pattern_flags: ['REPEATED_UNPAID'],
      });
      console.log(
        `[BookingAnomaly] REPEATED_UNPAID_BOOKING: user=${payload.client_id.slice(0, 8)}, provider=${payload.provider_id.slice(0, 8)}, count=${unpaidCount}`
      );
    }
  } catch (err) {
    console.error('[BookingAnomaly] detectRepeatedUnpaid error:', err);
  }
}

// ─── Phase 5: Dispute Event Handling ────────────────────────────

async function handleDisputeOpened(event: DomainEvent): Promise<void> {
  const payload = event.payload as Record<string, unknown>;
  const userId = String(payload.complainant_id || payload.user_id || '');
  if (!userId) return;

  try {
    // If user has 3+ disputes in 90 days → signal PROVIDER_COMPLAINT_CLUSTER
    const result = await query(
      `SELECT COUNT(*) AS dispute_count
       FROM disputes
       WHERE (complainant_id = $1 OR respondent_id = $1)
         AND created_at >= NOW() - INTERVAL '90 days'`,
      [userId]
    );
    const disputeCount = parseInt(result.rows[0]?.dispute_count ?? '0', 10);

    if (disputeCount >= 3) {
      await persistSignal(event.id, userId, {
        signal_type: SignalType.PROVIDER_COMPLAINT_CLUSTER,
        confidence: Math.min(1.0, 0.6 + (disputeCount - 3) * 0.1),
        evidence: {
          dispute_count_90d: disputeCount,
          dispute_id: payload.dispute_id,
        },
        pattern_flags: ['DISPUTE_CLUSTER'],
      });
    }

    // If dispute follows booking completion in <2 hours → potential fraud indicator
    if (payload.booking_id) {
      const bookingResult = await query(
        `SELECT updated_at FROM bookings WHERE id = $1 AND status = 'completed'`,
        [payload.booking_id]
      );
      if (bookingResult.rows.length > 0) {
        const completedAt = new Date(bookingResult.rows[0].updated_at).getTime();
        const disputeAt = new Date(event.timestamp).getTime();
        const hoursDiff = (disputeAt - completedAt) / (1000 * 60 * 60);
        if (hoursDiff < 2 && hoursDiff >= 0) {
          await persistSignal(event.id, userId, {
            signal_type: SignalType.BOOKING_CANCEL_PATTERN,
            confidence: 0.65,
            evidence: {
              booking_id: payload.booking_id,
              dispute_id: payload.dispute_id,
              hours_after_completion: Math.round(hoursDiff * 100) / 100,
              trigger: 'rapid_dispute_after_completion',
            },
            pattern_flags: ['RAPID_DISPUTE'],
          });
        }
      }
    }
  } catch (err) {
    console.error('[BookingAnomaly] handleDisputeOpened error:', err);
  }
}

// ─── Event Handler ──────────────────────────────────────────────

async function handleBookingEvent(event: DomainEvent): Promise<void> {
  // Handle dispute events separately
  if (event.type === EventType.DISPUTE_OPENED) {
    await handleDisputeOpened(event);
    return;
  }

  const payload = event.payload as unknown as BookingEventPayload;
  if (!payload.client_id) return;

  switch (event.type) {
    case EventType.BOOKING_CANCELLED:
      await detectRapidCancellation(event, payload);
      await detectFakeCompletionFromCancel(event, payload);
      break;

    case EventType.BOOKING_COMPLETED:
      await detectFakeCompletionFromComplete(event, payload);
      await detectSameProviderRepeat(event, payload);
      await detectRepeatedUnpaid(event, payload);
      break;

    case EventType.BOOKING_CREATED:
      await detectTimeClustering(event, payload);
      await detectValueAnomaly(event, payload);
      break;

    case EventType.BOOKING_NO_SHOW:
      await detectNoShowPattern(event, payload);
      break;
  }
}

// ─── Consumer Registration ──────────────────────────────────────

export function registerBookingAnomalyConsumer(): void {
  const { getEventBus } = require('../../events/bus');
  const bus = getEventBus();

  bus.registerConsumer({
    name: 'booking-anomaly-detection',
    eventTypes: [
      EventType.BOOKING_CREATED,
      EventType.BOOKING_CANCELLED,
      EventType.BOOKING_COMPLETED,
      EventType.BOOKING_NO_SHOW,
      EventType.DISPUTE_OPENED,
    ],
    handler: handleBookingEvent,
  });
}

// Export internals for testing
export {
  detectRapidCancellation,
  detectFakeCompletionFromCancel,
  detectFakeCompletionFromComplete,
  detectSameProviderRepeat,
  detectTimeClustering,
  detectValueAnomaly,
  detectNoShowPattern,
  detectRepeatedUnpaid,
  handleDisputeOpened,
  handleBookingEvent,
};

// QwickServices CIS — Integration Test Matrix Infrastructure
// Shared helpers for setting up test scenarios, seeding data, and verifying outcomes.

import { query } from '../../src/database/connection';
import { EventType, DomainEvent } from '../../src/events/types';
import { getEventBus } from '../../src/events/bus';
import { generateId, nowISO } from '../../src/shared/utils';

// Re-export for test convenience
export { generateId };

export interface TestScenario {
  name: string;
  category: string;
  setup: () => Promise<void>;
  action: () => Promise<void>;
  expectedEvent: EventType;
  expectedSignals: string[];
  expectedRiskChange: 'increase' | 'decrease' | 'stable';
  expectedEnforcement: string | null;
  verify: () => Promise<void>;
}

// ─── Test Data Factories ─────────────────────────────────────

export async function createTestUser(overrides: Partial<{
  id: string; display_name: string; email: string; user_type: string;
  status: string; trust_score: number; verification_status: string;
}> = {}): Promise<string> {
  const id = overrides.id || generateId();
  await query(
    `INSERT INTO users (id, external_id, display_name, email, user_type, status, trust_score, verification_status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
     ON CONFLICT (id) DO NOTHING`,
    [
      id,
      id,
      overrides.display_name || `test_user_${id.slice(0, 8)}`,
      overrides.email || `${id.slice(0, 8)}@test.cis`,
      overrides.user_type || 'client',
      overrides.status || 'active',
      overrides.trust_score ?? 0,
      overrides.verification_status || 'verified',
    ]
  );
  return id;
}

export async function createTestBooking(overrides: Partial<{
  id: string; client_id: string; provider_id: string; status: string;
  amount: number; service_category: string; scheduled_at: string;
}> = {}): Promise<string> {
  const id = overrides.id || generateId();
  await query(
    `INSERT INTO bookings (id, client_id, provider_id, status, amount, currency, service_category, scheduled_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 'USD', $6, $7, NOW(), NOW())
     ON CONFLICT (id) DO NOTHING`,
    [
      id,
      overrides.client_id || generateId(),
      overrides.provider_id || generateId(),
      overrides.status || 'pending',
      overrides.amount ?? 100,
      overrides.service_category || 'general',
      overrides.scheduled_at || new Date(Date.now() + 86400000).toISOString(),
    ]
  );
  return id;
}

export async function createTestSignal(overrides: Partial<{
  id: string; source_event_id: string; user_id: string; signal_type: string;
  confidence: number; evidence: Record<string, unknown>;
}> = {}): Promise<string> {
  const id = overrides.id || generateId();
  await query(
    `INSERT INTO risk_signals (id, source_event_id, user_id, signal_type, confidence, evidence, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (id) DO NOTHING`,
    [
      id,
      overrides.source_event_id || generateId(),
      overrides.user_id || generateId(),
      overrides.signal_type || 'CONTACT_PHONE',
      overrides.confidence ?? 0.7,
      JSON.stringify(overrides.evidence || {}),
    ]
  );
  return id;
}

// ─── Event Emission Helpers ──────────────────────────────────

export function buildDomainEvent(type: EventType, payload: Record<string, unknown>): DomainEvent {
  return {
    id: generateId(),
    type,
    correlation_id: generateId(),
    timestamp: nowISO(),
    version: 1,
    payload,
  };
}

export async function emitTestEvent(type: EventType, payload: Record<string, unknown>): Promise<DomainEvent> {
  const event = buildDomainEvent(type, payload);
  const bus = getEventBus();
  await bus.emit(event);
  return event;
}

// ─── Verification Helpers ────────────────────────────────────

export async function getSignalsForUser(userId: string, signalType?: string): Promise<Record<string, unknown>[]> {
  try {
    const result = signalType
      ? await query('SELECT * FROM risk_signals WHERE user_id = $1 AND signal_type = $2 ORDER BY created_at DESC', [userId, signalType])
      : await query('SELECT * FROM risk_signals WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    return result.rows;
  } catch {
    // Signal type enum value may not exist in DB yet
    return [];
  }
}

export async function getLatestScore(userId: string): Promise<{ score: number; tier: string; trend: string } | null> {
  const result = await query(
    'SELECT score, tier, trend FROM risk_scores WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
    [userId]
  );
  if (result.rows.length === 0) return null;
  return {
    score: parseFloat(result.rows[0].score),
    tier: result.rows[0].tier,
    trend: result.rows[0].trend,
  };
}

export async function getEnforcementActions(userId: string): Promise<Record<string, unknown>[]> {
  const result = await query(
    'SELECT * FROM enforcement_actions WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return result.rows;
}

export async function getCorrelations(userId: string, type?: string): Promise<Record<string, unknown>[]> {
  try {
    const result = type
      ? await query('SELECT * FROM signal_correlations WHERE user_id = $1 AND correlation_type = $2 ORDER BY created_at DESC', [userId, type])
      : await query('SELECT * FROM signal_correlations WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    return result.rows;
  } catch {
    // signal_correlations table may not exist yet
    return [];
  }
}

export async function waitForProcessing(ms: number = 2000): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Cleanup ─────────────────────────────────────────────────

export async function cleanupTestData(userIds: string[]): Promise<void> {
  if (userIds.length === 0) return;
  const placeholders = userIds.map((_, i) => `$${i + 1}`).join(', ');
  await query(`DELETE FROM signal_correlations WHERE user_id IN (${placeholders})`, userIds).catch(() => {});
  await query(`DELETE FROM risk_signals WHERE user_id IN (${placeholders})`, userIds).catch(() => {});
  await query(`DELETE FROM risk_scores WHERE user_id IN (${placeholders})`, userIds).catch(() => {});
  await query(`DELETE FROM enforcement_actions WHERE user_id IN (${placeholders})`, userIds).catch(() => {});
  await query(`DELETE FROM bookings WHERE client_id IN (${placeholders}) OR provider_id IN (${placeholders})`, [...userIds, ...userIds]).catch(() => {});
  await query(`DELETE FROM users WHERE id IN (${placeholders})`, userIds).catch(() => {});
}

// ─── Consumer Registration ──────────────────────────────────
// Source code uses require() inside registerXxxConsumer() functions which
// doesn't work in vitest. We directly register handlers on the event bus
// by importing the analysis functions and wiring them up.

let _consumersRegistered = false;

export async function registerTestConsumers(): Promise<void> {
  if (_consumersRegistered) return;
  _consumersRegistered = true;

  const bus = getEventBus();

  // Detection consumer — analyzes messages for contact sharing / grooming
  const { analyzeEvent } = await import('../../src/detection/index');
  bus.registerConsumer({
    name: 'detection-orchestrator',
    eventTypes: [EventType.MESSAGE_CREATED, EventType.MESSAGE_EDITED],
    handler: async (event: DomainEvent) => {
      await analyzeEvent(event);
    },
  });

  // Scoring consumer — computes risk scores after signals are generated
  const { computeRiskScore } = await import('../../src/scoring/index');
  bus.registerConsumer({
    name: 'scoring-engine',
    eventTypes: [
      EventType.MESSAGE_CREATED, EventType.MESSAGE_EDITED,
      EventType.TRANSACTION_INITIATED, EventType.TRANSACTION_COMPLETED, EventType.TRANSACTION_FAILED,
      EventType.BOOKING_CREATED, EventType.BOOKING_CANCELLED, EventType.BOOKING_COMPLETED, EventType.BOOKING_NO_SHOW,
      EventType.WALLET_DEPOSIT, EventType.WALLET_WITHDRAWAL, EventType.WALLET_TRANSFER,
      EventType.PROVIDER_REGISTERED, EventType.PROVIDER_UPDATED, EventType.USER_REGISTERED,
      EventType.DISPUTE_OPENED, EventType.DISPUTE_RESOLVED, EventType.REFUND_PROCESSED, EventType.PROFILE_UPDATED,
    ],
    handler: async (event: DomainEvent) => {
      const userId = (event.payload as Record<string, string>).sender_id
        || (event.payload as Record<string, string>).user_id
        || (event.payload as Record<string, string>).client_id
        || (event.payload as Record<string, string>).provider_id;
      if (!userId) return;
      await new Promise(resolve => setTimeout(resolve, 500));
      await computeRiskScore(userId);
    },
  });

  // Booking anomaly consumer
  try {
    const { handleBookingEvent } = await import('../../src/detection/consumers/booking-anomaly');
    bus.registerConsumer({
      name: 'booking-anomaly-detection',
      eventTypes: [
        EventType.BOOKING_CREATED, EventType.BOOKING_CANCELLED,
        EventType.BOOKING_COMPLETED, EventType.BOOKING_NO_SHOW,
        EventType.DISPUTE_OPENED,
      ],
      handler: handleBookingEvent,
    });
  } catch {
    // Non-critical
  }

  // Payment anomaly consumer
  try {
    const { handlePaymentEvent } = await import('../../src/detection/consumers/payment-anomaly');
    bus.registerConsumer({
      name: 'payment-anomaly-detection',
      eventTypes: [
        EventType.WALLET_DEPOSIT, EventType.WALLET_WITHDRAWAL, EventType.WALLET_TRANSFER,
        EventType.TRANSACTION_INITIATED, EventType.TRANSACTION_COMPLETED, EventType.TRANSACTION_FAILED,
      ],
      handler: handlePaymentEvent,
    });
  } catch {
    // Non-critical
  }

  // Device fingerprint consumer
  try {
    const { handleDeviceEvent } = await import('../../src/detection/consumers/device-fingerprint');
    bus.registerConsumer({
      name: 'device-fingerprint',
      eventTypes: [
        EventType.MESSAGE_CREATED, EventType.BOOKING_CREATED,
        EventType.TRANSACTION_INITIATED, EventType.PROVIDER_REGISTERED,
        EventType.USER_REGISTERED, EventType.WALLET_DEPOSIT,
      ],
      handler: handleDeviceEvent,
    });
  } catch {
    // Non-critical
  }

  // Correlation engine
  try {
    const { handleCorrelationEvent } = await import('../../src/detection/consumers/correlation-engine');
    bus.registerConsumer({
      name: 'correlation-engine',
      eventTypes: [
        EventType.BOOKING_CANCELLED, EventType.BOOKING_COMPLETED,
        EventType.BOOKING_NO_SHOW,
      ],
      handler: handleCorrelationEvent,
    });
  } catch {
    // Non-critical if correlation engine not available
  }
}

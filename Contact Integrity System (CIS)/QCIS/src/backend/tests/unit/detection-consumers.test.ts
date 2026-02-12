// QwickServices CIS — Phase 2C: Detection Consumer Unit Tests
// Tests all 5 new consumers + persistSignal helper (~40 tests)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockQuery, resetAllMocks, uuid } from '../helpers/setup';
import { EventType, DomainEvent } from '../../src/events/types';
import { SignalType } from '../../src/detection/signals';

// ─── Helpers ────────────────────────────────────────────────────

function buildEvent(
  type: EventType,
  payload: Record<string, unknown>,
  id?: string
): DomainEvent {
  return {
    id: id ?? uuid(99),
    type,
    correlation_id: uuid(100),
    timestamp: new Date().toISOString(),
    version: 1,
    payload,
  };
}

// ─── persistSignal Tests ────────────────────────────────────────

describe('persistSignal', () => {
  beforeEach(() => resetAllMocks());

  it('clamps confidence to [0, 1]', async () => {
    const { persistSignal } = await import('../../src/detection/persist');
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await persistSignal('evt-1', 'user-1', {
      signal_type: 'TEST',
      confidence: 1.5,
      evidence: {},
    });
    expect(mockQuery).toHaveBeenCalledTimes(1);
    const args = mockQuery.mock.calls[0][1];
    expect(args[4]).toBe(1.0); // confidence clamped to 1.0
  });

  it('clamps negative confidence to 0', async () => {
    const { persistSignal } = await import('../../src/detection/persist');
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await persistSignal('evt-1', 'user-1', {
      signal_type: 'TEST',
      confidence: -0.5,
      evidence: {},
    });
    const args = mockQuery.mock.calls[0][1];
    expect(args[4]).toBe(0);
  });

  it('handles DB errors gracefully without throwing', async () => {
    const { persistSignal } = await import('../../src/detection/persist');
    mockQuery.mockRejectedValueOnce(new Error('connection refused'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(
      persistSignal('evt-1', 'user-1', { signal_type: 'TEST', confidence: 0.5, evidence: {} })
    ).resolves.toBeUndefined();
    consoleSpy.mockRestore();
  });
});

// ─── BookingAnomaly Tests ───────────────────────────────────────

describe('BookingAnomalyConsumer', () => {
  beforeEach(() => resetAllMocks());

  it('emits BOOKING_RAPID_CANCELLATION for 3+ cancellations in 7 days', async () => {
    const { handleBookingEvent } = await import('../../src/detection/consumers/booking-anomaly');
    // cancel count query → 4 cancellations
    mockQuery.mockResolvedValueOnce({ rows: [{ cancel_count: '4' }], rowCount: 1 });
    // fake completion query (booking timestamps)
    mockQuery.mockResolvedValueOnce({
      rows: [{ created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T02:00:00Z' }],
      rowCount: 1,
    });
    // persistSignal for RAPID_CANCELLATION
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const event = buildEvent(EventType.BOOKING_CANCELLED, {
      booking_id: uuid(1),
      client_id: uuid(2),
      provider_id: uuid(3),
      status: 'cancelled',
    });
    await handleBookingEvent(event);

    // Should persist RAPID_CANCELLATION (3rd call after the two queries)
    const persistCall = mockQuery.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO risk_signals')
    );
    expect(persistCall).toBeDefined();
    expect(persistCall![1][3]).toBe(SignalType.BOOKING_RAPID_CANCELLATION);
    // confidence = 0.7 + (4-3)*0.1 = 0.8
    expect(persistCall![1][4]).toBeCloseTo(0.8, 2);
  });

  it('does NOT emit RAPID_CANCELLATION for 2 cancellations', async () => {
    const { handleBookingEvent } = await import('../../src/detection/consumers/booking-anomaly');
    // cancel count → 2
    mockQuery.mockResolvedValueOnce({ rows: [{ cancel_count: '2' }], rowCount: 1 });
    // fake completion → long gap (no trigger)
    mockQuery.mockResolvedValueOnce({
      rows: [{ created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T05:00:00Z' }],
      rowCount: 1,
    });

    const event = buildEvent(EventType.BOOKING_CANCELLED, {
      booking_id: uuid(1), client_id: uuid(2), provider_id: uuid(3), status: 'cancelled',
    });
    await handleBookingEvent(event);

    const persistCalls = mockQuery.mock.calls.filter(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO risk_signals')
    );
    expect(persistCalls.length).toBe(0);
  });

  it('emits BOOKING_FAKE_COMPLETION when cancelled within 30min of creation', async () => {
    const { handleBookingEvent } = await import('../../src/detection/consumers/booking-anomaly');
    // cancel count → 0
    mockQuery.mockResolvedValueOnce({ rows: [{ cancel_count: '0' }], rowCount: 1 });
    // booking timestamps → 10 min gap
    const created = new Date('2026-01-01T10:00:00Z');
    const updated = new Date('2026-01-01T10:10:00Z');
    mockQuery.mockResolvedValueOnce({
      rows: [{ created_at: created.toISOString(), updated_at: updated.toISOString() }],
      rowCount: 1,
    });
    // persist signal
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const event = buildEvent(EventType.BOOKING_CANCELLED, {
      booking_id: uuid(1), client_id: uuid(2), provider_id: uuid(3), status: 'cancelled',
    });
    await handleBookingEvent(event);

    const persistCall = mockQuery.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO risk_signals')
    );
    expect(persistCall).toBeDefined();
    expect(persistCall![1][3]).toBe(SignalType.BOOKING_FAKE_COMPLETION);
    expect(persistCall![1][4]).toBeCloseTo(0.6, 2);
  });

  it('emits BOOKING_SAME_PROVIDER_REPEAT for 5+ bookings with same provider', async () => {
    const { handleBookingEvent } = await import('../../src/detection/consumers/booking-anomaly');
    // fake completion: duration query → no data (no scheduled_at)
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    // same provider repeat count → 6
    mockQuery.mockResolvedValueOnce({ rows: [{ repeat_count: '6' }], rowCount: 1 });
    // persist
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const event = buildEvent(EventType.BOOKING_COMPLETED, {
      booking_id: uuid(1), client_id: uuid(2), provider_id: uuid(3), status: 'completed',
    });
    await handleBookingEvent(event);

    const persistCall = mockQuery.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO risk_signals')
    );
    expect(persistCall).toBeDefined();
    expect(persistCall![1][3]).toBe(SignalType.BOOKING_SAME_PROVIDER_REPEAT);
  });

  it('emits BOOKING_TIME_CLUSTERING for late-night bookings (2-5 UTC)', async () => {
    const { handleBookingEvent } = await import('../../src/detection/consumers/booking-anomaly');
    // value anomaly: no amount, so skip
    // persist for time clustering
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const event = buildEvent(EventType.BOOKING_CREATED, {
      booking_id: uuid(1), client_id: uuid(2), provider_id: uuid(3),
      status: 'created', scheduled_at: '2026-06-15T03:30:00Z',
    });
    await handleBookingEvent(event);

    const persistCall = mockQuery.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO risk_signals')
    );
    expect(persistCall).toBeDefined();
    expect(persistCall![1][3]).toBe(SignalType.BOOKING_TIME_CLUSTERING);
  });

  it('emits BOOKING_VALUE_ANOMALY when amount > 2 stddev from category avg', async () => {
    const { handleBookingEvent } = await import('../../src/detection/consumers/booking-anomaly');
    // time clustering: scheduled at noon (no trigger)
    // value anomaly: avg=100, stddev=20, amount=200 → deviation=5
    mockQuery.mockResolvedValueOnce({ rows: [{ avg_amount: '100', stddev_amount: '20' }], rowCount: 1 });
    // persist
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const event = buildEvent(EventType.BOOKING_CREATED, {
      booking_id: uuid(1), client_id: uuid(2), provider_id: uuid(3),
      status: 'created', scheduled_at: '2026-06-15T12:00:00Z',
      amount: 200, service_category: 'cleaning', currency: 'USD',
    });
    await handleBookingEvent(event);

    const persistCall = mockQuery.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO risk_signals')
    );
    expect(persistCall).toBeDefined();
    expect(persistCall![1][3]).toBe(SignalType.BOOKING_VALUE_ANOMALY);
  });

  it('handles DB error gracefully without crashing', async () => {
    const { handleBookingEvent } = await import('../../src/detection/consumers/booking-anomaly');
    mockQuery.mockRejectedValue(new Error('DB down'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const event = buildEvent(EventType.BOOKING_CANCELLED, {
      booking_id: uuid(1), client_id: uuid(2), provider_id: uuid(3), status: 'cancelled',
    });
    await expect(handleBookingEvent(event)).resolves.toBeUndefined();
    consoleSpy.mockRestore();
  });
});

// ─── PaymentAnomaly Tests ───────────────────────────────────────

describe('PaymentAnomalyConsumer', () => {
  beforeEach(() => resetAllMocks());

  it('emits PAYMENT_CIRCULAR when counterparty sent similar amount back', async () => {
    const { handlePaymentEvent } = await import('../../src/detection/consumers/payment-anomaly');
    // circular check → found reverse
    mockQuery.mockResolvedValueOnce({ rows: [{ reverse_count: '1' }], rowCount: 1 });
    // persist circular
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    // split transaction check → 0
    mockQuery.mockResolvedValueOnce({ rows: [{ tx_count: '0', total: '0' }], rowCount: 1 });
    // method switching check → 1
    mockQuery.mockResolvedValueOnce({ rows: [{ method_count: '1' }], rowCount: 1 });

    const event = buildEvent(EventType.WALLET_TRANSFER, {
      wallet_tx_id: uuid(1), user_id: uuid(2), counterparty_id: uuid(3),
      tx_type: 'transfer', amount: 100, currency: 'USD', status: 'completed',
    });
    await handlePaymentEvent(event);

    const persistCall = mockQuery.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO risk_signals')
    );
    expect(persistCall).toBeDefined();
    expect(persistCall![1][3]).toBe(SignalType.PAYMENT_CIRCULAR);
    expect(persistCall![1][4]).toBeCloseTo(0.75, 2);
  });

  it('does NOT emit PAYMENT_CIRCULAR when no reverse payment found', async () => {
    const { handlePaymentEvent } = await import('../../src/detection/consumers/payment-anomaly');
    // circular → 0
    mockQuery.mockResolvedValueOnce({ rows: [{ reverse_count: '0' }], rowCount: 1 });
    // split → 0
    mockQuery.mockResolvedValueOnce({ rows: [{ tx_count: '0', total: '0' }], rowCount: 1 });
    // method switching → 1
    mockQuery.mockResolvedValueOnce({ rows: [{ method_count: '1' }], rowCount: 1 });

    const event = buildEvent(EventType.WALLET_TRANSFER, {
      wallet_tx_id: uuid(1), user_id: uuid(2), counterparty_id: uuid(3),
      tx_type: 'transfer', amount: 100, currency: 'USD', status: 'completed',
    });
    await handlePaymentEvent(event);

    const persistCalls = mockQuery.mock.calls.filter(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO risk_signals')
    );
    expect(persistCalls.length).toBe(0);
  });

  it('emits PAYMENT_RAPID_TOPUP for 4 deposits in 24h', async () => {
    const { handlePaymentEvent } = await import('../../src/detection/consumers/payment-anomaly');
    // rapid topup count → 4
    mockQuery.mockResolvedValueOnce({ rows: [{ deposit_count: '4' }], rowCount: 1 });
    // persist
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    // method switching → 1
    mockQuery.mockResolvedValueOnce({ rows: [{ method_count: '1' }], rowCount: 1 });

    const event = buildEvent(EventType.WALLET_DEPOSIT, {
      wallet_tx_id: uuid(1), user_id: uuid(2),
      tx_type: 'deposit', amount: 50, currency: 'USD', status: 'completed',
    });
    await handlePaymentEvent(event);

    const persistCall = mockQuery.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO risk_signals')
    );
    expect(persistCall).toBeDefined();
    expect(persistCall![1][3]).toBe(SignalType.PAYMENT_RAPID_TOPUP);
    // confidence = 0.5 + (4-3)*0.1 = 0.6
    expect(persistCall![1][4]).toBeCloseTo(0.6, 2);
  });

  it('does NOT emit RAPID_TOPUP for 2 deposits', async () => {
    const { handlePaymentEvent } = await import('../../src/detection/consumers/payment-anomaly');
    // rapid topup → 2
    mockQuery.mockResolvedValueOnce({ rows: [{ deposit_count: '2' }], rowCount: 1 });
    // method switching → 1
    mockQuery.mockResolvedValueOnce({ rows: [{ method_count: '1' }], rowCount: 1 });

    const event = buildEvent(EventType.WALLET_DEPOSIT, {
      wallet_tx_id: uuid(1), user_id: uuid(2),
      tx_type: 'deposit', amount: 50, currency: 'USD', status: 'completed',
    });
    await handlePaymentEvent(event);

    const persistCalls = mockQuery.mock.calls.filter(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO risk_signals')
    );
    expect(persistCalls.length).toBe(0);
  });

  it('emits PAYMENT_SPLIT_TRANSACTION for multiple txs to same counterparty', async () => {
    const { detectSplitTransaction } = await import('../../src/detection/consumers/payment-anomaly');
    // tx count in last 1h to same counterparty → 3, total=300
    mockQuery.mockResolvedValueOnce({ rows: [{ tx_count: '3', total: '300' }], rowCount: 1 });
    // avg single tx → 200
    mockQuery.mockResolvedValueOnce({ rows: [{ avg_amount: '200' }], rowCount: 1 });
    // persist
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const event = buildEvent(EventType.TRANSACTION_COMPLETED, {
      transaction_id: uuid(1), user_id: uuid(2), counterparty_id: uuid(3),
      amount: 100, currency: 'USD', status: 'completed',
    });
    await detectSplitTransaction(event);

    const persistCall = mockQuery.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO risk_signals')
    );
    expect(persistCall).toBeDefined();
    expect(persistCall![1][3]).toBe(SignalType.PAYMENT_SPLIT_TRANSACTION);
  });

  it('emits PAYMENT_METHOD_SWITCHING for 3+ distinct methods in 7 days', async () => {
    const { detectMethodSwitching } = await import('../../src/detection/consumers/payment-anomaly');
    // distinct methods → 3
    mockQuery.mockResolvedValueOnce({ rows: [{ method_count: '3' }], rowCount: 1 });
    // persist
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const event = buildEvent(EventType.WALLET_DEPOSIT, {
      wallet_tx_id: uuid(1), user_id: uuid(2),
      tx_type: 'deposit', amount: 50, currency: 'USD', status: 'completed',
    });
    await detectMethodSwitching(event);

    const persistCall = mockQuery.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO risk_signals')
    );
    expect(persistCall).toBeDefined();
    expect(persistCall![1][3]).toBe(SignalType.PAYMENT_METHOD_SWITCHING);
  });

  it('emits PAYMENT_WITHDRAWAL_SPIKE when withdrawal > 2× avg deposit', async () => {
    const { handlePaymentEvent } = await import('../../src/detection/consumers/payment-anomaly');
    // withdrawal spike: avg deposit = 100, withdrawal amount = 250
    mockQuery.mockResolvedValueOnce({ rows: [{ avg_deposit: '100' }], rowCount: 1 });
    // persist
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    // method switching → 1
    mockQuery.mockResolvedValueOnce({ rows: [{ method_count: '1' }], rowCount: 1 });

    const event = buildEvent(EventType.WALLET_WITHDRAWAL, {
      wallet_tx_id: uuid(1), user_id: uuid(2),
      tx_type: 'withdrawal', amount: 250, currency: 'USD', status: 'completed',
    });
    await handlePaymentEvent(event);

    const persistCall = mockQuery.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO risk_signals')
    );
    expect(persistCall).toBeDefined();
    expect(persistCall![1][3]).toBe(SignalType.PAYMENT_WITHDRAWAL_SPIKE);
  });
});

// ─── ProviderBehavior Tests ─────────────────────────────────────

describe('ProviderBehaviorConsumer', () => {
  beforeEach(() => resetAllMocks());

  it('emits PROVIDER_DUPLICATE_IDENTITY when phone/email matches another user', async () => {
    const { handleProviderEvent } = await import('../../src/detection/consumers/provider-behavior');
    // duplicate identity check → 1 match
    mockQuery.mockResolvedValueOnce({ rows: [{ match_count: '1' }], rowCount: 1 });
    // persist
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const event = buildEvent(EventType.PROVIDER_REGISTERED, {
      provider_id: uuid(1), user_id: uuid(2),
    });
    await handleProviderEvent(event);

    const persistCall = mockQuery.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO risk_signals')
    );
    expect(persistCall).toBeDefined();
    expect(persistCall![1][3]).toBe(SignalType.PROVIDER_DUPLICATE_IDENTITY);
    expect(persistCall![1][4]).toBeCloseTo(0.8, 2);
  });

  it('does NOT emit DUPLICATE_IDENTITY when no matches', async () => {
    const { handleProviderEvent } = await import('../../src/detection/consumers/provider-behavior');
    // no match
    mockQuery.mockResolvedValueOnce({ rows: [{ match_count: '0' }], rowCount: 1 });

    const event = buildEvent(EventType.PROVIDER_REGISTERED, {
      provider_id: uuid(1), user_id: uuid(2),
    });
    await handleProviderEvent(event);

    const persistCalls = mockQuery.mock.calls.filter(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO risk_signals')
    );
    expect(persistCalls.length).toBe(0);
  });

  it('emits PROVIDER_RESPONSE_DEGRADATION when recent avg > 1.5× historical', async () => {
    const { handleProviderEvent } = await import('../../src/detection/consumers/provider-behavior');
    // recent 30d avg duration → 600s
    mockQuery.mockResolvedValueOnce({ rows: [{ avg_duration: '600' }], rowCount: 1 });
    // historical 90d avg → 300s (ratio = 2.0 > 1.5)
    mockQuery.mockResolvedValueOnce({ rows: [{ avg_duration: '300' }], rowCount: 1 });
    // persist
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const event = buildEvent(EventType.BOOKING_COMPLETED, {
      booking_id: uuid(1), client_id: uuid(2), provider_id: uuid(3), status: 'completed',
    });
    await handleProviderEvent(event);

    const persistCall = mockQuery.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO risk_signals')
    );
    expect(persistCall).toBeDefined();
    expect(persistCall![1][3]).toBe(SignalType.PROVIDER_RESPONSE_DEGRADATION);
  });

  it('emits PROVIDER_CANCELLATION_SPIKE when recent rate > 2× historical', async () => {
    const { handleProviderEvent } = await import('../../src/detection/consumers/provider-behavior');
    // recent 14d: 8 cancellations out of 10 total → 80%
    mockQuery.mockResolvedValueOnce({ rows: [{ cancel_count: '8', total_count: '10' }], rowCount: 1 });
    // historical: 5 cancellations out of 50 total → 10% (ratio = 8.0 > 2.0)
    mockQuery.mockResolvedValueOnce({ rows: [{ cancel_count: '5', total_count: '50' }], rowCount: 1 });
    // persist
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const event = buildEvent(EventType.BOOKING_CANCELLED, {
      booking_id: uuid(1), client_id: uuid(2), provider_id: uuid(3), status: 'cancelled',
    });
    await handleProviderEvent(event);

    const persistCall = mockQuery.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO risk_signals')
    );
    expect(persistCall).toBeDefined();
    expect(persistCall![1][3]).toBe(SignalType.PROVIDER_CANCELLATION_SPIKE);
    expect(persistCall![1][4]).toBeCloseTo(0.65, 2);
  });

  it('handles DB errors gracefully', async () => {
    const { handleProviderEvent } = await import('../../src/detection/consumers/provider-behavior');
    mockQuery.mockRejectedValue(new Error('connection lost'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const event = buildEvent(EventType.PROVIDER_REGISTERED, {
      provider_id: uuid(1), user_id: uuid(2),
    });
    await expect(handleProviderEvent(event)).resolves.toBeUndefined();
    consoleSpy.mockRestore();
  });
});

// ─── TemporalPattern Tests ──────────────────────────────────────

describe('TemporalPatternConsumer', () => {
  beforeEach(() => resetAllMocks());

  it('emits TEMPORAL_BURST_ACTIVITY when z-score > 3 (20 events in 1h, baseline 2/h)', async () => {
    const { handleTemporalEvent } = await import('../../src/detection/consumers/temporal-pattern');
    // recent 1h event count → 20
    mockQuery.mockResolvedValueOnce({ rows: [{ event_count: '20' }], rowCount: 1 });
    // baseline 7d total (excluding last hour) → 335 events (335 / 167h ≈ 2.0/h)
    mockQuery.mockResolvedValueOnce({ rows: [{ event_count: '335' }], rowCount: 1 });
    // persist burst
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    // dormant check → recent activity
    mockQuery.mockResolvedValueOnce({ rows: [{ last_event: new Date().toISOString() }], rowCount: 1 });

    const event = buildEvent(EventType.MESSAGE_CREATED, {
      sender_id: uuid(2), receiver_id: uuid(3), content: 'test', message_id: uuid(4),
    });
    await handleTemporalEvent(event);

    const persistCall = mockQuery.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO risk_signals')
    );
    expect(persistCall).toBeDefined();
    expect(persistCall![1][3]).toBe(SignalType.TEMPORAL_BURST_ACTIVITY);
  });

  it('does NOT emit BURST_ACTIVITY for normal event volume', async () => {
    const { handleTemporalEvent } = await import('../../src/detection/consumers/temporal-pattern');
    // recent 1h → 3
    mockQuery.mockResolvedValueOnce({ rows: [{ event_count: '3' }], rowCount: 1 });
    // baseline → 335 (≈ 2/h avg), z-score = (3-2)/2 = 0.5 (< 3)
    mockQuery.mockResolvedValueOnce({ rows: [{ event_count: '335' }], rowCount: 1 });
    // dormant → recent
    mockQuery.mockResolvedValueOnce({ rows: [{ last_event: new Date().toISOString() }], rowCount: 1 });

    const event = buildEvent(EventType.BOOKING_CREATED, {
      client_id: uuid(2), provider_id: uuid(3), booking_id: uuid(4), status: 'created',
    });
    await handleTemporalEvent(event);

    const persistCalls = mockQuery.mock.calls.filter(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO risk_signals')
    );
    expect(persistCalls.length).toBe(0);
  });

  it('emits TEMPORAL_DORMANT_ACTIVATION when last event > 30 days ago', async () => {
    const { handleTemporalEvent } = await import('../../src/detection/consumers/temporal-pattern');
    // burst check → 0 recent
    mockQuery.mockResolvedValueOnce({ rows: [{ event_count: '0' }], rowCount: 1 });
    // baseline → 0
    mockQuery.mockResolvedValueOnce({ rows: [{ event_count: '0' }], rowCount: 1 });
    // dormant check → last event 45 days ago
    const pastDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
    mockQuery.mockResolvedValueOnce({ rows: [{ last_event: pastDate }], rowCount: 1 });
    // persist dormant
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const event = buildEvent(EventType.WALLET_DEPOSIT, {
      wallet_tx_id: uuid(1), user_id: uuid(2),
      tx_type: 'deposit', amount: 50, currency: 'USD', status: 'completed',
    });
    await handleTemporalEvent(event);

    const persistCall = mockQuery.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO risk_signals')
    );
    expect(persistCall).toBeDefined();
    expect(persistCall![1][3]).toBe(SignalType.TEMPORAL_DORMANT_ACTIVATION);
    expect(persistCall![1][4]).toBeCloseTo(0.55, 2);
  });

  it('does NOT emit DORMANT_ACTIVATION for 10-day gap', async () => {
    const { handleTemporalEvent } = await import('../../src/detection/consumers/temporal-pattern');
    // burst → 0 baseline
    mockQuery.mockResolvedValueOnce({ rows: [{ event_count: '0' }], rowCount: 1 });
    mockQuery.mockResolvedValueOnce({ rows: [{ event_count: '0' }], rowCount: 1 });
    // last event 10 days ago
    const pastDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    mockQuery.mockResolvedValueOnce({ rows: [{ last_event: pastDate }], rowCount: 1 });

    const event = buildEvent(EventType.WALLET_DEPOSIT, {
      wallet_tx_id: uuid(1), user_id: uuid(2),
      tx_type: 'deposit', amount: 50, currency: 'USD', status: 'completed',
    });
    await handleTemporalEvent(event);

    const persistCalls = mockQuery.mock.calls.filter(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO risk_signals')
    );
    expect(persistCalls.length).toBe(0);
  });

  it('skips when userId cannot be extracted', async () => {
    const { handleTemporalEvent } = await import('../../src/detection/consumers/temporal-pattern');

    const event = buildEvent(EventType.BOOKING_CREATED, {
      booking_id: uuid(1), status: 'created',
      // no sender_id, user_id, or client_id
    });
    await handleTemporalEvent(event);

    expect(mockQuery).not.toHaveBeenCalled();
  });
});

// ─── ContactChange Tests ────────────────────────────────────────

describe('ContactChangeConsumer', () => {
  beforeEach(() => resetAllMocks());

  it('emits CONTACT_PHONE_CHANGED for HIGH-tier user changing phone', async () => {
    const { handleContactChangeEvent } = await import('../../src/detection/consumers/contact-change');
    // tier → HIGH
    mockQuery.mockResolvedValueOnce({ rows: [{ tier: 'HIGH' }], rowCount: 1 });
    // enforcement count → 0
    mockQuery.mockResolvedValueOnce({ rows: [{ action_count: '0' }], rowCount: 1 });
    // cross-reference → no match
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    // persist
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const event = buildEvent(EventType.CONTACT_FIELD_CHANGED, {
      user_id: uuid(2), field: 'phone', new_value: '+15551234567',
    });
    await handleContactChangeEvent(event);

    const persistCall = mockQuery.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO risk_signals')
    );
    expect(persistCall).toBeDefined();
    expect(persistCall![1][3]).toBe(SignalType.CONTACT_PHONE_CHANGED);
    expect(persistCall![1][4]).toBeCloseTo(0.75, 2);
  });

  it('does NOT emit signal for MONITOR-tier user with no enforcement history', async () => {
    const { handleContactChangeEvent } = await import('../../src/detection/consumers/contact-change');
    // tier → MONITOR
    mockQuery.mockResolvedValueOnce({ rows: [{ tier: 'MONITOR' }], rowCount: 1 });
    // enforcement count → 0
    mockQuery.mockResolvedValueOnce({ rows: [{ action_count: '0' }], rowCount: 1 });

    const event = buildEvent(EventType.CONTACT_FIELD_CHANGED, {
      user_id: uuid(2), field: 'phone', new_value: '+15551234567',
    });
    await handleContactChangeEvent(event);

    const persistCalls = mockQuery.mock.calls.filter(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO risk_signals')
    );
    expect(persistCalls.length).toBe(0);
  });

  it('emits CONTACT_EMAIL_CHANGED for user with enforcement history', async () => {
    const { handleContactChangeEvent } = await import('../../src/detection/consumers/contact-change');
    // tier → ELEVATED (not HIGH/CRITICAL)
    mockQuery.mockResolvedValueOnce({ rows: [{ tier: 'ELEVATED' }], rowCount: 1 });
    // enforcement count → 2 (triggers)
    mockQuery.mockResolvedValueOnce({ rows: [{ action_count: '2' }], rowCount: 1 });
    // cross-reference → no match
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    // persist
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const event = buildEvent(EventType.CONTACT_FIELD_CHANGED, {
      user_id: uuid(2), field: 'email', new_value: 'new@example.com',
    });
    await handleContactChangeEvent(event);

    const persistCall = mockQuery.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO risk_signals')
    );
    expect(persistCall).toBeDefined();
    expect(persistCall![1][3]).toBe(SignalType.CONTACT_EMAIL_CHANGED);
    expect(persistCall![1][4]).toBeCloseTo(0.75, 2);
  });

  it('sets confidence to 0.85 when new value matches flagged user', async () => {
    const { handleContactChangeEvent } = await import('../../src/detection/consumers/contact-change');
    // tier → HIGH
    mockQuery.mockResolvedValueOnce({ rows: [{ tier: 'HIGH' }], rowCount: 1 });
    // enforcement → 0
    mockQuery.mockResolvedValueOnce({ rows: [{ action_count: '0' }], rowCount: 1 });
    // cross-reference → matches flagged user
    mockQuery.mockResolvedValueOnce({ rows: [{ id: uuid(10) }], rowCount: 1 });
    // persist
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const event = buildEvent(EventType.CONTACT_FIELD_CHANGED, {
      user_id: uuid(2), field: 'phone', new_value: '+15559999999',
    });
    await handleContactChangeEvent(event);

    const persistCall = mockQuery.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO risk_signals')
    );
    expect(persistCall).toBeDefined();
    expect(persistCall![1][4]).toBeCloseTo(0.85, 2);
  });

  it('handles DB errors gracefully', async () => {
    const { handleContactChangeEvent } = await import('../../src/detection/consumers/contact-change');
    mockQuery.mockRejectedValue(new Error('DB unavailable'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const event = buildEvent(EventType.CONTACT_FIELD_CHANGED, {
      user_id: uuid(2), field: 'phone', new_value: '+15551234567',
    });
    await expect(handleContactChangeEvent(event)).resolves.toBeUndefined();
    consoleSpy.mockRestore();
  });
});

// ─── Additional Threshold / Boundary Tests ──────────────────────

describe('BookingAnomaly — boundary cases', () => {
  beforeEach(() => resetAllMocks());

  it('emits BOOKING_CANCEL_PATTERN on BOOKING_NO_SHOW event', async () => {
    const { handleBookingEvent } = await import('../../src/detection/consumers/booking-anomaly');
    // persist
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const event = buildEvent(EventType.BOOKING_NO_SHOW, {
      booking_id: uuid(1), client_id: uuid(2), provider_id: uuid(3), status: 'no_show',
    });
    await handleBookingEvent(event);

    const persistCall = mockQuery.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO risk_signals')
    );
    expect(persistCall).toBeDefined();
    expect(persistCall![1][3]).toBe(SignalType.BOOKING_CANCEL_PATTERN);
    expect(persistCall![1][4]).toBeCloseTo(0.7, 2);
  });

  it('does NOT emit TIME_CLUSTERING for daytime bookings (12:00 UTC)', async () => {
    const { detectTimeClustering } = await import('../../src/detection/consumers/booking-anomaly');
    const event = buildEvent(EventType.BOOKING_CREATED, {
      booking_id: uuid(1), client_id: uuid(2), provider_id: uuid(3),
      status: 'created', scheduled_at: '2026-06-15T12:00:00Z',
    });
    await detectTimeClustering(event, event.payload as any);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('skips VALUE_ANOMALY when no amount is provided', async () => {
    const { detectValueAnomaly } = await import('../../src/detection/consumers/booking-anomaly');
    const event = buildEvent(EventType.BOOKING_CREATED, {
      booking_id: uuid(1), client_id: uuid(2), provider_id: uuid(3),
      status: 'created', service_category: 'cleaning',
      // no amount field
    });
    await detectValueAnomaly(event, event.payload as any);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});

describe('PaymentAnomaly — boundary cases', () => {
  beforeEach(() => resetAllMocks());

  it('caps RAPID_TOPUP confidence at 0.85', async () => {
    const { detectRapidTopup } = await import('../../src/detection/consumers/payment-anomaly');
    // 10 deposits → confidence = 0.5 + 7*0.1 = 1.2 → clamped to 0.85
    mockQuery.mockResolvedValueOnce({ rows: [{ deposit_count: '10' }], rowCount: 1 });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const event = buildEvent(EventType.WALLET_DEPOSIT, {
      wallet_tx_id: uuid(1), user_id: uuid(2),
      tx_type: 'deposit', amount: 50, currency: 'USD', status: 'completed',
    });
    await detectRapidTopup(event);

    const persistCall = mockQuery.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO risk_signals')
    );
    expect(persistCall).toBeDefined();
    expect(persistCall![1][4]).toBeCloseTo(0.85, 2);
  });

  it('skips CIRCULAR when no counterparty_id', async () => {
    const { detectCircularPayment } = await import('../../src/detection/consumers/payment-anomaly');
    const event = buildEvent(EventType.WALLET_TRANSFER, {
      wallet_tx_id: uuid(1), user_id: uuid(2),
      tx_type: 'transfer', amount: 100, currency: 'USD', status: 'completed',
      // no counterparty_id
    });
    await detectCircularPayment(event);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('skips WITHDRAWAL_SPIKE when amount is 0', async () => {
    const { detectWithdrawalSpike } = await import('../../src/detection/consumers/payment-anomaly');
    const event = buildEvent(EventType.WALLET_WITHDRAWAL, {
      wallet_tx_id: uuid(1), user_id: uuid(2),
      tx_type: 'withdrawal', amount: 0, currency: 'USD', status: 'completed',
    });
    await detectWithdrawalSpike(event);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});

describe('TemporalPattern — boundary cases', () => {
  beforeEach(() => resetAllMocks());

  it('extracts userId from client_id field', async () => {
    const { extractUserId } = await import('../../src/detection/consumers/temporal-pattern');
    const event = buildEvent(EventType.BOOKING_CREATED, {
      client_id: uuid(5), provider_id: uuid(3), booking_id: uuid(4), status: 'created',
    });
    expect(extractUserId(event)).toBe(uuid(5));
  });

  it('prefers sender_id over user_id and client_id', async () => {
    const { extractUserId } = await import('../../src/detection/consumers/temporal-pattern');
    const event = buildEvent(EventType.MESSAGE_CREATED, {
      sender_id: uuid(1), user_id: uuid(2), client_id: uuid(3),
    });
    expect(extractUserId(event)).toBe(uuid(1));
  });
});

// QwickServices CIS — Phase 3A: Leakage Consumer Unit Tests

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockQuery, mockEmitLeakageStageAdvanced, resetAllMocks, uuid } from '../helpers/setup';
import { EventType, DomainEvent } from '../../src/events/types';

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

describe('LeakageConsumer', () => {
  beforeEach(() => resetAllMocks());

  it('creates Stage 1 when off-platform signals exist for new pair', async () => {
    const { handleMessageLeakage } = await import('../../src/detection/consumers/leakage-tracking');

    // getRecentOffPlatformSignals → returns signals
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: uuid(10), signal_type: 'CONTACT_PHONE' }],
      rowCount: 1,
    });
    // getExistingLeakageEvent → no existing event
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    // createLeakageEvent INSERT
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const event = buildEvent(EventType.MESSAGE_CREATED, {
      message_id: uuid(1),
      sender_id: uuid(2),
      receiver_id: uuid(3),
      content: 'test',
    });
    await handleMessageLeakage(event);

    // Should INSERT into leakage_events with stage 'signal'
    const insertCall = mockQuery.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO leakage_events')
    );
    expect(insertCall).toBeDefined();
    expect(insertCall![1][1]).toBe(uuid(2)); // user_id = sender_id
  });

  it('advances Stage 1→2 when different signal type arrives', async () => {
    const { handleMessageLeakage } = await import('../../src/detection/consumers/leakage-tracking');

    // getRecentOffPlatformSignals → returns new type
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: uuid(10), signal_type: 'CONTACT_EMAIL' }],
      rowCount: 1,
    });
    // getExistingLeakageEvent → existing at stage 'signal'
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: uuid(20),
        stage: 'signal',
        signal_ids: [uuid(5)],
        evidence: { signal_types: ['CONTACT_PHONE'] },
      }],
      rowCount: 1,
    });
    // advanceLeakageStage UPDATE
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const event = buildEvent(EventType.MESSAGE_CREATED, {
      message_id: uuid(1),
      sender_id: uuid(2),
      receiver_id: uuid(3),
      content: 'test',
    });
    await handleMessageLeakage(event);

    // Should UPDATE to 'attempt'
    const updateCall = mockQuery.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('UPDATE leakage_events')
    );
    expect(updateCall).toBeDefined();
    expect(updateCall![1][0]).toBe('attempt');
    expect(mockEmitLeakageStageAdvanced).toHaveBeenCalledOnce();
  });

  it('advances Stage 2→3 on booking cancellation between pair', async () => {
    const { handleBookingCancellationLeakage } = await import('../../src/detection/consumers/leakage-tracking');

    // getExistingLeakageEvent → existing at stage 'attempt'
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: uuid(20),
        stage: 'attempt',
        signal_ids: [uuid(5)],
        evidence: { signal_types: ['CONTACT_PHONE', 'CONTACT_EMAIL'] },
      }],
      rowCount: 1,
    });
    // estimateRevenueLoss — booking amount
    mockQuery.mockResolvedValueOnce({ rows: [{ amount: '150.00' }], rowCount: 1 });
    // advanceLeakageStage UPDATE
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const event = buildEvent(EventType.BOOKING_CANCELLED, {
      booking_id: uuid(1),
      client_id: uuid(2),
      provider_id: uuid(3),
      status: 'cancelled',
    });
    await handleBookingCancellationLeakage(event);

    const updateCall = mockQuery.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('UPDATE leakage_events')
    );
    expect(updateCall).toBeDefined();
    expect(updateCall![1][0]).toBe('confirmation');
    expect(mockEmitLeakageStageAdvanced).toHaveBeenCalledOnce();
  });

  it('does NOT create Stage 1 if no off-platform signals found', async () => {
    const { handleMessageLeakage } = await import('../../src/detection/consumers/leakage-tracking');

    // getRecentOffPlatformSignals → empty
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const event = buildEvent(EventType.MESSAGE_CREATED, {
      message_id: uuid(1),
      sender_id: uuid(2),
      receiver_id: uuid(3),
      content: 'just a normal message',
    });
    await handleMessageLeakage(event);

    // Should NOT insert
    const insertCall = mockQuery.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO leakage_events')
    );
    expect(insertCall).toBeUndefined();
  });

  it('does NOT advance if same signal type (stays at Stage 1)', async () => {
    const { handleMessageLeakage } = await import('../../src/detection/consumers/leakage-tracking');

    // getRecentOffPlatformSignals → same type as existing
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: uuid(10), signal_type: 'CONTACT_PHONE' }],
      rowCount: 1,
    });
    // getExistingLeakageEvent → existing at stage 'signal' with CONTACT_PHONE
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: uuid(20),
        stage: 'signal',
        signal_ids: [uuid(5)],
        evidence: { signal_types: ['CONTACT_PHONE'] },
      }],
      rowCount: 1,
    });

    const event = buildEvent(EventType.MESSAGE_CREATED, {
      message_id: uuid(1),
      sender_id: uuid(2),
      receiver_id: uuid(3),
      content: 'test',
    });
    await handleMessageLeakage(event);

    // Should NOT update
    const updateCall = mockQuery.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('UPDATE leakage_events')
    );
    expect(updateCall).toBeUndefined();
    expect(mockEmitLeakageStageAdvanced).not.toHaveBeenCalled();
  });

  it('handles missing counterparty gracefully', async () => {
    const { handleBookingCancellationLeakage } = await import('../../src/detection/consumers/leakage-tracking');

    const event = buildEvent(EventType.BOOKING_CANCELLED, {
      booking_id: uuid(1),
      client_id: uuid(2),
      provider_id: '',
      status: 'cancelled',
    });
    // Should return early — provider_id is empty
    await handleBookingCancellationLeakage(event);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('estimates revenue from booking amount', async () => {
    const { estimateRevenueLoss } = await import('../../src/detection/consumers/leakage-tracking');

    mockQuery.mockResolvedValueOnce({ rows: [{ amount: '200.50' }], rowCount: 1 });

    const result = await estimateRevenueLoss(uuid(1), uuid(2));
    expect(result).toBe(200.50);
  });

  it('estimates revenue from category average when no booking', async () => {
    const { estimateRevenueLoss } = await import('../../src/detection/consumers/leakage-tracking');

    // No booking between pair
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    // Category average
    mockQuery.mockResolvedValueOnce({ rows: [{ avg_amount: '75.00' }], rowCount: 1 });

    const result = await estimateRevenueLoss(uuid(1), uuid(2));
    expect(result).toBe(75.00);
  });

  it('respects 7-day lookback window', async () => {
    const { getRecentOffPlatformSignals } = await import('../../src/detection/consumers/leakage-tracking');

    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    await getRecentOffPlatformSignals(uuid(1), uuid(2));

    // Verify the query includes 7-day interval
    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain('7 days');
  });

  it('skips if sender_id missing from event', async () => {
    const { handleMessageLeakage } = await import('../../src/detection/consumers/leakage-tracking');

    const event = buildEvent(EventType.MESSAGE_CREATED, {
      message_id: uuid(1),
      sender_id: '',
      receiver_id: uuid(3),
      content: 'test',
    });
    await handleMessageLeakage(event);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('emits LEAKAGE_STAGE_ADVANCED event on progression', async () => {
    const { handleMessageLeakage } = await import('../../src/detection/consumers/leakage-tracking');

    mockQuery.mockResolvedValueOnce({
      rows: [{ id: uuid(10), signal_type: 'CONTACT_SOCIAL' }],
      rowCount: 1,
    });
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: uuid(20),
        stage: 'signal',
        signal_ids: [uuid(5)],
        evidence: { signal_types: ['CONTACT_PHONE'] },
      }],
      rowCount: 1,
    });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const event = buildEvent(EventType.MESSAGE_CREATED, {
      message_id: uuid(1),
      sender_id: uuid(2),
      receiver_id: uuid(3),
      content: 'test',
    });
    await handleMessageLeakage(event);

    expect(mockEmitLeakageStageAdvanced).toHaveBeenCalledOnce();
    expect(mockEmitLeakageStageAdvanced.mock.calls[0][0]).toMatchObject({
      leakage_event_id: uuid(20),
      user_id: uuid(2),
      previous_stage: 'signal',
      new_stage: 'attempt',
    });
  });

  it('does not emit event when creating new Stage 1', async () => {
    const { handleMessageLeakage } = await import('../../src/detection/consumers/leakage-tracking');

    mockQuery.mockResolvedValueOnce({
      rows: [{ id: uuid(10), signal_type: 'CONTACT_PHONE' }],
      rowCount: 1,
    });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const event = buildEvent(EventType.MESSAGE_CREATED, {
      message_id: uuid(1),
      sender_id: uuid(2),
      receiver_id: uuid(3),
      content: 'test',
    });
    await handleMessageLeakage(event);

    expect(mockEmitLeakageStageAdvanced).not.toHaveBeenCalled();
  });
});

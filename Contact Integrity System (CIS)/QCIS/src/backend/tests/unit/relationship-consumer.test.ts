// QwickServices CIS — Phase 3A: Relationship Consumer Unit Tests

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockQuery, mockEmitRelationshipUpdated, resetAllMocks, uuid } from '../helpers/setup';
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

describe('RelationshipConsumer', () => {
  beforeEach(() => resetAllMocks());

  it('creates new relationship on MESSAGE_CREATED', async () => {
    const { handleRelationshipEvent } = await import('../../src/detection/consumers/relationship-tracking');

    mockQuery.mockResolvedValueOnce({
      rows: [{ id: uuid(50), interaction_count: '1' }],
      rowCount: 1,
    });

    const event = buildEvent(EventType.MESSAGE_CREATED, {
      message_id: uuid(1),
      sender_id: uuid(2),
      receiver_id: uuid(3),
      content: 'hello',
    });
    await handleRelationshipEvent(event);

    const insertCall = mockQuery.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO user_relationships')
    );
    expect(insertCall).toBeDefined();
    // relationship_type = 'messaged'
    expect(insertCall![1][2]).toBe('messaged');
  });

  it('increments interaction_count on repeat message', async () => {
    const { handleRelationshipEvent } = await import('../../src/detection/consumers/relationship-tracking');

    // ON CONFLICT DO UPDATE returns incremented count
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: uuid(50), interaction_count: '5' }],
      rowCount: 1,
    });

    const event = buildEvent(EventType.MESSAGE_CREATED, {
      message_id: uuid(1),
      sender_id: uuid(2),
      receiver_id: uuid(3),
      content: 'hello again',
    });
    await handleRelationshipEvent(event);

    expect(mockEmitRelationshipUpdated).toHaveBeenCalledOnce();
    expect(mockEmitRelationshipUpdated.mock.calls[0][0]).toMatchObject({
      interaction_count: 5,
    });
  });

  it('creates transacted relationship on TRANSACTION_COMPLETED', async () => {
    const { handleRelationshipEvent } = await import('../../src/detection/consumers/relationship-tracking');

    mockQuery.mockResolvedValueOnce({
      rows: [{ id: uuid(50), interaction_count: '1' }],
      rowCount: 1,
    });

    const event = buildEvent(EventType.TRANSACTION_COMPLETED, {
      transaction_id: uuid(1),
      user_id: uuid(2),
      counterparty_id: uuid(3),
      amount: 100,
      currency: 'USD',
      status: 'completed',
    });
    await handleRelationshipEvent(event);

    const insertCall = mockQuery.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO user_relationships')
    );
    expect(insertCall).toBeDefined();
    expect(insertCall![1][2]).toBe('transacted');
  });

  it('adds total_value for transaction relationships', async () => {
    const { handleRelationshipEvent } = await import('../../src/detection/consumers/relationship-tracking');

    mockQuery.mockResolvedValueOnce({
      rows: [{ id: uuid(50), interaction_count: '1' }],
      rowCount: 1,
    });

    const event = buildEvent(EventType.TRANSACTION_COMPLETED, {
      transaction_id: uuid(1),
      user_id: uuid(2),
      counterparty_id: uuid(3),
      amount: 250.50,
      currency: 'USD',
      status: 'completed',
    });
    await handleRelationshipEvent(event);

    const insertCall = mockQuery.mock.calls[0];
    // $4 = total_value = 250.50
    expect(insertCall[1][3]).toBe(250.50);
  });

  it('creates booked relationship on BOOKING_COMPLETED', async () => {
    const { handleRelationshipEvent } = await import('../../src/detection/consumers/relationship-tracking');

    mockQuery.mockResolvedValueOnce({
      rows: [{ id: uuid(50), interaction_count: '1' }],
      rowCount: 1,
    });

    const event = buildEvent(EventType.BOOKING_COMPLETED, {
      booking_id: uuid(1),
      client_id: uuid(2),
      provider_id: uuid(3),
      amount: 75,
      status: 'completed',
    });
    await handleRelationshipEvent(event);

    const insertCall = mockQuery.mock.calls[0];
    expect(insertCall[1][2]).toBe('booked');
  });

  it('creates rated relationship on RATING_SUBMITTED', async () => {
    const { handleRelationshipEvent } = await import('../../src/detection/consumers/relationship-tracking');

    mockQuery.mockResolvedValueOnce({
      rows: [{ id: uuid(50), interaction_count: '1' }],
      rowCount: 1,
    });

    const event = buildEvent(EventType.RATING_SUBMITTED, {
      rating_id: uuid(1),
      client_id: uuid(2),
      provider_id: uuid(3),
      score: 5,
    });
    await handleRelationshipEvent(event);

    const insertCall = mockQuery.mock.calls[0];
    expect(insertCall[1][2]).toBe('rated');
  });

  it('canonical ordering: user_a_id < user_b_id', async () => {
    const { canonicalOrder } = await import('../../src/detection/consumers/relationship-tracking');

    // uuid(5) > uuid(2) lexicographically
    const [a, b] = canonicalOrder(uuid(5), uuid(2));
    expect(a).toBe(uuid(2));
    expect(b).toBe(uuid(5));

    // Already ordered
    const [a2, b2] = canonicalOrder(uuid(1), uuid(9));
    expect(a2).toBe(uuid(1));
    expect(b2).toBe(uuid(9));
  });

  it('computes strength_score via logarithmic formula', async () => {
    const { computeStrengthScore } = await import('../../src/detection/consumers/relationship-tracking');

    // 1 interaction: ln(2)/ln(20) ≈ 0.231
    expect(computeStrengthScore(1)).toBeCloseTo(0.231, 2);

    // 19 interactions: ln(20)/ln(20) = 1.0
    expect(computeStrengthScore(19)).toBe(1.0);

    // 100 interactions: capped at 1.0
    expect(computeStrengthScore(100)).toBe(1.0);
  });

  it('skips when user IDs are missing', async () => {
    const { handleRelationshipEvent } = await import('../../src/detection/consumers/relationship-tracking');

    const event = buildEvent(EventType.MESSAGE_CREATED, {
      message_id: uuid(1),
      sender_id: '',
      receiver_id: uuid(3),
      content: 'test',
    });
    await handleRelationshipEvent(event);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('emits RELATIONSHIP_UPDATED event', async () => {
    const { handleRelationshipEvent } = await import('../../src/detection/consumers/relationship-tracking');

    mockQuery.mockResolvedValueOnce({
      rows: [{ id: uuid(50), interaction_count: '3' }],
      rowCount: 1,
    });

    const event = buildEvent(EventType.MESSAGE_CREATED, {
      message_id: uuid(1),
      sender_id: uuid(2),
      receiver_id: uuid(3),
      content: 'test',
    });
    await handleRelationshipEvent(event);

    expect(mockEmitRelationshipUpdated).toHaveBeenCalledOnce();
    expect(mockEmitRelationshipUpdated.mock.calls[0][0]).toMatchObject({
      relationship_id: uuid(50),
      relationship_type: 'messaged',
      interaction_count: 3,
    });
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DurableEventBus } from '../../src/events/durable-bus';
import { DomainEvent, EventType } from '../../src/events/types';

// Mock database
vi.mock('../../src/database/connection', () => ({
  query: vi.fn().mockResolvedValue({ rows: [] }),
}));

// Mock Redis as unavailable (tests run in memory-fallback mode)
vi.mock('../../src/events/redis', () => ({
  getRedisClient: vi.fn().mockRejectedValue(new Error('Redis not available')),
  isRedisAvailable: vi.fn().mockReturnValue(false),
}));

vi.mock('../../src/shared/utils', () => ({
  generateId: () => `test-${Math.random().toString(36).slice(2, 10)}`,
}));

function makeEvent(overrides?: Partial<DomainEvent>): DomainEvent {
  return {
    id: `evt-${Math.random().toString(36).slice(2, 10)}`,
    type: EventType.MESSAGE_CREATED,
    correlation_id: 'corr-1',
    timestamp: new Date().toISOString(),
    version: 1,
    payload: { message_id: 'msg-1', sender_id: 'u1', receiver_id: 'u2', content: 'hello' },
    ...overrides,
  };
}

describe('DurableEventBus', () => {
  let bus: DurableEventBus;

  beforeEach(() => {
    bus = new DurableEventBus();
    vi.clearAllMocks();
  });

  // ─── Emit & Dispatch ───────────────────────────────────────

  it('dispatches events to registered consumers', async () => {
    const received: DomainEvent[] = [];
    bus.registerConsumer({
      name: 'test-consumer',
      eventTypes: [EventType.MESSAGE_CREATED],
      handler: async (e) => { received.push(e); },
    });

    const event = makeEvent();
    await bus.emit(event);

    expect(received).toHaveLength(1);
    expect(received[0].id).toBe(event.id);
  });

  it('dispatches to wildcard (*) consumers', async () => {
    const received: DomainEvent[] = [];
    bus.registerConsumer({
      name: 'wildcard',
      eventTypes: '*',
      handler: async (e) => { received.push(e); },
    });

    await bus.emit(makeEvent({ type: EventType.MESSAGE_CREATED }));
    await bus.emit(makeEvent({ type: EventType.TRANSACTION_INITIATED }));

    expect(received).toHaveLength(2);
  });

  it('dispatches to multiple consumers for the same event type', async () => {
    let count = 0;
    bus.registerConsumer({
      name: 'consumer-a',
      eventTypes: [EventType.MESSAGE_CREATED],
      handler: async () => { count++; },
    });
    bus.registerConsumer({
      name: 'consumer-b',
      eventTypes: [EventType.MESSAGE_CREATED],
      handler: async () => { count++; },
    });

    await bus.emit(makeEvent());
    expect(count).toBe(2);
  });

  // ─── Idempotency ──────────────────────────────────────────

  it('rejects duplicate events (same ID emitted twice)', async () => {
    let count = 0;
    bus.registerConsumer({
      name: 'counter',
      eventTypes: [EventType.MESSAGE_CREATED],
      handler: async () => { count++; },
    });

    const event = makeEvent();
    await bus.emit(event);
    await bus.emit(event); // duplicate

    expect(count).toBe(1);
  });

  // ─── Dead Letter Queue ────────────────────────────────────

  it('sends failed events to DLQ', async () => {
    bus.registerConsumer({
      name: 'failing-consumer',
      eventTypes: [EventType.MESSAGE_CREATED],
      handler: async () => { throw new Error('Consumer exploded'); },
    });

    await bus.emit(makeEvent());

    const dlq = await bus.getDeadLetterQueue();
    expect(dlq).toHaveLength(1);
    expect(dlq[0].consumerName).toBe('failing-consumer');
    expect(dlq[0].error).toBe('Consumer exploded');
    expect(dlq[0].retryCount).toBe(0);
  });

  it('retries DLQ entries and succeeds on second attempt', async () => {
    let callCount = 0;
    bus.registerConsumer({
      name: 'flaky-consumer',
      eventTypes: [EventType.MESSAGE_CREATED],
      handler: async () => {
        callCount++;
        if (callCount === 1) throw new Error('Transient failure');
      },
    });

    await bus.emit(makeEvent());
    expect(callCount).toBe(1);

    const result = await bus.retryDeadLetters();
    expect(result.retried).toBe(1);
    expect(result.failed).toBe(0);
    expect(callCount).toBe(2);
  });

  it('stops retrying after max retries exceeded', async () => {
    bus.registerConsumer({
      name: 'always-fails',
      eventTypes: [EventType.MESSAGE_CREATED],
      handler: async () => { throw new Error('Permanent failure'); },
    });

    await bus.emit(makeEvent());

    // Retry 3 times (max retries)
    await bus.retryDeadLetters(); // retry 1
    await bus.retryDeadLetters(); // retry 2
    await bus.retryDeadLetters(); // retry 3
    const result = await bus.retryDeadLetters(); // retry 4 — should be max exceeded

    expect(result.failed).toBeGreaterThanOrEqual(1);
  });

  it('clears dead letter queue', async () => {
    bus.registerConsumer({
      name: 'failing',
      eventTypes: [EventType.MESSAGE_CREATED],
      handler: async () => { throw new Error('fail'); },
    });

    await bus.emit(makeEvent());
    expect((await bus.getDeadLetterQueue()).length).toBeGreaterThan(0);

    await bus.clearDeadLetterQueue();
    expect((await bus.getDeadLetterQueue()).length).toBe(0);
  });

  // ─── Consumer Registration ────────────────────────────────

  it('ignores events for unregistered types', async () => {
    let received = false;
    bus.registerConsumer({
      name: 'tx-only',
      eventTypes: [EventType.TRANSACTION_COMPLETED],
      handler: async () => { received = true; },
    });

    await bus.emit(makeEvent({ type: EventType.MESSAGE_CREATED }));
    expect(received).toBe(false);
  });

  // ─── Introspection ────────────────────────────────────────

  it('reports consumer count correctly', () => {
    bus.registerConsumer({
      name: 'a',
      eventTypes: [EventType.MESSAGE_CREATED, EventType.MESSAGE_EDITED],
      handler: async () => {},
    });
    bus.registerConsumer({
      name: 'b',
      eventTypes: [EventType.MESSAGE_CREATED],
      handler: async () => {},
    });

    expect(bus.getConsumerCount(EventType.MESSAGE_CREATED)).toBe(2);
    expect(bus.getConsumerCount(EventType.MESSAGE_EDITED)).toBe(1);
    expect(bus.getConsumerCount()).toBe(3);
  });

  it('lists registered consumers', () => {
    bus.registerConsumer({
      name: 'detection',
      eventTypes: [EventType.MESSAGE_CREATED],
      handler: async () => {},
    });

    const list = bus.getRegisteredConsumers();
    expect(list).toContainEqual({
      eventType: EventType.MESSAGE_CREATED,
      consumers: ['detection'],
    });
  });
});

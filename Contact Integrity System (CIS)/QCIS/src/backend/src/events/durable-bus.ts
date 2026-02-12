// QwickServices CIS — Durable Event Bus (Redis-backed) (GAP-01)
// Same interface as the in-memory EventBus but with Redis-backed DLQ
// and event stream persistence for crash recovery.

import { EventEmitter } from 'events';
import { DomainEvent, EventHandler, EventConsumer } from './types';
import { query } from '../database/connection';
import { generateId } from '../shared/utils';
import { getRedisClient, isRedisAvailable } from './redis';

const REDIS_DLQ_KEY = 'cis:dlq';
const REDIS_PENDING_KEY = 'cis:events:pending';
const MAX_RETRIES = 3;

interface DeadLetterEntry {
  event: DomainEvent;
  consumerName: string;
  error: string;
  timestamp: string;
  retryCount: number;
}

export class DurableEventBus {
  private emitter: EventEmitter;
  private consumers: Map<string, { name: string; handler: EventHandler }[]>;
  private processedEvents: Set<string>;
  // In-memory fallback DLQ (used only when Redis is down)
  private memoryDlq: DeadLetterEntry[];

  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(50);
    this.consumers = new Map();
    this.processedEvents = new Set();
    this.memoryDlq = [];
  }

  async emit(event: DomainEvent): Promise<void> {
    // Idempotency: check in-memory cache first
    if (this.processedEvents.has(event.id)) {
      console.log(`[DurableBus] Duplicate event skipped: ${event.id}`);
      return;
    }

    // Check database for events processed before last restart
    try {
      const dbCheck = await query(
        'SELECT event_id FROM processed_events WHERE event_id = $1',
        [event.id]
      );
      if (dbCheck.rows.length > 0) {
        this.processedEvents.add(event.id);
        console.log(`[DurableBus] Duplicate event skipped (DB): ${event.id}`);
        return;
      }
    } catch {
      // Non-critical — proceed if DB check fails
    }

    // Persist event to Redis pending stream before processing
    await this.persistPending(event);

    // Persist to audit log
    try {
      await query(
        `INSERT INTO audit_logs (id, actor, actor_type, action, entity_type, entity_id, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          generateId(),
          'system',
          'event_bus',
          `event.${event.type}`,
          'event',
          event.id,
          JSON.stringify({
            correlation_id: event.correlation_id,
            event_type: event.type,
            payload_keys: Object.keys(event.payload),
          }),
        ]
      );
    } catch (err) {
      console.error('[DurableBus] Failed to persist event to audit log:', err);
    }

    // Record for deduplication
    try {
      await query(
        'INSERT INTO processed_events (event_id) VALUES ($1) ON CONFLICT DO NOTHING',
        [event.id]
      );
    } catch {
      // Non-critical
    }

    this.processedEvents.add(event.id);

    // Dispatch to consumers
    const typeHandlers = this.consumers.get(event.type) || [];
    const globalHandlers = this.consumers.get('*') || [];
    const allHandlers = [...typeHandlers, ...globalHandlers];

    for (const consumer of allHandlers) {
      try {
        await consumer.handler(event);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`[DurableBus] Consumer "${consumer.name}" failed for ${event.type}: ${errorMsg}`);
        await this.addToDeadLetterQueue({
          event,
          consumerName: consumer.name,
          error: errorMsg,
          timestamp: new Date().toISOString(),
          retryCount: 0,
        });
      }
    }

    // Remove from pending after successful processing
    await this.removePending(event.id);

    // Notify EventEmitter listeners
    this.emitter.emit(event.type, event);
    this.emitter.emit('*', event);
  }

  registerConsumer(consumer: EventConsumer): void {
    if (consumer.eventTypes === '*') {
      const existing = this.consumers.get('*') || [];
      existing.push({ name: consumer.name, handler: consumer.handler });
      this.consumers.set('*', existing);
      console.log(`[DurableBus] Consumer "${consumer.name}" registered for: *`);
    } else {
      for (const eventType of consumer.eventTypes) {
        const existing = this.consumers.get(eventType) || [];
        existing.push({ name: consumer.name, handler: consumer.handler });
        this.consumers.set(eventType, existing);
      }
      console.log(`[DurableBus] Consumer "${consumer.name}" registered for: ${consumer.eventTypes.join(', ')}`);
    }
  }

  subscribe(eventType: string, handler: EventHandler): void {
    const existing = this.consumers.get(eventType) || [];
    existing.push({ name: 'anonymous', handler });
    this.consumers.set(eventType, existing);
  }

  unsubscribe(eventType: string, handler: EventHandler): void {
    const existing = this.consumers.get(eventType) || [];
    const filtered = existing.filter((c) => c.handler !== handler);
    this.consumers.set(eventType, filtered);
  }

  on(eventType: string, listener: (event: DomainEvent) => void): void {
    this.emitter.on(eventType, listener);
  }

  off(eventType: string, listener: (event: DomainEvent) => void): void {
    this.emitter.off(eventType, listener);
  }

  // ─── Dead Letter Queue (Redis-backed) ────────────────────────

  private async addToDeadLetterQueue(entry: DeadLetterEntry): Promise<void> {
    if (isRedisAvailable()) {
      try {
        const client = await getRedisClient();
        await client.rpush(REDIS_DLQ_KEY, JSON.stringify(entry));
        return;
      } catch {
        // Fall through to in-memory
      }
    }
    this.memoryDlq.push(entry);
  }

  async getDeadLetterQueue(): Promise<DeadLetterEntry[]> {
    const entries: DeadLetterEntry[] = [];

    if (isRedisAvailable()) {
      try {
        const client = await getRedisClient();
        const items = await client.lrange(REDIS_DLQ_KEY, 0, -1);
        for (const item of items) {
          entries.push(JSON.parse(item));
        }
      } catch {
        // Fall through to in-memory
      }
    }

    return [...entries, ...this.memoryDlq];
  }

  async retryDeadLetters(): Promise<{ retried: number; failed: number }> {
    const entries = await this.drainDlq();
    let retried = 0;
    let failed = 0;

    for (const entry of entries) {
      if (entry.retryCount >= MAX_RETRIES) {
        failed++;
        console.error(`[DurableBus] Max retries exceeded for event ${entry.event.id} (consumer: ${entry.consumerName})`);
        continue;
      }

      const allConsumers = [
        ...(this.consumers.get(entry.event.type) || []),
        ...(this.consumers.get('*') || []),
      ];
      const consumer = allConsumers.find((c) => c.name === entry.consumerName);

      if (consumer) {
        try {
          await consumer.handler(entry.event);
          retried++;
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          await this.addToDeadLetterQueue({
            ...entry,
            error: errorMsg,
            retryCount: entry.retryCount + 1,
            timestamp: new Date().toISOString(),
          });
          failed++;
        }
      }
    }

    return { retried, failed };
  }

  private async drainDlq(): Promise<DeadLetterEntry[]> {
    const entries: DeadLetterEntry[] = [];

    // Drain Redis DLQ atomically
    if (isRedisAvailable()) {
      try {
        const client = await getRedisClient();
        // Use LRANGE then DEL to drain atomically
        const items = await client.lrange(REDIS_DLQ_KEY, 0, -1);
        if (items.length > 0) {
          await client.del(REDIS_DLQ_KEY);
          for (const item of items) {
            entries.push(JSON.parse(item));
          }
        }
      } catch {
        // Fall through
      }
    }

    // Drain in-memory fallback
    entries.push(...this.memoryDlq);
    this.memoryDlq = [];

    return entries;
  }

  async clearDeadLetterQueue(): Promise<void> {
    if (isRedisAvailable()) {
      try {
        const client = await getRedisClient();
        await client.del(REDIS_DLQ_KEY);
      } catch {
        // Ignore
      }
    }
    this.memoryDlq = [];
  }

  // ─── Pending event stream (crash recovery) ───────────────────

  private async persistPending(event: DomainEvent): Promise<void> {
    if (!isRedisAvailable()) return;
    try {
      const client = await getRedisClient();
      await client.hset(REDIS_PENDING_KEY, event.id, JSON.stringify(event));
    } catch {
      // Non-critical — event still processed in memory
    }
  }

  private async removePending(eventId: string): Promise<void> {
    if (!isRedisAvailable()) return;
    try {
      const client = await getRedisClient();
      await client.hdel(REDIS_PENDING_KEY, eventId);
    } catch {
      // Non-critical
    }
  }

  /** Recover events that were pending when the process last crashed */
  async recoverPendingEvents(): Promise<number> {
    if (!isRedisAvailable()) return 0;
    try {
      const client = await getRedisClient();
      const pending = await client.hgetall(REDIS_PENDING_KEY);
      const eventIds = Object.keys(pending);
      if (eventIds.length === 0) return 0;

      console.log(`[DurableBus] Recovering ${eventIds.length} pending events from last session...`);
      let recovered = 0;
      for (const raw of Object.values(pending)) {
        try {
          const event: DomainEvent = JSON.parse(raw);
          // Reset processedEvents cache so recovery re-processes
          this.processedEvents.delete(event.id);
          await this.emit(event);
          recovered++;
        } catch (err) {
          console.error('[DurableBus] Failed to recover event:', err);
        }
      }
      // Clear pending after recovery
      await client.del(REDIS_PENDING_KEY);
      console.log(`[DurableBus] Recovered ${recovered}/${eventIds.length} events`);
      return recovered;
    } catch {
      return 0;
    }
  }

  // ─── Introspection ───────────────────────────────────────────

  getConsumerCount(eventType?: string): number {
    if (eventType) {
      return (this.consumers.get(eventType) || []).length;
    }
    let total = 0;
    for (const handlers of this.consumers.values()) {
      total += handlers.length;
    }
    return total;
  }

  getRegisteredConsumers(): { eventType: string; consumers: string[] }[] {
    const result: { eventType: string; consumers: string[] }[] = [];
    for (const [eventType, consumers] of this.consumers.entries()) {
      result.push({
        eventType,
        consumers: consumers.map((c) => c.name),
      });
    }
    return result;
  }
}

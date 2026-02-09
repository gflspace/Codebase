import { EventEmitter } from 'events';
import { DomainEvent, EventHandler, EventConsumer, EventType } from './types';
import { query } from '../database/connection';
import { generateId } from '../shared/utils';

interface DeadLetterEntry {
  event: DomainEvent;
  consumerName: string;
  error: string;
  timestamp: string;
  retryCount: number;
}

class EventBus {
  private emitter: EventEmitter;
  private consumers: Map<string, { name: string; handler: EventHandler }[]>;
  private deadLetterQueue: DeadLetterEntry[];
  private processedEvents: Set<string>;
  private maxRetries = 3;

  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(50);
    this.consumers = new Map();
    this.deadLetterQueue = [];
    this.processedEvents = new Set();
  }

  async emit(event: DomainEvent): Promise<void> {
    // Idempotency: skip already-processed events
    if (this.processedEvents.has(event.id)) {
      console.log(`[EventBus] Duplicate event skipped: ${event.id}`);
      return;
    }

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
      console.error('[EventBus] Failed to persist event to audit log:', err);
    }

    // Record for deduplication
    try {
      await query(
        'INSERT INTO processed_events (event_id) VALUES ($1) ON CONFLICT DO NOTHING',
        [event.id]
      );
    } catch {
      // Non-critical — in-memory set still works
    }

    this.processedEvents.add(event.id);

    // Dispatch to type-specific + global consumers
    const typeHandlers = this.consumers.get(event.type) || [];
    const globalHandlers = this.consumers.get('*') || [];
    const allHandlers = [...typeHandlers, ...globalHandlers];

    for (const consumer of allHandlers) {
      try {
        await consumer.handler(event);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`[EventBus] Consumer "${consumer.name}" failed for ${event.type}: ${errorMsg}`);
        this.deadLetterQueue.push({
          event,
          consumerName: consumer.name,
          error: errorMsg,
          timestamp: new Date().toISOString(),
          retryCount: 0,
        });
      }
    }

    // Notify EventEmitter listeners (for real-time/WebSocket bridging)
    this.emitter.emit(event.type, event);
    this.emitter.emit('*', event);
  }

  /** Register a named consumer for specific event types or all events (*) */
  registerConsumer(consumer: EventConsumer): void {
    if (consumer.eventTypes === '*') {
      const existing = this.consumers.get('*') || [];
      existing.push({ name: consumer.name, handler: consumer.handler });
      this.consumers.set('*', existing);
      console.log(`[EventBus] Consumer "${consumer.name}" registered for: *`);
    } else {
      for (const eventType of consumer.eventTypes) {
        const existing = this.consumers.get(eventType) || [];
        existing.push({ name: consumer.name, handler: consumer.handler });
        this.consumers.set(eventType, existing);
      }
      console.log(`[EventBus] Consumer "${consumer.name}" registered for: ${consumer.eventTypes.join(', ')}`);
    }
  }

  /** Simple subscribe for backward compatibility */
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

  /** Listen for events via EventEmitter (for WebSocket/SSE bridging) */
  on(eventType: string, listener: (event: DomainEvent) => void): void {
    this.emitter.on(eventType, listener);
  }

  off(eventType: string, listener: (event: DomainEvent) => void): void {
    this.emitter.off(eventType, listener);
  }

  getDeadLetterQueue(): DeadLetterEntry[] {
    return [...this.deadLetterQueue];
  }

  /** Retry failed events from the dead letter queue */
  async retryDeadLetters(): Promise<{ retried: number; failed: number }> {
    const entries = [...this.deadLetterQueue];
    this.deadLetterQueue = [];
    let retried = 0;
    let failed = 0;

    for (const entry of entries) {
      if (entry.retryCount >= this.maxRetries) {
        failed++;
        console.error(`[EventBus] Max retries exceeded for event ${entry.event.id} (consumer: ${entry.consumerName})`);
        continue;
      }

      // Re-dispatch to the specific consumer
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
          this.deadLetterQueue.push({
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

  clearDeadLetterQueue(): void {
    this.deadLetterQueue = [];
  }

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

let busInstance: EventBus | null = null;

export function getEventBus(): EventBus {
  if (!busInstance) {
    busInstance = new EventBus();
  }
  return busInstance;
}

export function resetEventBus(): void {
  busInstance = null;
}

export { EventBus };

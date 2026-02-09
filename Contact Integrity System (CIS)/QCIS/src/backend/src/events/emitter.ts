// QwickServices CIS — Mock Event Emitter
// Simulates Sidebase platform events for standalone testing

import { DomainEvent, EventType, MessageEventPayload, TransactionEventPayload } from './types';
import { getEventBus } from './bus';
import { generateId, nowISO } from '../shared/utils';

interface EmitterConfig {
  /** Interval between events in milliseconds */
  intervalMs: number;
  /** Event types to emit (null = all types) */
  eventTypes: EventType[] | null;
  /** Include obfuscated/suspicious messages in the mix */
  includeSuspicious: boolean;
  /** Ratio of suspicious to clean events (0.0-1.0) */
  suspiciousRatio: number;
}

const DEFAULT_CONFIG: EmitterConfig = {
  intervalMs: 2000,
  eventTypes: null,
  includeSuspicious: true,
  suspiciousRatio: 0.3,
};

// ─── Sample Data ──────────────────────────────────────────────

const CLEAN_MESSAGES = [
  'Hi! I just placed my order. When can I expect delivery?',
  'Thanks for the quick response. The product looks great!',
  'Can you tell me more about the warranty?',
  'I need to update my shipping address before dispatch.',
  'The package arrived in perfect condition. Thank you!',
  'Do you have this item in a different color?',
  'What are your business hours?',
  'I would like to leave a 5-star review.',
  'Can I get a receipt for my purchase?',
  'Happy with the service, will order again.',
];

const SUSPICIOUS_MESSAGES = [
  'Hey, text me at 5 5 5 1 2 3 4 5 6 7 for a better deal',
  'My email is john dot doe at gee mail dot com',
  'Hit me up on WhatsApp, we can work something out',
  'Add me on t e l e g r a m @ quickdeals',
  'Lets take this off the app, send me a DM on insta',
  'I can pay you directly via venmo or cashapp',
  'Check out my profile on f.a" + "c.e" + "b.o.o.k',
  'Call me at five-five-five, one-two-three, four-five-six-seven',
  'Pay me through PayPal and I will give you a discount',
  'My number is 555-123-4567, message me there instead',
];

const OBFUSCATED_MESSAGES = [
  'My n.u" + "m.b" + "e.r is 5️⃣5️⃣5️⃣ 1️⃣2️⃣3️⃣ 4️⃣5️⃣6️⃣7️⃣',
  'h1t m3 up 0n wh4t5 4pp',
  'C a s h a p p me at $quickdealer',
  'em@il me >> john [at] g m a i l [dot] c o m',
  'My te|egram handle is @bypassCIS',
  'p a y p a l dot me slash directpay',
  'five five five, one two three, four five six seven - txt me',
  'DM me on the bird app @offplatform',
  'ven.mo me for the side deal, handle is @sidedeal',
  'I N S T A: @lets_go_direct',
];

const SAMPLE_USERS = [
  { id: '00000000-0000-0000-0000-000000000001', name: 'Alice' },
  { id: '00000000-0000-0000-0000-000000000002', name: 'Bob' },
  { id: '00000000-0000-0000-0000-000000000003', name: 'Charlie' },
  { id: '00000000-0000-0000-0000-000000000004', name: 'Diana' },
  { id: '00000000-0000-0000-0000-000000000005', name: 'Eve' },
];

// ─── Event Generators ─────────────────────────────────────────

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomPair(): [typeof SAMPLE_USERS[0], typeof SAMPLE_USERS[0]] {
  const sender = randomElement(SAMPLE_USERS);
  let receiver = randomElement(SAMPLE_USERS);
  while (receiver.id === sender.id) {
    receiver = randomElement(SAMPLE_USERS);
  }
  return [sender, receiver];
}

function generateMessageEvent(suspicious: boolean): DomainEvent {
  const [sender, receiver] = randomPair();
  const isSuspicious = suspicious && Math.random() < 0.5;
  const isObfuscated = suspicious && !isSuspicious;

  let content: string;
  if (isObfuscated) {
    content = randomElement(OBFUSCATED_MESSAGES);
  } else if (isSuspicious) {
    content = randomElement(SUSPICIOUS_MESSAGES);
  } else {
    content = randomElement(CLEAN_MESSAGES);
  }

  const payload: MessageEventPayload = {
    message_id: generateId(),
    sender_id: sender.id,
    receiver_id: receiver.id,
    conversation_id: generateId(),
    content,
  };

  return {
    id: generateId(),
    type: EventType.MESSAGE_CREATED,
    correlation_id: generateId(),
    timestamp: nowISO(),
    version: 1,
    payload: payload as unknown as Record<string, unknown>,
  };
}

function generateTransactionEvent(): DomainEvent {
  const [user, counterparty] = randomPair();
  const statuses = ['initiated', 'completed', 'failed'] as const;
  const status = randomElement([...statuses]);
  const amount = Math.round((Math.random() * 500 + 10) * 100) / 100;

  const eventTypeMap: Record<string, EventType> = {
    initiated: EventType.TRANSACTION_INITIATED,
    completed: EventType.TRANSACTION_COMPLETED,
    failed: EventType.TRANSACTION_FAILED,
  };

  const payload: TransactionEventPayload = {
    transaction_id: generateId(),
    user_id: user.id,
    counterparty_id: counterparty.id,
    amount,
    currency: 'USD',
    payment_method: randomElement(['stripe', 'escrow', 'platform']),
    status,
  };

  return {
    id: generateId(),
    type: eventTypeMap[status],
    correlation_id: generateId(),
    timestamp: nowISO(),
    version: 1,
    payload: payload as unknown as Record<string, unknown>,
  };
}

function generateRandomEvent(config: EmitterConfig): DomainEvent {
  const isSuspicious = config.includeSuspicious && Math.random() < config.suspiciousRatio;
  const roll = Math.random();

  if (roll < 0.6) {
    return generateMessageEvent(isSuspicious);
  } else {
    return generateTransactionEvent();
  }
}

// ─── Mock Event Emitter ───────────────────────────────────────

class MockEventEmitter {
  private config: EmitterConfig;
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private eventCount = 0;
  private recordedSequence: DomainEvent[] = [];
  private isReplaying = false;

  constructor(config?: Partial<EmitterConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Start emitting events at the configured interval */
  start(): void {
    if (this.intervalHandle) return;

    console.log(`[MockEmitter] Starting — interval: ${this.config.intervalMs}ms, suspicious ratio: ${this.config.suspiciousRatio}`);

    this.intervalHandle = setInterval(async () => {
      const event = generateRandomEvent(this.config);
      this.recordedSequence.push(event);
      this.eventCount++;

      try {
        const bus = getEventBus();
        await bus.emit(event);
        console.log(`[MockEmitter] Event #${this.eventCount}: ${event.type} (${event.id.slice(0, 8)})`);
      } catch (err) {
        console.error('[MockEmitter] Failed to emit event:', err);
      }
    }, this.config.intervalMs);
  }

  /** Stop emitting events */
  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      console.log(`[MockEmitter] Stopped after ${this.eventCount} events`);
    }
  }

  /** Emit a single event immediately */
  async emitOne(event?: DomainEvent): Promise<DomainEvent> {
    const e = event || generateRandomEvent(this.config);
    const bus = getEventBus();
    await bus.emit(e);
    this.eventCount++;
    return e;
  }

  /** Replay a recorded sequence of events */
  async replay(events: DomainEvent[], delayMs = 100): Promise<void> {
    this.isReplaying = true;
    const bus = getEventBus();

    for (const event of events) {
      if (!this.isReplaying) break;
      await bus.emit({
        ...event,
        id: generateId(), // New ID to avoid dedup
        timestamp: nowISO(),
      });
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    this.isReplaying = false;
  }

  stopReplay(): void {
    this.isReplaying = false;
  }

  /** Get recorded event sequence (for later replay) */
  getRecordedSequence(): DomainEvent[] {
    return [...this.recordedSequence];
  }

  getEventCount(): number {
    return this.eventCount;
  }

  updateConfig(config: Partial<EmitterConfig>): void {
    const wasRunning = !!this.intervalHandle;
    if (wasRunning) this.stop();
    this.config = { ...this.config, ...config };
    if (wasRunning) this.start();
  }
}

let emitterInstance: MockEventEmitter | null = null;

export function getMockEmitter(config?: Partial<EmitterConfig>): MockEventEmitter {
  if (!emitterInstance) {
    emitterInstance = new MockEventEmitter(config);
  }
  return emitterInstance;
}

export { MockEventEmitter, EmitterConfig, CLEAN_MESSAGES, SUSPICIOUS_MESSAGES, OBFUSCATED_MESSAGES, SAMPLE_USERS };

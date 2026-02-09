// QwickServices CIS — Event Type Definitions
// Immutable, time-ordered domain events matching architecture spec

export enum EventType {
  // Message events
  MESSAGE_CREATED = 'message.created',
  MESSAGE_EDITED = 'message.edited',
  MESSAGE_DELETED = 'message.deleted',

  // Transaction events
  TRANSACTION_INITIATED = 'transaction.initiated',
  TRANSACTION_COMPLETED = 'transaction.completed',
  TRANSACTION_FAILED = 'transaction.failed',
  TRANSACTION_CANCELLED = 'transaction.cancelled',

  // User events
  USER_STATUS_CHANGED = 'user.status_changed',

  // Enforcement events
  ENFORCEMENT_ACTION_APPLIED = 'enforcement.action_applied',
  ENFORCEMENT_ACTION_REVERSED = 'enforcement.action_reversed',

  // Appeal events
  APPEAL_SUBMITTED = 'appeal.submitted',
  APPEAL_RESOLVED = 'appeal.resolved',
}

export interface DomainEvent {
  /** Unique event ID (UUID) */
  id: string;
  /** Event type from the EventType enum */
  type: EventType;
  /** Correlation ID for tracing related events */
  correlation_id: string;
  /** ISO 8601 timestamp when the event occurred */
  timestamp: string;
  /** Schema version for forward compatibility */
  version: number;
  /** Event-specific payload */
  payload: Record<string, unknown>;
}

// ─── Typed Event Payloads ─────────────────────────────────────

export interface MessageEventPayload {
  message_id: string;
  sender_id: string;
  receiver_id: string;
  conversation_id?: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface MessageEditedPayload extends MessageEventPayload {
  previous_content: string;
}

export interface MessageDeletedPayload {
  message_id: string;
  sender_id: string;
  receiver_id: string;
  conversation_id?: string;
}

export interface TransactionEventPayload {
  transaction_id: string;
  user_id: string;
  counterparty_id?: string;
  amount: number;
  currency: string;
  payment_method?: string;
  status: string;
}

export interface UserStatusChangedPayload {
  user_id: string;
  previous_status: string;
  new_status: string;
  reason?: string;
}

export interface EnforcementEventPayload {
  action_id: string;
  user_id: string;
  action_type: string;
  reason: string;
  reason_code: string;
  signal_ids: string[];
}

export interface AppealEventPayload {
  appeal_id: string;
  enforcement_action_id: string;
  user_id: string;
  status: string;
  reason?: string;
}

// ─── Event Handler Type ───────────────────────────────────────

export type EventHandler = (event: DomainEvent) => Promise<void>;

// ─── Consumer Registration ────────────────────────────────────

export interface EventConsumer {
  name: string;
  eventTypes: EventType[] | '*';
  handler: EventHandler;
}

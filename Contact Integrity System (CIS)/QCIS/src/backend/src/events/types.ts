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

  // Booking events
  BOOKING_CREATED = 'booking.created',
  BOOKING_UPDATED = 'booking.updated',
  BOOKING_COMPLETED = 'booking.completed',
  BOOKING_CANCELLED = 'booking.cancelled',
  BOOKING_NO_SHOW = 'booking.no_show',

  // Wallet events
  WALLET_DEPOSIT = 'wallet.deposit',
  WALLET_WITHDRAWAL = 'wallet.withdrawal',
  WALLET_TRANSFER = 'wallet.transfer',

  // Provider events
  PROVIDER_REGISTERED = 'provider.registered',
  PROVIDER_UPDATED = 'provider.updated',

  // User registration
  USER_REGISTERED = 'user.registered',

  // Phase 2C — Contact & rating events
  CONTACT_FIELD_CHANGED = 'user.contact_field_changed',
  RATING_SUBMITTED = 'rating.submitted',

  // Phase 3A — Leakage & relationship events
  LEAKAGE_STAGE_ADVANCED = 'leakage.stage_advanced',
  RELATIONSHIP_UPDATED = 'relationship.updated',
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

export interface BookingEventPayload {
  booking_id: string;
  client_id: string;
  provider_id: string;
  service_category?: string;
  amount?: number;
  currency?: string;
  status: string;
  scheduled_at?: string;
}

export interface WalletEventPayload {
  wallet_tx_id: string;
  user_id: string;
  counterparty_id?: string;
  tx_type: string;
  amount: number;
  currency: string;
  payment_method?: string;
  status: string;
}

export interface ProviderEventPayload {
  provider_id: string;
  user_id: string;
  service_category?: string;
  metadata?: Record<string, unknown>;
}

export interface UserRegisteredPayload {
  user_id: string;
  external_id?: string;
  display_name?: string;
  email?: string;
  user_type?: string;
}

export interface ContactFieldChangedPayload {
  user_id: string;
  field: 'phone' | 'email';
  old_value?: string;
  new_value: string;
}

export interface RatingSubmittedPayload {
  rating_id: string;
  client_id: string;
  provider_id: string;
  booking_id?: string;
  score: number;
  comment?: string;
}

export interface LeakageStageAdvancedPayload {
  leakage_event_id: string;
  user_id: string;
  counterparty_id?: string;
  previous_stage: string;
  new_stage: string;
  platform_destination?: string;
}

export interface RelationshipUpdatedPayload {
  relationship_id: string;
  user_a_id: string;
  user_b_id: string;
  relationship_type: string;
  interaction_count: number;
}

// ─── Event Handler Type ───────────────────────────────────────

export type EventHandler = (event: DomainEvent) => Promise<void>;

// ─── Consumer Registration ────────────────────────────────────

export interface EventConsumer {
  name: string;
  eventTypes: EventType[] | '*';
  handler: EventHandler;
}

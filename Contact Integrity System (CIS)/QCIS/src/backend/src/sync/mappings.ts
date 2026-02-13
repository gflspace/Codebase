// QwickServices CIS — Table/Field Mappings for Data Sync
// Defines how QwickServices database tables map to CIS domain events.
// Field names use coalesce patterns to handle schema variations.

import { EventType } from '../events/types';

/**
 * Configuration for syncing a single QwickServices table.
 */
export interface TableMapping {
  /** QwickServices table name */
  sourceTable: string;
  /** Column used to track sync position (must be indexed, monotonically increasing) */
  cursorColumn: string;
  /** Column that identifies the primary key */
  primaryKeyColumn: string;
  /** SQL columns to SELECT (use aliases for normalization) */
  selectColumns: string;
  /** Which CIS event type(s) to emit for new/updated records */
  eventTypeMapping: (row: Record<string, unknown>) => EventType;
  /** Transform a database row into a CIS event payload */
  transformPayload: (row: Record<string, unknown>) => Record<string, unknown>;
  /** Extract the primary user ID for CIS user auto-provisioning */
  extractUserId: (row: Record<string, unknown>) => string | null;
  /** Optional: extract a counterparty user ID */
  extractCounterpartyId?: (row: Record<string, unknown>) => string | null;
  /** Optional WHERE clause filter (appended to sync query) */
  extraFilter?: string;
}

// ─── Mapping Definitions ─────────────────────────────────────

export const TABLE_MAPPINGS: TableMapping[] = [
  // ─── Users ───────────────────────────────────────────────
  {
    sourceTable: 'users',
    cursorColumn: 'updated_at',
    primaryKeyColumn: 'id',
    selectColumns: `
      id, email, phone, name,
      COALESCE(user_type, 'client') AS user_type,
      COALESCE(verification_status, 'unverified') AS verification_status,
      created_at, updated_at
    `,
    eventTypeMapping: () => EventType.USER_REGISTERED,
    transformPayload: (row) => ({
      user_id: String(row.id),
      external_id: String(row.id),
      display_name: row.name || null,
      email: row.email || null,
      user_type: row.user_type || 'client',
    }),
    extractUserId: (row) => row.id ? String(row.id) : null,
  },

  // ─── Bookings ────────────────────────────────────────────
  {
    sourceTable: 'bookings',
    cursorColumn: 'updated_at',
    primaryKeyColumn: 'id',
    selectColumns: `
      id,
      COALESCE(user_id, customer_id, client_id) AS client_id,
      provider_id,
      COALESCE(service_type, service_category, 'general') AS service_category,
      COALESCE(amount, total, 0) AS amount,
      COALESCE(currency, 'USD') AS currency,
      status,
      COALESCE(scheduled_at, start_time) AS scheduled_at,
      COALESCE(cancellation_reason, cancel_reason) AS cancellation_reason,
      created_at, updated_at
    `,
    eventTypeMapping: (row) => {
      const status = String(row.status || '').toLowerCase();
      if (status === 'cancelled') return EventType.BOOKING_CANCELLED;
      if (status === 'completed') return EventType.BOOKING_COMPLETED;
      if (status === 'no_show') return EventType.BOOKING_NO_SHOW;
      if (status === 'confirmed' || status === 'in_progress') return EventType.BOOKING_UPDATED;
      return EventType.BOOKING_CREATED;
    },
    transformPayload: (row) => ({
      booking_id: String(row.id),
      client_id: String(row.client_id),
      provider_id: String(row.provider_id),
      service_category: row.service_category || 'general',
      amount: parseFloat(String(row.amount || 0)),
      currency: String(row.currency || 'USD'),
      status: String(row.status || 'pending'),
      scheduled_at: row.scheduled_at ? new Date(String(row.scheduled_at)).toISOString() : undefined,
    }),
    extractUserId: (row) => row.client_id ? String(row.client_id) : null,
    extractCounterpartyId: (row) => row.provider_id ? String(row.provider_id) : null,
  },

  // ─── Payments ────────────────────────────────────────────
  {
    sourceTable: 'payments',
    cursorColumn: 'updated_at',
    primaryKeyColumn: 'id',
    selectColumns: `
      id,
      COALESCE(user_id, customer_id) AS user_id,
      booking_id,
      COALESCE(counterparty_id, provider_id) AS counterparty_id,
      amount,
      COALESCE(currency, 'USD') AS currency,
      COALESCE(payment_method, 'unknown') AS payment_method,
      status,
      created_at, updated_at
    `,
    eventTypeMapping: (row) => {
      const status = String(row.status || '').toLowerCase();
      if (status === 'completed' || status === 'success') return EventType.TRANSACTION_COMPLETED;
      if (status === 'failed' || status === 'rejected') return EventType.TRANSACTION_FAILED;
      if (status === 'cancelled' || status === 'refunded') return EventType.TRANSACTION_CANCELLED;
      return EventType.TRANSACTION_INITIATED;
    },
    transformPayload: (row) => ({
      transaction_id: String(row.id),
      user_id: String(row.user_id),
      counterparty_id: row.counterparty_id ? String(row.counterparty_id) : undefined,
      amount: parseFloat(String(row.amount || 0)),
      currency: String(row.currency || 'USD'),
      payment_method: String(row.payment_method || 'unknown'),
      status: String(row.status || 'initiated'),
    }),
    extractUserId: (row) => row.user_id ? String(row.user_id) : null,
    extractCounterpartyId: (row) => row.counterparty_id ? String(row.counterparty_id) : null,
  },

  // ─── Messages ────────────────────────────────────────────
  {
    sourceTable: 'messages',
    cursorColumn: 'updated_at',
    primaryKeyColumn: 'id',
    selectColumns: `
      id,
      COALESCE(sender_id, user_id) AS sender_id,
      COALESCE(recipient_id, receiver_id) AS receiver_id,
      conversation_id,
      COALESCE(content, body, '') AS content,
      created_at, updated_at
    `,
    eventTypeMapping: (row) => {
      // If updated_at > created_at + 1 second, treat as edit
      if (row.updated_at && row.created_at) {
        const created = new Date(String(row.created_at)).getTime();
        const updated = new Date(String(row.updated_at)).getTime();
        if (updated - created > 1000) return EventType.MESSAGE_EDITED;
      }
      return EventType.MESSAGE_CREATED;
    },
    transformPayload: (row) => ({
      message_id: String(row.id),
      sender_id: String(row.sender_id),
      receiver_id: String(row.receiver_id),
      conversation_id: row.conversation_id ? String(row.conversation_id) : undefined,
      content: String(row.content || ''),
    }),
    extractUserId: (row) => row.sender_id ? String(row.sender_id) : null,
    extractCounterpartyId: (row) => row.receiver_id ? String(row.receiver_id) : null,
  },

  // ─── Ratings ─────────────────────────────────────────────
  {
    sourceTable: 'ratings',
    cursorColumn: 'created_at',
    primaryKeyColumn: 'id',
    selectColumns: `
      id,
      COALESCE(reviewer_id, client_id, user_id) AS client_id,
      COALESCE(reviewee_id, provider_id) AS provider_id,
      booking_id,
      COALESCE(rating, score) AS score,
      COALESCE(comment, review, '') AS comment,
      created_at
    `,
    eventTypeMapping: () => EventType.RATING_SUBMITTED,
    transformPayload: (row) => ({
      rating_id: String(row.id),
      client_id: String(row.client_id),
      provider_id: String(row.provider_id),
      booking_id: row.booking_id ? String(row.booking_id) : undefined,
      score: parseInt(String(row.score || 5), 10),
      comment: row.comment ? String(row.comment) : undefined,
    }),
    extractUserId: (row) => row.client_id ? String(row.client_id) : null,
    extractCounterpartyId: (row) => row.provider_id ? String(row.provider_id) : null,
    extraFilter: undefined, // ratings typically only have created_at
  },

  // ─── Disputes ────────────────────────────────────────────
  {
    sourceTable: 'disputes',
    cursorColumn: 'updated_at',
    primaryKeyColumn: 'id',
    selectColumns: `
      id,
      COALESCE(complainant_id, user_id, client_id) AS user_id,
      COALESCE(respondent_id, provider_id) AS provider_id,
      booking_id,
      reason,
      status,
      resolution,
      created_at, updated_at
    `,
    eventTypeMapping: () => EventType.BOOKING_UPDATED, // Disputes processed as booking context events
    transformPayload: (row) => ({
      booking_id: row.booking_id ? String(row.booking_id) : String(row.id),
      client_id: String(row.user_id),
      provider_id: row.provider_id ? String(row.provider_id) : undefined,
      service_category: 'dispute',
      status: 'disputed',
      metadata: {
        dispute_id: String(row.id),
        dispute_reason: row.reason,
        dispute_status: row.status,
        dispute_resolution: row.resolution,
      },
    }),
    extractUserId: (row) => row.user_id ? String(row.user_id) : null,
    extractCounterpartyId: (row) => row.provider_id ? String(row.provider_id) : null,
  },

  // ─── Providers (service providers) ───────────────────────
  {
    sourceTable: 'providers',
    cursorColumn: 'updated_at',
    primaryKeyColumn: 'id',
    selectColumns: `
      id,
      COALESCE(user_id, id) AS user_id,
      COALESCE(service_category, specialty, 'general') AS service_category,
      COALESCE(verification_status, 'unverified') AS verification_status,
      email, phone,
      created_at, updated_at
    `,
    eventTypeMapping: (row) => {
      // If created_at == updated_at (within 1s), treat as new registration
      if (row.updated_at && row.created_at) {
        const created = new Date(String(row.created_at)).getTime();
        const updated = new Date(String(row.updated_at)).getTime();
        if (updated - created <= 1000) return EventType.PROVIDER_REGISTERED;
      }
      return EventType.PROVIDER_UPDATED;
    },
    transformPayload: (row) => ({
      provider_id: String(row.id),
      user_id: String(row.user_id),
      service_category: row.service_category || 'general',
      metadata: {
        verification_status: row.verification_status,
        email: row.email,
        phone: row.phone,
      },
    }),
    extractUserId: (row) => row.user_id ? String(row.user_id) : null,
  },
];

/**
 * Get mapping for a specific table.
 */
export function getMappingForTable(sourceTable: string): TableMapping | undefined {
  return TABLE_MAPPINGS.find(m => m.sourceTable === sourceTable);
}

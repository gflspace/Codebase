// QwickServices CIS — Table/Field Mappings for Data Sync
// Defines how QwickServices MySQL tables map to CIS domain events.
// Column names match the exact QwickServices Laravel schema (blueprint).

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

// ─── Mapping Definitions (Blueprint-Aligned) ────────────────

export const TABLE_MAPPINGS: TableMapping[] = [
  // ─── Categories ────────────────────────────────────────────
  {
    sourceTable: 'categories',
    cursorColumn: 'updated_at',
    primaryKeyColumn: 'category_id',
    selectColumns: `
      category_id, name, parent_id, status, created_at, updated_at
    `,
    extraFilter: `status = 'active'`,
    eventTypeMapping: (row) => {
      if (row.created_at && row.updated_at) {
        const created = new Date(String(row.created_at)).getTime();
        const updated = new Date(String(row.updated_at)).getTime();
        if (updated - created <= 1000) return EventType.CATEGORY_CREATED;
      }
      return EventType.CATEGORY_UPDATED;
    },
    transformPayload: (row) => ({
      category_id: String(row.category_id),
      name: String(row.name || ''),
      parent_id: row.parent_id ? String(row.parent_id) : null,
      status: String(row.status || 'active'),
    }),
    extractUserId: () => null, // Categories have no user
  },

  // ─── Users (Customers) ────────────────────────────────────
  {
    sourceTable: 'users',
    cursorColumn: 'updated_at',
    primaryKeyColumn: 'user_id',
    selectColumns: `
      user_id, email, phone, is_active, is_email_verified, is_phone_verified,
      wallet_balance, booking_count, cancellation_rate, created_at, updated_at
    `,
    extraFilter: `user_type = 'customer' AND is_active = 1`,
    eventTypeMapping: () => EventType.USER_REGISTERED,
    transformPayload: (row) => ({
      user_id: String(row.user_id),
      external_id: String(row.user_id),
      email: row.email || null,
      phone: row.phone || null,
      user_type: 'customer',
      metadata: {
        is_email_verified: row.is_email_verified,
        is_phone_verified: row.is_phone_verified,
        wallet_balance: row.wallet_balance != null ? parseFloat(String(row.wallet_balance)) : 0,
        booking_count: row.booking_count != null ? parseInt(String(row.booking_count), 10) : 0,
        cancellation_rate: row.cancellation_rate != null ? parseFloat(String(row.cancellation_rate)) : 0,
      },
    }),
    extractUserId: (row) => row.user_id ? String(row.user_id) : null,
  },

  // ─── Providers ─────────────────────────────────────────────
  {
    sourceTable: 'providers',
    cursorColumn: 'updated_at',
    primaryKeyColumn: 'provider_id',
    selectColumns: `
      provider_id, status, is_kyc_verified, is_active, total_services,
      completion_rate, rejection_rate, total_earnings, wallet_balance,
      created_at, updated_at
    `,
    extraFilter: `is_active = 1`,
    eventTypeMapping: (row) => {
      if (row.created_at && row.updated_at) {
        const created = new Date(String(row.created_at)).getTime();
        const updated = new Date(String(row.updated_at)).getTime();
        if (updated - created <= 1000) return EventType.PROVIDER_REGISTERED;
      }
      return EventType.PROVIDER_UPDATED;
    },
    transformPayload: (row) => ({
      provider_id: String(row.provider_id),
      user_id: String(row.provider_id),
      metadata: {
        status: row.status,
        is_kyc_verified: row.is_kyc_verified,
        total_services: row.total_services != null ? parseInt(String(row.total_services), 10) : 0,
        completion_rate: row.completion_rate != null ? parseFloat(String(row.completion_rate)) : 0,
        rejection_rate: row.rejection_rate != null ? parseFloat(String(row.rejection_rate)) : 0,
        total_earnings: row.total_earnings != null ? parseFloat(String(row.total_earnings)) : 0,
        wallet_balance: row.wallet_balance != null ? parseFloat(String(row.wallet_balance)) : 0,
      },
    }),
    extractUserId: (row) => row.provider_id ? String(row.provider_id) : null,
  },

  // ─── Transactions ──────────────────────────────────────────
  {
    sourceTable: 'transactions',
    cursorColumn: 'created_at',
    primaryKeyColumn: 'transaction_id',
    selectColumns: `
      transaction_id, booking_id, payer_id, payee_id, amount,
      payment_method, commission_amount, status, created_at
    `,
    extraFilter: `status IN ('completed','pending','disputed')`,
    eventTypeMapping: (row) => {
      const status = String(row.status || '').toLowerCase();
      if (status === 'completed') return EventType.TRANSACTION_COMPLETED;
      if (status === 'failed' || status === 'rejected') return EventType.TRANSACTION_FAILED;
      if (status === 'cancelled' || status === 'refunded') return EventType.TRANSACTION_CANCELLED;
      if (status === 'disputed') return EventType.TRANSACTION_COMPLETED; // disputed transactions were completed first
      return EventType.TRANSACTION_INITIATED;
    },
    transformPayload: (row) => ({
      transaction_id: String(row.transaction_id),
      user_id: String(row.payer_id),
      counterparty_id: row.payee_id ? String(row.payee_id) : undefined,
      booking_id: row.booking_id ? String(row.booking_id) : undefined,
      amount: parseFloat(String(row.amount || 0)),
      currency: 'USD',
      payment_method: String(row.payment_method || 'unknown'),
      commission_amount: row.commission_amount != null ? parseFloat(String(row.commission_amount)) : undefined,
      status: String(row.status || 'pending'),
    }),
    extractUserId: (row) => row.payer_id ? String(row.payer_id) : null,
    extractCounterpartyId: (row) => row.payee_id ? String(row.payee_id) : null,
  },

  // ─── Bookings ──────────────────────────────────────────────
  {
    sourceTable: 'bookings',
    cursorColumn: 'updated_at',
    primaryKeyColumn: 'booking_id',
    selectColumns: `
      booking_id, booking_uid, user_id, provider_id, service_id, category_id,
      status, total_amount, scheduled_time, completion_time,
      created_at, updated_at
    `,
    extraFilter: `status != 'archived'`,
    eventTypeMapping: (row) => {
      const status = String(row.status || '').toLowerCase();
      if (status === 'cancelled') return EventType.BOOKING_CANCELLED;
      if (status === 'completed') return EventType.BOOKING_COMPLETED;
      if (status === 'no_show') return EventType.BOOKING_NO_SHOW;
      if (status === 'confirmed' || status === 'in_progress') return EventType.BOOKING_UPDATED;
      return EventType.BOOKING_CREATED;
    },
    transformPayload: (row) => ({
      booking_id: String(row.booking_id),
      booking_uid: row.booking_uid ? String(row.booking_uid) : undefined,
      client_id: String(row.user_id),
      provider_id: String(row.provider_id),
      service_id: row.service_id ? String(row.service_id) : undefined,
      category_id: row.category_id ? String(row.category_id) : undefined,
      amount: parseFloat(String(row.total_amount || 0)),
      currency: 'USD',
      status: String(row.status || 'pending'),
      scheduled_at: row.scheduled_time ? new Date(String(row.scheduled_time)).toISOString() : undefined,
      completed_at: row.completion_time ? new Date(String(row.completion_time)).toISOString() : undefined,
    }),
    extractUserId: (row) => row.user_id ? String(row.user_id) : null,
    extractCounterpartyId: (row) => row.provider_id ? String(row.provider_id) : null,
  },

  // ─── Messages ──────────────────────────────────────────────
  {
    sourceTable: 'messages',
    cursorColumn: 'timestamp',
    primaryKeyColumn: 'message_id',
    selectColumns: `
      message_id, booking_id, sender_id, receiver_id, message_type, timestamp
    `,
    eventTypeMapping: () => EventType.MESSAGE_CREATED,
    transformPayload: (row) => ({
      message_id: String(row.message_id),
      sender_id: String(row.sender_id),
      receiver_id: String(row.receiver_id),
      booking_id: row.booking_id ? String(row.booking_id) : undefined,
      message_type: row.message_type ? String(row.message_type) : 'text',
    }),
    extractUserId: (row) => row.sender_id ? String(row.sender_id) : null,
    extractCounterpartyId: (row) => row.receiver_id ? String(row.receiver_id) : null,
  },

  // ─── Ratings (optional — may not exist in all deployments) ─
  {
    sourceTable: 'ratings',
    cursorColumn: 'created_at',
    primaryKeyColumn: 'id',
    selectColumns: `
      id, booking_id, reviewer_id, reviewee_id, rating, comment, created_at
    `,
    eventTypeMapping: () => EventType.RATING_SUBMITTED,
    transformPayload: (row) => ({
      rating_id: String(row.id),
      client_id: String(row.reviewer_id),
      provider_id: String(row.reviewee_id),
      booking_id: row.booking_id ? String(row.booking_id) : undefined,
      score: parseInt(String(row.rating || 5), 10),
      comment: row.comment ? String(row.comment) : undefined,
    }),
    extractUserId: (row) => row.reviewer_id ? String(row.reviewer_id) : null,
    extractCounterpartyId: (row) => row.reviewee_id ? String(row.reviewee_id) : null,
  },

  // ─── Disputes (optional — may not exist in all deployments) ─
  {
    sourceTable: 'disputes',
    cursorColumn: 'updated_at',
    primaryKeyColumn: 'id',
    selectColumns: `
      id, booking_id, complainant_id, respondent_id, reason, status, resolution,
      created_at, updated_at
    `,
    eventTypeMapping: (row) => {
      const status = String(row.status || '').toLowerCase();
      if (status === 'resolved_for_complainant' || status === 'resolved_for_respondent' || status === 'dismissed')
        return EventType.DISPUTE_RESOLVED;
      return EventType.DISPUTE_OPENED;
    },
    transformPayload: (row) => ({
      dispute_id: String(row.id),
      booking_id: row.booking_id ? String(row.booking_id) : '',
      complainant_id: String(row.complainant_id),
      respondent_id: row.respondent_id ? String(row.respondent_id) : '',
      reason: row.reason ? String(row.reason) : '',
      status: String(row.status || 'open'),
    }),
    extractUserId: (row) => row.complainant_id ? String(row.complainant_id) : null,
    extractCounterpartyId: (row) => row.respondent_id ? String(row.respondent_id) : null,
  },
];

/**
 * Get mapping for a specific table.
 */
export function getMappingForTable(sourceTable: string): TableMapping | undefined {
  return TABLE_MAPPINGS.find(m => m.sourceTable === sourceTable);
}

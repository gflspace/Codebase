// QwickServices CIS — Sync Mappings Validation Tests
// Validates each mapping has correct structure, event types, and transform functions.

import { describe, it, expect } from 'vitest';
import { TABLE_MAPPINGS, getMappingForTable } from '../../src/sync/mappings';
import { EventType } from '../../src/events/types';

// ─── Structural Validation ──────────────────────────────────

describe('TABLE_MAPPINGS structure', () => {
  it('has 8 mappings (categories, users, providers, transactions, bookings, messages, ratings, disputes)', () => {
    expect(TABLE_MAPPINGS.length).toBe(8);
  });

  it('all mappings have required fields', () => {
    for (const m of TABLE_MAPPINGS) {
      expect(m.sourceTable).toBeTruthy();
      expect(m.cursorColumn).toBeTruthy();
      expect(m.primaryKeyColumn).toBeTruthy();
      expect(m.selectColumns).toBeTruthy();
      expect(typeof m.eventTypeMapping).toBe('function');
      expect(typeof m.transformPayload).toBe('function');
      expect(typeof m.extractUserId).toBe('function');
    }
  });

  it('each sourceTable is unique', () => {
    const tables = TABLE_MAPPINGS.map(m => m.sourceTable);
    expect(new Set(tables).size).toBe(tables.length);
  });

  it('selectColumns include the primaryKeyColumn', () => {
    for (const m of TABLE_MAPPINGS) {
      expect(m.selectColumns).toContain(m.primaryKeyColumn);
    }
  });

  it('selectColumns include the cursorColumn or a column it aliases from', () => {
    for (const m of TABLE_MAPPINGS) {
      // cursorColumn should appear in selectColumns (either directly or as part of another column)
      expect(m.selectColumns).toContain(m.cursorColumn);
    }
  });
});

// ─── Categories Mapping ─────────────────────────────────────

describe('categories mapping', () => {
  const mapping = getMappingForTable('categories')!;

  it('exists and uses correct columns', () => {
    expect(mapping).toBeDefined();
    expect(mapping.primaryKeyColumn).toBe('category_id');
    expect(mapping.cursorColumn).toBe('updated_at');
    expect(mapping.extraFilter).toContain('active');
  });

  it('emits CATEGORY_CREATED for new rows', () => {
    const now = '2026-02-14T12:00:00Z';
    const row = { category_id: '1', name: 'Plumbing', created_at: now, updated_at: now, status: 'active' };
    expect(mapping.eventTypeMapping(row)).toBe(EventType.CATEGORY_CREATED);
  });

  it('emits CATEGORY_UPDATED for updated rows', () => {
    const row = {
      category_id: '1', name: 'Plumbing',
      created_at: '2026-02-13T12:00:00Z',
      updated_at: '2026-02-14T12:00:00Z',
      status: 'active',
    };
    expect(mapping.eventTypeMapping(row)).toBe(EventType.CATEGORY_UPDATED);
  });

  it('transforms payload correctly', () => {
    const row = { category_id: '42', name: 'Electrical', parent_id: '10', status: 'active' };
    const payload = mapping.transformPayload(row);
    expect(payload.category_id).toBe('42');
    expect(payload.name).toBe('Electrical');
    expect(payload.parent_id).toBe('10');
    expect(payload.status).toBe('active');
  });

  it('extractUserId returns null (categories have no user)', () => {
    expect(mapping.extractUserId({ category_id: '1' })).toBeNull();
  });
});

// ─── Users (Customers) Mapping ──────────────────────────────

describe('users mapping', () => {
  const mapping = getMappingForTable('users')!;

  it('uses user_id as primary key', () => {
    expect(mapping.primaryKeyColumn).toBe('user_id');
  });

  it('filters to active customers only', () => {
    expect(mapping.extraFilter).toContain('customer');
    expect(mapping.extraFilter).toContain('is_active');
  });

  it('emits USER_REGISTERED', () => {
    expect(mapping.eventTypeMapping({})).toBe(EventType.USER_REGISTERED);
  });

  it('transforms payload with metadata', () => {
    const row = {
      user_id: 'u1', email: 'test@test.com', phone: '+1234',
      is_email_verified: 1, is_phone_verified: 0,
      wallet_balance: '100.50', booking_count: '5', cancellation_rate: '0.1',
    };
    const payload = mapping.transformPayload(row);
    expect(payload.user_id).toBe('u1');
    expect(payload.email).toBe('test@test.com');
    expect(payload.user_type).toBe('customer');
    expect((payload.metadata as Record<string, unknown>).wallet_balance).toBe(100.5);
    expect((payload.metadata as Record<string, unknown>).booking_count).toBe(5);
  });
});

// ─── Providers Mapping ──────────────────────────────────────

describe('providers mapping', () => {
  const mapping = getMappingForTable('providers')!;

  it('uses provider_id as primary key', () => {
    expect(mapping.primaryKeyColumn).toBe('provider_id');
  });

  it('filters to active providers only', () => {
    expect(mapping.extraFilter).toContain('is_active');
  });

  it('emits PROVIDER_REGISTERED for new rows', () => {
    const now = '2026-02-14T12:00:00Z';
    expect(mapping.eventTypeMapping({ created_at: now, updated_at: now })).toBe(EventType.PROVIDER_REGISTERED);
  });

  it('emits PROVIDER_UPDATED for updated rows', () => {
    expect(mapping.eventTypeMapping({
      created_at: '2026-02-13T12:00:00Z',
      updated_at: '2026-02-14T12:00:00Z',
    })).toBe(EventType.PROVIDER_UPDATED);
  });

  it('transforms payload with KYC and performance metadata', () => {
    const row = {
      provider_id: 'p1', status: 'active', is_kyc_verified: 1,
      total_services: '10', completion_rate: '0.95', rejection_rate: '0.02',
      total_earnings: '5000', wallet_balance: '200',
    };
    const payload = mapping.transformPayload(row);
    expect(payload.provider_id).toBe('p1');
    expect(payload.user_id).toBe('p1');
    const meta = payload.metadata as Record<string, unknown>;
    expect(meta.is_kyc_verified).toBe(1);
    expect(meta.completion_rate).toBe(0.95);
    expect(meta.total_earnings).toBe(5000);
  });
});

// ─── Transactions Mapping ───────────────────────────────────

describe('transactions mapping', () => {
  const mapping = getMappingForTable('transactions')!;

  it('uses transaction_id as primary key', () => {
    expect(mapping.primaryKeyColumn).toBe('transaction_id');
  });

  it('uses created_at as cursor', () => {
    expect(mapping.cursorColumn).toBe('created_at');
  });

  it('filters to completed/pending/disputed', () => {
    expect(mapping.extraFilter).toContain('completed');
    expect(mapping.extraFilter).toContain('pending');
    expect(mapping.extraFilter).toContain('disputed');
  });

  it('emits correct event types by status', () => {
    expect(mapping.eventTypeMapping({ status: 'pending' })).toBe(EventType.TRANSACTION_INITIATED);
    expect(mapping.eventTypeMapping({ status: 'completed' })).toBe(EventType.TRANSACTION_COMPLETED);
    expect(mapping.eventTypeMapping({ status: 'failed' })).toBe(EventType.TRANSACTION_FAILED);
    expect(mapping.eventTypeMapping({ status: 'cancelled' })).toBe(EventType.TRANSACTION_CANCELLED);
  });

  it('transforms payload with payer/payee IDs', () => {
    const row = {
      transaction_id: 't1', booking_id: 'b1', payer_id: 'u1', payee_id: 'p1',
      amount: '150.00', payment_method: 'credit_card', commission_amount: '15.00', status: 'completed',
    };
    const payload = mapping.transformPayload(row);
    expect(payload.transaction_id).toBe('t1');
    expect(payload.user_id).toBe('u1');
    expect(payload.counterparty_id).toBe('p1');
    expect(payload.amount).toBe(150);
    expect(payload.commission_amount).toBe(15);
  });
});

// ─── Bookings Mapping ───────────────────────────────────────

describe('bookings mapping', () => {
  const mapping = getMappingForTable('bookings')!;

  it('uses booking_id as primary key', () => {
    expect(mapping.primaryKeyColumn).toBe('booking_id');
  });

  it('filters out archived bookings', () => {
    expect(mapping.extraFilter).toContain('archived');
  });

  it('emits correct event types by status', () => {
    expect(mapping.eventTypeMapping({ status: 'pending' })).toBe(EventType.BOOKING_CREATED);
    expect(mapping.eventTypeMapping({ status: 'confirmed' })).toBe(EventType.BOOKING_UPDATED);
    expect(mapping.eventTypeMapping({ status: 'completed' })).toBe(EventType.BOOKING_COMPLETED);
    expect(mapping.eventTypeMapping({ status: 'cancelled' })).toBe(EventType.BOOKING_CANCELLED);
    expect(mapping.eventTypeMapping({ status: 'no_show' })).toBe(EventType.BOOKING_NO_SHOW);
  });

  it('transforms payload with blueprint column names', () => {
    const row = {
      booking_id: 'b1', booking_uid: 'BK-001', user_id: 'u1', provider_id: 'p1',
      service_id: 's1', category_id: 'c1', status: 'pending',
      total_amount: '200.00', scheduled_time: '2026-03-01T10:00:00Z',
    };
    const payload = mapping.transformPayload(row);
    expect(payload.booking_id).toBe('b1');
    expect(payload.booking_uid).toBe('BK-001');
    expect(payload.client_id).toBe('u1');
    expect(payload.provider_id).toBe('p1');
    expect(payload.category_id).toBe('c1');
    expect(payload.amount).toBe(200);
  });

  it('extracts user_id and provider_id', () => {
    const row = { user_id: 'u1', provider_id: 'p1', booking_id: 'b1' };
    expect(mapping.extractUserId(row)).toBe('u1');
    expect(mapping.extractCounterpartyId!(row)).toBe('p1');
  });
});

// ─── Messages Mapping ───────────────────────────────────────

describe('messages mapping', () => {
  const mapping = getMappingForTable('messages')!;

  it('uses message_id as primary key', () => {
    expect(mapping.primaryKeyColumn).toBe('message_id');
  });

  it('uses timestamp as cursor (not updated_at)', () => {
    expect(mapping.cursorColumn).toBe('timestamp');
  });

  it('has no extra filter', () => {
    expect(mapping.extraFilter).toBeUndefined();
  });

  it('emits MESSAGE_CREATED', () => {
    expect(mapping.eventTypeMapping({})).toBe(EventType.MESSAGE_CREATED);
  });

  it('transforms payload with blueprint column names', () => {
    const row = {
      message_id: 'm1', booking_id: 'b1', sender_id: 'u1',
      receiver_id: 'u2', message_type: 'text', timestamp: '2026-02-14T12:00:00Z',
    };
    const payload = mapping.transformPayload(row);
    expect(payload.message_id).toBe('m1');
    expect(payload.sender_id).toBe('u1');
    expect(payload.receiver_id).toBe('u2');
    expect(payload.booking_id).toBe('b1');
    expect(payload.message_type).toBe('text');
  });
});

// ─── Ratings Mapping ────────────────────────────────────────

describe('ratings mapping', () => {
  const mapping = getMappingForTable('ratings')!;

  it('exists with correct cursor', () => {
    expect(mapping).toBeDefined();
    expect(mapping.cursorColumn).toBe('created_at');
    expect(mapping.primaryKeyColumn).toBe('id');
  });

  it('emits RATING_SUBMITTED', () => {
    expect(mapping.eventTypeMapping({})).toBe(EventType.RATING_SUBMITTED);
  });

  it('transforms with reviewer/reviewee IDs', () => {
    const row = { id: 'r1', reviewer_id: 'u1', reviewee_id: 'p1', rating: '4', booking_id: 'b1' };
    const payload = mapping.transformPayload(row);
    expect(payload.client_id).toBe('u1');
    expect(payload.provider_id).toBe('p1');
    expect(payload.score).toBe(4);
  });
});

// ─── Disputes Mapping ───────────────────────────────────────

describe('disputes mapping', () => {
  const mapping = getMappingForTable('disputes')!;

  it('exists with correct columns', () => {
    expect(mapping).toBeDefined();
    expect(mapping.cursorColumn).toBe('updated_at');
    expect(mapping.primaryKeyColumn).toBe('id');
  });

  it('emits DISPUTE_OPENED for open status', () => {
    expect(mapping.eventTypeMapping({ status: 'open' })).toBe(EventType.DISPUTE_OPENED);
  });

  it('emits DISPUTE_RESOLVED for resolved status', () => {
    expect(mapping.eventTypeMapping({ status: 'resolved_for_complainant' })).toBe(EventType.DISPUTE_RESOLVED);
    expect(mapping.eventTypeMapping({ status: 'dismissed' })).toBe(EventType.DISPUTE_RESOLVED);
  });
});

// ─── getMappingForTable ─────────────────────────────────────

describe('getMappingForTable', () => {
  it('returns mapping for each known table', () => {
    for (const table of ['categories', 'users', 'providers', 'transactions', 'bookings', 'messages', 'ratings', 'disputes']) {
      expect(getMappingForTable(table)).toBeDefined();
    }
  });

  it('returns undefined for unknown table', () => {
    expect(getMappingForTable('nonexistent')).toBeUndefined();
  });

  it('returns undefined for old "payments" table name', () => {
    expect(getMappingForTable('payments')).toBeUndefined();
  });
});

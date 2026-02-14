// QwickServices CIS — Sync Transformer Unit Tests

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock database ───────────────────────────────────────────

const mockQuery = vi.fn();

vi.mock('../../src/database/connection', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

vi.mock('../../src/events/bus', () => ({
  getEventBus: () => ({ emit: vi.fn().mockResolvedValue(undefined), registerConsumer: vi.fn(), subscribe: vi.fn() }),
}));

// ─── Imports (after mocks) ───────────────────────────────────

import { transformRow, ensureUserExists, ensureCategoryExists } from '../../src/sync/transformer';
import { getMappingForTable, TABLE_MAPPINGS } from '../../src/sync/mappings';
import { EventType } from '../../src/events/types';

beforeEach(() => {
  mockQuery.mockReset();
});

// ─── transformRow ────────────────────────────────────────────

describe('transformRow', () => {
  it('converts a booking row to BOOKING_CREATED event', () => {
    const mapping = getMappingForTable('bookings')!;
    const row = {
      booking_id: 'booking-1',
      booking_uid: 'BK-001',
      user_id: 'user-1',
      provider_id: 'provider-1',
      service_id: 'svc-1',
      category_id: 'cat-1',
      status: 'pending',
      total_amount: '150.00',
      scheduled_time: '2026-02-15T10:00:00Z',
      created_at: '2026-02-13T12:00:00Z',
      updated_at: '2026-02-13T12:00:00Z',
    };

    const event = transformRow(row, mapping);

    expect(event.type).toBe(EventType.BOOKING_CREATED);
    expect(event.payload.booking_id).toBe('booking-1');
    expect(event.payload.client_id).toBe('user-1');
    expect(event.payload.provider_id).toBe('provider-1');
    expect(event.payload.category_id).toBe('cat-1');
    expect(event.payload.amount).toBe(150);
    expect(event.payload.status).toBe('pending');
  });

  it('converts a cancelled booking to BOOKING_CANCELLED event', () => {
    const mapping = getMappingForTable('bookings')!;
    const row = {
      booking_id: 'booking-2',
      user_id: 'user-2',
      provider_id: 'provider-2',
      status: 'cancelled',
      total_amount: '200.00',
      scheduled_time: '2026-02-20T14:00:00Z',
      created_at: '2026-02-13T09:00:00Z',
      updated_at: '2026-02-14T10:00:00Z',
    };

    const event = transformRow(row, mapping);

    expect(event.type).toBe(EventType.BOOKING_CANCELLED);
    expect(event.payload.status).toBe('cancelled');
  });

  it('converts a transaction row to TRANSACTION_INITIATED event', () => {
    const mapping = getMappingForTable('transactions')!;
    const row = {
      transaction_id: 'txn-1',
      booking_id: 'booking-1',
      payer_id: 'user-1',
      payee_id: 'provider-1',
      amount: '150.00',
      payment_method: 'credit_card',
      commission_amount: '15.00',
      status: 'pending',
      created_at: '2026-02-13T12:00:00Z',
    };

    const event = transformRow(row, mapping);

    expect(event.type).toBe(EventType.TRANSACTION_INITIATED);
    expect(event.payload.transaction_id).toBe('txn-1');
    expect(event.payload.user_id).toBe('user-1');
    expect(event.payload.counterparty_id).toBe('provider-1');
    expect(event.payload.amount).toBe(150);
    expect(event.payload.payment_method).toBe('credit_card');
    expect(event.payload.commission_amount).toBe(15);
    expect(event.payload.status).toBe('pending');
  });

  it('converts a completed transaction to TRANSACTION_COMPLETED event', () => {
    const mapping = getMappingForTable('transactions')!;
    const row = {
      transaction_id: 'txn-2',
      payer_id: 'user-2',
      payee_id: 'provider-2',
      amount: '200.00',
      payment_method: 'bank_transfer',
      status: 'completed',
      created_at: '2026-02-13T12:00:00Z',
    };

    const event = transformRow(row, mapping);

    expect(event.type).toBe(EventType.TRANSACTION_COMPLETED);
    expect(event.payload.status).toBe('completed');
  });

  it('converts a message row to MESSAGE_CREATED event', () => {
    const mapping = getMappingForTable('messages')!;
    const row = {
      message_id: 'msg-1',
      booking_id: 'booking-1',
      sender_id: 'user-1',
      receiver_id: 'user-2',
      message_type: 'text',
      timestamp: '2026-02-13T12:00:00Z',
    };

    const event = transformRow(row, mapping);

    expect(event.type).toBe(EventType.MESSAGE_CREATED);
    expect(event.payload.message_id).toBe('msg-1');
    expect(event.payload.sender_id).toBe('user-1');
    expect(event.payload.receiver_id).toBe('user-2');
    expect(event.payload.booking_id).toBe('booking-1');
    expect(event.payload.message_type).toBe('text');
  });

  it('converts a rating row to RATING_SUBMITTED event', () => {
    const mapping = getMappingForTable('ratings')!;
    const row = {
      id: 'rating-1',
      reviewer_id: 'user-1',
      reviewee_id: 'provider-1',
      booking_id: 'booking-1',
      rating: '5',
      comment: 'Great service!',
      created_at: '2026-02-13T12:00:00Z',
    };

    const event = transformRow(row, mapping);

    expect(event.type).toBe(EventType.RATING_SUBMITTED);
    expect(event.payload.rating_id).toBe('rating-1');
    expect(event.payload.client_id).toBe('user-1');
    expect(event.payload.provider_id).toBe('provider-1');
    expect(event.payload.booking_id).toBe('booking-1');
    expect(event.payload.score).toBe(5);
    expect(event.payload.comment).toBe('Great service!');
  });

  it('converts a provider row to PROVIDER_REGISTERED event (new)', () => {
    const mapping = getMappingForTable('providers')!;
    const row = {
      provider_id: 'provider-1',
      status: 'active',
      is_kyc_verified: 1,
      is_active: 1,
      total_services: '5',
      completion_rate: '0.95',
      rejection_rate: '0.02',
      total_earnings: '5000',
      wallet_balance: '200',
      created_at: '2026-02-13T12:00:00Z',
      updated_at: '2026-02-13T12:00:00Z', // Same as created_at
    };

    const event = transformRow(row, mapping);

    expect(event.type).toBe(EventType.PROVIDER_REGISTERED);
    expect(event.payload.provider_id).toBe('provider-1');
    expect(event.payload.user_id).toBe('provider-1');
    const meta = event.payload.metadata as Record<string, unknown>;
    expect(meta.is_kyc_verified).toBe(1);
    expect(meta.completion_rate).toBe(0.95);
  });

  it('converts a provider row to PROVIDER_UPDATED event (updated)', () => {
    const mapping = getMappingForTable('providers')!;
    const row = {
      provider_id: 'provider-2',
      status: 'active',
      is_kyc_verified: 1,
      created_at: '2026-02-13T12:00:00Z',
      updated_at: '2026-02-13T14:00:00Z', // 2 hours later
    };

    const event = transformRow(row, mapping);

    expect(event.type).toBe(EventType.PROVIDER_UPDATED);
    expect(event.payload.provider_id).toBe('provider-2');
  });

  it('converts a category row to CATEGORY_CREATED event', () => {
    const mapping = getMappingForTable('categories')!;
    const now = '2026-02-14T12:00:00Z';
    const row = {
      category_id: 'cat-1',
      name: 'Plumbing',
      parent_id: null,
      status: 'active',
      created_at: now,
      updated_at: now,
    };

    const event = transformRow(row, mapping);

    expect(event.type).toBe(EventType.CATEGORY_CREATED);
    expect(event.payload.category_id).toBe('cat-1');
    expect(event.payload.name).toBe('Plumbing');
    expect(event.payload.status).toBe('active');
  });

  it('includes _sync_source metadata in payload', () => {
    const mapping = getMappingForTable('bookings')!;
    const row = {
      booking_id: 'booking-3',
      user_id: 'user-7',
      provider_id: 'provider-3',
      status: 'pending',
      total_amount: '300.00',
      scheduled_time: '2026-02-16T09:00:00Z',
      created_at: '2026-02-13T12:00:00Z',
      updated_at: '2026-02-13T12:00:00Z',
    };

    const event = transformRow(row, mapping);

    expect(event.payload._sync_source).toBe('data_sync');
    expect(event.payload._source_table).toBe('bookings');
    expect(event.payload._source_id).toBe('booking-3');
  });
});

// ─── ensureUserExists ────────────────────────────────────────

describe('ensureUserExists', () => {
  it('creates user when not found', async () => {
    // User does not exist
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // INSERT succeeds (no conflict)
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'user-new' }] });

    const userId = await ensureUserExists('user-new');

    expect(userId).toBe('user-new');
    expect(mockQuery).toHaveBeenCalledTimes(2);

    // Verify INSERT was called
    const insertCall = mockQuery.mock.calls[1];
    expect(insertCall[0]).toContain('INSERT INTO users');
    expect(insertCall[1][0]).toBe('user-new'); // id
    expect(insertCall[1][1]).toBe('user-new'); // external_id
  });

  it('returns existing user ID when found', async () => {
    // User already exists
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'user-existing' }] });

    const userId = await ensureUserExists('user-existing');

    expect(userId).toBe('user-existing');
    expect(mockQuery).toHaveBeenCalledTimes(1);

    // Verify no INSERT was called
    const queries = mockQuery.mock.calls.map(c => c[0]);
    expect(queries.every(q => !q.includes('INSERT'))).toBe(true);
  });
});

// ─── ensureCategoryExists ────────────────────────────────────

describe('ensureCategoryExists', () => {
  it('creates category when not found', async () => {
    // Category does not exist
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // INSERT succeeds
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'cat-uuid' }] });

    const id = await ensureCategoryExists('ext-cat-1', 'Plumbing', null, 'active');

    expect(id).toBeTruthy();
    expect(mockQuery).toHaveBeenCalledTimes(2);
    const insertCall = mockQuery.mock.calls[1];
    expect(insertCall[0]).toContain('INSERT INTO categories');
  });

  it('updates existing category', async () => {
    // Category exists
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'existing-cat-uuid' }] });
    // UPDATE succeeds
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const id = await ensureCategoryExists('ext-cat-1', 'Updated Name', null, 'active');

    expect(id).toBe('existing-cat-uuid');
    expect(mockQuery).toHaveBeenCalledTimes(2);
    const updateCall = mockQuery.mock.calls[1];
    expect(updateCall[0]).toContain('UPDATE categories');
  });
});

// ─── getMappingForTable ──────────────────────────────────────

describe('getMappingForTable', () => {
  it('returns correct mapping for bookings', () => {
    const mapping = getMappingForTable('bookings');
    expect(mapping).toBeDefined();
    expect(mapping?.sourceTable).toBe('bookings');
    expect(mapping?.cursorColumn).toBe('updated_at');
    expect(mapping?.primaryKeyColumn).toBe('booking_id');
  });

  it('returns correct mapping for transactions (was payments)', () => {
    const mapping = getMappingForTable('transactions');
    expect(mapping).toBeDefined();
    expect(mapping?.sourceTable).toBe('transactions');
    expect(mapping?.primaryKeyColumn).toBe('transaction_id');
  });

  it('returns undefined for old payments table name', () => {
    expect(getMappingForTable('payments')).toBeUndefined();
  });

  it('returns correct mapping for messages', () => {
    const mapping = getMappingForTable('messages');
    expect(mapping).toBeDefined();
    expect(mapping?.sourceTable).toBe('messages');
    expect(mapping?.cursorColumn).toBe('timestamp');
  });

  it('returns correct mapping for categories', () => {
    const mapping = getMappingForTable('categories');
    expect(mapping).toBeDefined();
    expect(mapping?.sourceTable).toBe('categories');
    expect(mapping?.primaryKeyColumn).toBe('category_id');
  });

  it('returns correct mapping for ratings', () => {
    const mapping = getMappingForTable('ratings');
    expect(mapping).toBeDefined();
    expect(mapping?.sourceTable).toBe('ratings');
    expect(mapping?.cursorColumn).toBe('created_at');
  });

  it('returns correct mapping for providers', () => {
    const mapping = getMappingForTable('providers');
    expect(mapping).toBeDefined();
    expect(mapping?.sourceTable).toBe('providers');
    expect(mapping?.primaryKeyColumn).toBe('provider_id');
  });

  it('returns undefined for unknown table', () => {
    const mapping = getMappingForTable('unknown_table');
    expect(mapping).toBeUndefined();
  });
});

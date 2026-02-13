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

import { transformRow, ensureUserExists } from '../../src/sync/transformer';
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
      id: 'booking-1',
      client_id: 'user-1',
      provider_id: 'provider-1',
      service_category: 'plumbing',
      amount: '150.00',
      currency: 'USD',
      status: 'pending',
      scheduled_at: '2026-02-15T10:00:00Z',
      created_at: '2026-02-13T12:00:00Z',
      updated_at: '2026-02-13T12:00:00Z',
    };

    const event = transformRow(row, mapping);

    expect(event.type).toBe(EventType.BOOKING_CREATED);
    expect(event.payload.booking_id).toBe('booking-1');
    expect(event.payload.client_id).toBe('user-1');
    expect(event.payload.provider_id).toBe('provider-1');
    expect(event.payload.service_category).toBe('plumbing');
    expect(event.payload.amount).toBe(150);
    expect(event.payload.currency).toBe('USD');
    expect(event.payload.status).toBe('pending');
  });

  it('converts a cancelled booking to BOOKING_CANCELLED event', () => {
    const mapping = getMappingForTable('bookings')!;
    const row = {
      id: 'booking-2',
      client_id: 'user-2',
      provider_id: 'provider-2',
      service_category: 'electrical',
      amount: '200.00',
      currency: 'USD',
      status: 'cancelled',
      scheduled_at: '2026-02-20T14:00:00Z',
      created_at: '2026-02-13T09:00:00Z',
      updated_at: '2026-02-14T10:00:00Z',
    };

    const event = transformRow(row, mapping);

    expect(event.type).toBe(EventType.BOOKING_CANCELLED);
    expect(event.payload.status).toBe('cancelled');
  });

  it('converts a payment row to TRANSACTION_INITIATED event', () => {
    const mapping = getMappingForTable('payments')!;
    const row = {
      id: 'payment-1',
      user_id: 'user-1',
      counterparty_id: 'provider-1',
      amount: '150.00',
      currency: 'USD',
      payment_method: 'credit_card',
      status: 'pending',
      created_at: '2026-02-13T12:00:00Z',
      updated_at: '2026-02-13T12:00:00Z',
    };

    const event = transformRow(row, mapping);

    expect(event.type).toBe(EventType.TRANSACTION_INITIATED);
    expect(event.payload.transaction_id).toBe('payment-1');
    expect(event.payload.user_id).toBe('user-1');
    expect(event.payload.counterparty_id).toBe('provider-1');
    expect(event.payload.amount).toBe(150);
    expect(event.payload.currency).toBe('USD');
    expect(event.payload.payment_method).toBe('credit_card');
    expect(event.payload.status).toBe('pending');
  });

  it('converts a completed payment to TRANSACTION_COMPLETED event', () => {
    const mapping = getMappingForTable('payments')!;
    const row = {
      id: 'payment-2',
      user_id: 'user-2',
      counterparty_id: 'provider-2',
      amount: '200.00',
      currency: 'USD',
      payment_method: 'bank_transfer',
      status: 'completed',
      created_at: '2026-02-13T12:00:00Z',
      updated_at: '2026-02-13T13:00:00Z',
    };

    const event = transformRow(row, mapping);

    expect(event.type).toBe(EventType.TRANSACTION_COMPLETED);
    expect(event.payload.status).toBe('completed');
  });

  it('converts a message row to MESSAGE_CREATED event', () => {
    const mapping = getMappingForTable('messages')!;
    const row = {
      id: 'message-1',
      sender_id: 'user-1',
      receiver_id: 'user-2',
      conversation_id: 'conv-1',
      content: 'Hello, can we meet off-platform?',
      created_at: '2026-02-13T12:00:00Z',
      updated_at: '2026-02-13T12:00:00Z',
    };

    const event = transformRow(row, mapping);

    expect(event.type).toBe(EventType.MESSAGE_CREATED);
    expect(event.payload.message_id).toBe('message-1');
    expect(event.payload.sender_id).toBe('user-1');
    expect(event.payload.receiver_id).toBe('user-2');
    expect(event.payload.conversation_id).toBe('conv-1');
    expect(event.payload.content).toBe('Hello, can we meet off-platform?');
  });

  it('detects message edits (updated_at > created_at)', () => {
    const mapping = getMappingForTable('messages')!;
    const row = {
      id: 'message-2',
      sender_id: 'user-3',
      receiver_id: 'user-4',
      conversation_id: 'conv-2',
      content: 'Edited message content',
      created_at: '2026-02-13T12:00:00Z',
      updated_at: '2026-02-13T12:05:00Z', // 5 minutes later
    };

    const event = transformRow(row, mapping);

    expect(event.type).toBe(EventType.MESSAGE_EDITED);
    expect(event.payload.content).toBe('Edited message content');
  });

  it('converts a rating row to RATING_SUBMITTED event', () => {
    const mapping = getMappingForTable('ratings')!;
    const row = {
      id: 'rating-1',
      client_id: 'user-1',
      provider_id: 'provider-1',
      booking_id: 'booking-1',
      score: '5',
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
      id: 'provider-1',
      user_id: 'user-5',
      service_category: 'plumbing',
      verification_status: 'verified',
      email: 'provider@example.com',
      phone: '+1234567890',
      created_at: '2026-02-13T12:00:00Z',
      updated_at: '2026-02-13T12:00:00Z', // Same as created_at
    };

    const event = transformRow(row, mapping);

    expect(event.type).toBe(EventType.PROVIDER_REGISTERED);
    expect(event.payload.provider_id).toBe('provider-1');
    expect(event.payload.user_id).toBe('user-5');
    expect(event.payload.service_category).toBe('plumbing');
    expect(event.payload.metadata).toMatchObject({
      verification_status: 'verified',
      email: 'provider@example.com',
      phone: '+1234567890',
    });
  });

  it('converts a provider row to PROVIDER_UPDATED event (updated)', () => {
    const mapping = getMappingForTable('providers')!;
    const row = {
      id: 'provider-2',
      user_id: 'user-6',
      service_category: 'electrical',
      verification_status: 'verified',
      email: 'updated@example.com',
      phone: '+0987654321',
      created_at: '2026-02-13T12:00:00Z',
      updated_at: '2026-02-13T14:00:00Z', // 2 hours later
    };

    const event = transformRow(row, mapping);

    expect(event.type).toBe(EventType.PROVIDER_UPDATED);
    expect(event.payload.provider_id).toBe('provider-2');
  });

  it('includes _sync_source metadata in payload', () => {
    const mapping = getMappingForTable('bookings')!;
    const row = {
      id: 'booking-3',
      client_id: 'user-7',
      provider_id: 'provider-3',
      service_category: 'hvac',
      amount: '300.00',
      currency: 'USD',
      status: 'pending',
      scheduled_at: '2026-02-16T09:00:00Z',
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

// ─── getMappingForTable ──────────────────────────────────────

describe('getMappingForTable', () => {
  it('returns correct mapping for bookings', () => {
    const mapping = getMappingForTable('bookings');
    expect(mapping).toBeDefined();
    expect(mapping?.sourceTable).toBe('bookings');
    expect(mapping?.cursorColumn).toBe('updated_at');
    expect(mapping?.primaryKeyColumn).toBe('id');
  });

  it('returns correct mapping for payments', () => {
    const mapping = getMappingForTable('payments');
    expect(mapping).toBeDefined();
    expect(mapping?.sourceTable).toBe('payments');
  });

  it('returns correct mapping for messages', () => {
    const mapping = getMappingForTable('messages');
    expect(mapping).toBeDefined();
    expect(mapping?.sourceTable).toBe('messages');
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
  });

  it('returns undefined for unknown table', () => {
    const mapping = getMappingForTable('unknown_table');
    expect(mapping).toBeUndefined();
  });
});

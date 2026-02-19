// QwickServices CIS — Schema Drift Detection Unit Tests

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────

const mockExternalQuery = vi.fn();
const mockCreateAlert = vi.fn();

vi.mock('../../src/sync/connection', () => ({
  externalQuery: (...args: unknown[]) => mockExternalQuery(...args),
}));

vi.mock('../../src/alerting/index', () => ({
  createAlert: (...args: unknown[]) => mockCreateAlert(...args),
}));

vi.mock('../../src/config', () => ({
  config: {
    sync: {
      db: { name: 'quickservices-db' },
    },
  },
}));

// ─── Imports (after mocks) ──────────────────────────────────

import {
  parseExpectedColumns,
  computeSchemaChecksum,
  validateTableSchema,
  clearSchemaCache,
  ColumnInfo,
} from '../../src/sync/schema-validator';
import { getMappingForTable } from '../../src/sync/mappings';

beforeEach(() => {
  mockExternalQuery.mockReset();
  mockCreateAlert.mockReset();
  clearSchemaCache();
});

// ─── parseExpectedColumns ───────────────────────────────────

describe('parseExpectedColumns', () => {
  it('extracts column names from a simple select string', () => {
    const cols = parseExpectedColumns('id, name, email, created_at');
    expect(cols).toEqual(['id', 'name', 'email', 'created_at']);
  });

  it('handles multiline select strings with whitespace', () => {
    const cols = parseExpectedColumns(`
      id, first_name, last_name, email, user_type, phone_number,
      is_active, is_email_verified, created_at, updated_at
    `);
    expect(cols).toEqual([
      'id', 'first_name', 'last_name', 'email', 'user_type', 'phone_number',
      'is_active', 'is_email_verified', 'created_at', 'updated_at',
    ]);
  });

  it('handles AS aliases by taking the base column name', () => {
    const cols = parseExpectedColumns('id, full_name AS name, email');
    expect(cols).toEqual(['id', 'full_name', 'email']);
  });

  it('returns empty array for empty string', () => {
    const cols = parseExpectedColumns('');
    expect(cols).toEqual([]);
  });

  it('works with real bookings mapping selectColumns', () => {
    const mapping = getMappingForTable('bookings')!;
    const cols = parseExpectedColumns(mapping.selectColumns);
    expect(cols).toContain('id');
    expect(cols).toContain('booking_uid');
    expect(cols).toContain('user_id');
    expect(cols).toContain('provider_id');
    expect(cols).toContain('status');
  });
});

// ─── computeSchemaChecksum ──────────────────────────────────

describe('computeSchemaChecksum', () => {
  it('produces consistent hash for same columns', () => {
    const cols: ColumnInfo[] = [
      { column_name: 'id', data_type: 'bigint' },
      { column_name: 'name', data_type: 'varchar' },
    ];
    const hash1 = computeSchemaChecksum(cols);
    const hash2 = computeSchemaChecksum(cols);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(32); // MD5 hex
  });

  it('produces same hash regardless of input order', () => {
    const cols1: ColumnInfo[] = [
      { column_name: 'name', data_type: 'varchar' },
      { column_name: 'id', data_type: 'bigint' },
    ];
    const cols2: ColumnInfo[] = [
      { column_name: 'id', data_type: 'bigint' },
      { column_name: 'name', data_type: 'varchar' },
    ];
    expect(computeSchemaChecksum(cols1)).toBe(computeSchemaChecksum(cols2));
  });

  it('produces different hash for different columns', () => {
    const cols1: ColumnInfo[] = [{ column_name: 'id', data_type: 'bigint' }];
    const cols2: ColumnInfo[] = [{ column_name: 'id', data_type: 'int' }];
    expect(computeSchemaChecksum(cols1)).not.toBe(computeSchemaChecksum(cols2));
  });
});

// ─── validateTableSchema ────────────────────────────────────

describe('validateTableSchema', () => {
  const bookingsMapping = getMappingForTable('bookings')!;

  it('returns valid when all expected columns exist', async () => {
    const expectedCols = parseExpectedColumns(bookingsMapping.selectColumns);
    mockExternalQuery.mockResolvedValueOnce({
      rows: expectedCols.map(col => ({
        COLUMN_NAME: col,
        DATA_TYPE: 'varchar',
      })),
    });

    const result = await validateTableSchema(bookingsMapping);

    expect(result.valid).toBe(true);
    expect(result.missingColumns).toEqual([]);
    expect(result.sourceTable).toBe('bookings');
    expect(result.cached).toBe(false);
  });

  it('detects missing columns and fires alert', async () => {
    // Return only 'id' — all other expected columns are "missing"
    mockExternalQuery.mockResolvedValueOnce({
      rows: [{ COLUMN_NAME: 'id', DATA_TYPE: 'bigint' }],
    });
    mockCreateAlert.mockResolvedValueOnce('alert-id');

    const result = await validateTableSchema(bookingsMapping);

    expect(result.valid).toBe(false);
    expect(result.missingColumns.length).toBeGreaterThan(0);
    expect(result.missingColumns).toContain('booking_uid');
    expect(result.missingColumns).toContain('user_id');

    // Alert should have been fired
    expect(mockCreateAlert).toHaveBeenCalledTimes(1);
    const alertArg = mockCreateAlert.mock.calls[0][0];
    expect(alertArg.priority).toBe('high');
    expect(alertArg.source).toBe('schema_drift_detector');
    expect(alertArg.user_id).toBe('00000000-0000-0000-0000-000000000000');
    expect(alertArg.title).toContain('bookings');
  });

  it('returns cached result on second call within TTL', async () => {
    const expectedCols = parseExpectedColumns(bookingsMapping.selectColumns);
    mockExternalQuery.mockResolvedValueOnce({
      rows: expectedCols.map(col => ({
        COLUMN_NAME: col,
        DATA_TYPE: 'varchar',
      })),
    });

    // First call — not cached
    const result1 = await validateTableSchema(bookingsMapping);
    expect(result1.valid).toBe(true);
    expect(result1.cached).toBe(false);
    expect(mockExternalQuery).toHaveBeenCalledTimes(1);

    // Second call — should use cache
    const result2 = await validateTableSchema(bookingsMapping);
    expect(result2.valid).toBe(true);
    expect(result2.cached).toBe(true);
    expect(mockExternalQuery).toHaveBeenCalledTimes(1); // No additional query
  });

  it('does not cache invalid results', async () => {
    // First call — missing columns
    mockExternalQuery.mockResolvedValueOnce({
      rows: [{ COLUMN_NAME: 'id', DATA_TYPE: 'bigint' }],
    });
    mockCreateAlert.mockResolvedValueOnce('alert-id');

    const result1 = await validateTableSchema(bookingsMapping);
    expect(result1.valid).toBe(false);

    // Second call — should query again (not cached)
    mockExternalQuery.mockResolvedValueOnce({
      rows: [{ COLUMN_NAME: 'id', DATA_TYPE: 'bigint' }],
    });
    mockCreateAlert.mockResolvedValueOnce('alert-id-2');

    const result2 = await validateTableSchema(bookingsMapping);
    expect(result2.valid).toBe(false);
    expect(mockExternalQuery).toHaveBeenCalledTimes(2);
  });

  it('fails closed on query error', async () => {
    mockExternalQuery.mockRejectedValueOnce(new Error('Connection refused'));

    const result = await validateTableSchema(bookingsMapping);

    expect(result.valid).toBe(false);
    expect(result.checksum).toBe('');
    // No alert fired for connection errors — just fail closed
    expect(mockCreateAlert).not.toHaveBeenCalled();
  });

  it('queries INFORMATION_SCHEMA with SELECT (passes read-only guard)', async () => {
    mockExternalQuery.mockResolvedValueOnce({ rows: [] });
    mockCreateAlert.mockResolvedValueOnce(null);

    await validateTableSchema(bookingsMapping);

    const queryText = mockExternalQuery.mock.calls[0][0] as string;
    expect(queryText.trim().toUpperCase()).toMatch(/^SELECT/);
    expect(queryText).toContain('INFORMATION_SCHEMA.COLUMNS');
  });

  it('identifies extra columns in the actual schema', async () => {
    const expectedCols = parseExpectedColumns(bookingsMapping.selectColumns);
    const rows = [
      ...expectedCols.map(col => ({ COLUMN_NAME: col, DATA_TYPE: 'varchar' })),
      { COLUMN_NAME: 'new_mystery_column', DATA_TYPE: 'text' },
    ];
    mockExternalQuery.mockResolvedValueOnce({ rows });

    const result = await validateTableSchema(bookingsMapping);

    expect(result.valid).toBe(true); // Extra columns don't invalidate
    expect(result.extraColumns).toContain('new_mystery_column');
  });

  it('clearSchemaCache resets the cache', async () => {
    const expectedCols = parseExpectedColumns(bookingsMapping.selectColumns);
    mockExternalQuery.mockResolvedValue({
      rows: expectedCols.map(col => ({
        COLUMN_NAME: col,
        DATA_TYPE: 'varchar',
      })),
    });

    await validateTableSchema(bookingsMapping);
    expect(mockExternalQuery).toHaveBeenCalledTimes(1);

    clearSchemaCache();

    await validateTableSchema(bookingsMapping);
    expect(mockExternalQuery).toHaveBeenCalledTimes(2); // Queried again after clear
  });
});

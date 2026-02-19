// QwickServices CIS — Sync Health Monitor Unit Tests

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────

const mockQuery = vi.fn();
const mockCreateAlert = vi.fn();

vi.mock('../../src/database/connection', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

vi.mock('../../src/alerting/index', () => ({
  createAlert: (...args: unknown[]) => mockCreateAlert(...args),
}));

// ─── Imports (after mocks) ──────────────────────────────────

import {
  quickHealthCheck,
  checkSyncHealth,
  clearAlertDedupState,
} from '../../src/sync/health';
import { SyncResult } from '../../src/sync/poller';

beforeEach(() => {
  mockQuery.mockReset();
  mockCreateAlert.mockReset();
  clearAlertDedupState();
});

// ─── Helper ─────────────────────────────────────────────────

function makeSyncResult(overrides: Partial<SyncResult> = {}): SyncResult {
  return {
    sourceTable: 'bookings',
    recordsFound: 10,
    recordsProcessed: 10,
    recordsFailed: 0,
    eventsEmitted: 10,
    watermarkBefore: '2026-02-18T00:00:00Z',
    watermarkAfter: '2026-02-18T01:00:00Z',
    durationMs: 150,
    errors: [],
    ...overrides,
  };
}

// ─── quickHealthCheck ───────────────────────────────────────

describe('quickHealthCheck', () => {
  it('returns healthy for normal results', () => {
    const results = [makeSyncResult()];
    const { hasIssues, issues } = quickHealthCheck(results);
    expect(hasIssues).toBe(false);
    expect(issues).toHaveLength(0);
  });

  it('detects high error rate (>20%)', () => {
    const results = [makeSyncResult({
      recordsFound: 10,
      recordsProcessed: 7,
      recordsFailed: 3,
    })];
    const { hasIssues, issues } = quickHealthCheck(results);
    expect(hasIssues).toBe(true);
    expect(issues).toHaveLength(1);
    expect(issues[0].anomaly).toBe('high_error_rate');
    expect(issues[0].priority).toBe('high');
  });

  it('uses critical priority for >50% error rate', () => {
    const results = [makeSyncResult({
      recordsFound: 10,
      recordsProcessed: 4,
      recordsFailed: 6,
    })];
    const { issues } = quickHealthCheck(results);
    expect(issues[0].priority).toBe('critical');
  });

  it('detects stalled watermark', () => {
    const results = [makeSyncResult({
      recordsFound: 5,
      watermarkBefore: '2026-02-18T00:00:00Z',
      watermarkAfter: '2026-02-18T00:00:00Z', // Same — stalled
    })];
    const { hasIssues, issues } = quickHealthCheck(results);
    expect(hasIssues).toBe(true);
    expect(issues[0].anomaly).toBe('stalled_watermark');
  });

  it('does not flag stalled watermark when no records found', () => {
    const results = [makeSyncResult({
      recordsFound: 0,
      watermarkBefore: '2026-02-18T00:00:00Z',
      watermarkAfter: '2026-02-18T00:00:00Z',
    })];
    const { hasIssues } = quickHealthCheck(results);
    expect(hasIssues).toBe(false);
  });

  it('handles multiple tables with mixed health', () => {
    const results = [
      makeSyncResult({ sourceTable: 'bookings' }),
      makeSyncResult({
        sourceTable: 'payments',
        recordsFound: 10,
        recordsFailed: 5,
      }),
    ];
    const { hasIssues, issues } = quickHealthCheck(results);
    expect(hasIssues).toBe(true);
    expect(issues).toHaveLength(1);
    expect(issues[0].table).toBe('payments');
  });

  it('handles empty results array', () => {
    const { hasIssues, issues } = quickHealthCheck([]);
    expect(hasIssues).toBe(false);
    expect(issues).toHaveLength(0);
  });
});

// ─── checkSyncHealth ────────────────────────────────────────

describe('checkSyncHealth', () => {
  it('returns healthy report when no anomalies', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          source_table: 'bookings',
          records_found: 10,
          records_processed: 10,
          records_failed: 0,
          watermark_before: '2026-02-18T00:00:00Z',
          watermark_after: '2026-02-18T01:00:00Z',
          error: null,
          duration_ms: 100,
        },
      ],
    });

    const report = await checkSyncHealth();

    expect(report.healthy).toBe(true);
    expect(report.issues).toHaveLength(0);
    expect(report.tables.bookings).toBeDefined();
    expect(report.tables.bookings.errorRate).toBe(0);
    expect(report.tables.bookings.watermarkAdvancing).toBe(true);
  });

  it('detects stalled watermark across many runs', async () => {
    // 12 runs where watermark never advances despite finding records
    const stalledRuns = Array.from({ length: 12 }, () => ({
      source_table: 'users',
      records_found: 5,
      records_processed: 5,
      records_failed: 0,
      watermark_before: '2026-02-18T00:00:00Z',
      watermark_after: '2026-02-18T00:00:00Z',
      error: null,
      duration_ms: 80,
    }));

    mockQuery.mockResolvedValueOnce({ rows: stalledRuns });
    mockCreateAlert.mockResolvedValue('alert-id');

    const report = await checkSyncHealth();

    expect(report.healthy).toBe(false);
    expect(report.issues.some(i => i.anomaly === 'stalled_watermark')).toBe(true);
    expect(report.tables.users.watermarkAdvancing).toBe(false);

    // Alert should have been fired
    expect(mockCreateAlert).toHaveBeenCalled();
    const alertArg = mockCreateAlert.mock.calls[0][0];
    expect(alertArg.source).toBe('sync_health_monitor');
    expect(alertArg.user_id).toBe('00000000-0000-0000-0000-000000000000');
  });

  it('detects high error rate and fires alert', async () => {
    const runs = Array.from({ length: 5 }, () => ({
      source_table: 'payments',
      records_found: 10,
      records_processed: 5,
      records_failed: 5,
      watermark_before: '2026-02-18T00:00:00Z',
      watermark_after: '2026-02-18T01:00:00Z',
      error: 'some error',
      duration_ms: 200,
    }));

    mockQuery.mockResolvedValueOnce({ rows: runs });
    mockCreateAlert.mockResolvedValue('alert-id');

    const report = await checkSyncHealth();

    expect(report.healthy).toBe(false);
    const errorIssue = report.issues.find(i => i.anomaly === 'high_error_rate');
    expect(errorIssue).toBeDefined();
    expect(errorIssue!.table).toBe('payments');
    expect(report.tables.payments.errorRate).toBe(0.5);
  });

  it('uses critical priority for >50% error rate', async () => {
    const runs = Array.from({ length: 3 }, () => ({
      source_table: 'ratings',
      records_found: 10,
      records_processed: 3,
      records_failed: 7,
      watermark_before: '2026-02-18T00:00:00Z',
      watermark_after: '2026-02-18T01:00:00Z',
      error: 'transform error',
      duration_ms: 100,
    }));

    mockQuery.mockResolvedValueOnce({ rows: runs });
    mockCreateAlert.mockResolvedValue('alert-id');

    const report = await checkSyncHealth();

    const errorIssue = report.issues.find(i => i.anomaly === 'high_error_rate');
    expect(errorIssue!.priority).toBe('critical');
  });

  it('dedup suppresses duplicate alerts within 1-hour window', async () => {
    const stalledRuns = Array.from({ length: 12 }, () => ({
      source_table: 'bookings',
      records_found: 5,
      records_processed: 5,
      records_failed: 0,
      watermark_before: '2026-02-18T00:00:00Z',
      watermark_after: '2026-02-18T00:00:00Z',
      error: null,
      duration_ms: 80,
    }));

    mockQuery.mockResolvedValue({ rows: stalledRuns });
    mockCreateAlert.mockResolvedValue('alert-id');

    // First check — alert fires
    await checkSyncHealth();
    expect(mockCreateAlert).toHaveBeenCalledTimes(1);

    // Second check — alert suppressed by dedup
    mockCreateAlert.mockClear();
    await checkSyncHealth();
    expect(mockCreateAlert).not.toHaveBeenCalled();
  });

  it('dedup clears after clearAlertDedupState', async () => {
    const stalledRuns = Array.from({ length: 12 }, () => ({
      source_table: 'bookings',
      records_found: 5,
      records_processed: 5,
      records_failed: 0,
      watermark_before: '2026-02-18T00:00:00Z',
      watermark_after: '2026-02-18T00:00:00Z',
      error: null,
      duration_ms: 80,
    }));

    mockQuery.mockResolvedValue({ rows: stalledRuns });
    mockCreateAlert.mockResolvedValue('alert-id');

    await checkSyncHealth();
    expect(mockCreateAlert).toHaveBeenCalledTimes(1);

    // Clear dedup state
    clearAlertDedupState();
    mockCreateAlert.mockClear();

    // Now alert fires again
    await checkSyncHealth();
    expect(mockCreateAlert).toHaveBeenCalledTimes(1);
  });

  it('handles query error gracefully', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB connection lost'));

    const report = await checkSyncHealth();

    // Should return a degraded report, not throw
    expect(report.healthy).toBe(true); // No issues detected (because query failed)
    expect(report.issues).toHaveLength(0);
    expect(report.checkedAt).toBeDefined();
  });

  it('detects latency spike when latest run exceeds 2x baseline', async () => {
    // 5 normal runs at ~100ms, then 1 slow run at 500ms
    const runs = [
      { source_table: 'bookings', records_found: 10, records_processed: 10, records_failed: 0, watermark_before: 'a', watermark_after: 'f', error: null, duration_ms: 500 },
      { source_table: 'bookings', records_found: 10, records_processed: 10, records_failed: 0, watermark_before: 'a', watermark_after: 'e', error: null, duration_ms: 100 },
      { source_table: 'bookings', records_found: 10, records_processed: 10, records_failed: 0, watermark_before: 'a', watermark_after: 'd', error: null, duration_ms: 100 },
      { source_table: 'bookings', records_found: 10, records_processed: 10, records_failed: 0, watermark_before: 'a', watermark_after: 'c', error: null, duration_ms: 100 },
      { source_table: 'bookings', records_found: 10, records_processed: 10, records_failed: 0, watermark_before: 'a', watermark_after: 'b', error: null, duration_ms: 100 },
    ];

    mockQuery.mockResolvedValueOnce({ rows: runs });
    mockCreateAlert.mockResolvedValue('alert-id');

    const report = await checkSyncHealth();

    const latencyIssue = report.issues.find(i => i.anomaly === 'latency_spike');
    expect(latencyIssue).toBeDefined();
    expect(latencyIssue!.priority).toBe('medium');
    expect(latencyIssue!.metric).toBeGreaterThan(2);
  });
});

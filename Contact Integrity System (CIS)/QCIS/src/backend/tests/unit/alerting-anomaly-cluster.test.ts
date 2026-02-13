// QwickServices CIS — Anomaly & Cluster Alert Consumers Unit Tests

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

import { EventType, DomainEvent } from '../../src/events/types';
import {
  handleAnomalyCheck,
  detectScoreSpike,
  detectSignalBurst,
} from '../../src/alerting/consumers/anomaly';
import {
  handleClusterCheck,
  findConnectedComponent,
} from '../../src/alerting/consumers/cluster';

function makeDomainEvent(type: EventType, payload: Record<string, unknown>): DomainEvent {
  return {
    id: 'evt-' + Math.random().toString(36).slice(2, 10),
    type,
    correlation_id: 'corr-' + Math.random().toString(36).slice(2, 10),
    timestamp: new Date().toISOString(),
    version: 1,
    payload,
  };
}

beforeEach(() => {
  mockQuery.mockReset();
});

// ─── Anomaly Consumer Tests ──────────────────────────────────

describe('detectScoreSpike', () => {
  it('returns anomaly when score jumps >15 points', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ score: '80' }, { score: '60' }],
    });

    const result = await detectScoreSpike('user-1');

    expect(result).toBeDefined();
    expect(result!.anomaly_type).toBe('score_spike');
    expect(result!.severity).toBe('medium');
    expect(result!.metric_name).toBe('risk_score');
    expect(result!.expected_value).toBe(60);
    expect(result!.actual_value).toBe(80);
    expect(result!.deviation_sigma).toBeGreaterThan(2);
  });

  it('returns null for normal score changes', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ score: '65' }, { score: '60' }],
    });

    const result = await detectScoreSpike('user-1');

    expect(result).toBeNull();
  });

  it('returns null when only one score exists', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ score: '80' }],
    });

    const result = await detectScoreSpike('user-1');

    expect(result).toBeNull();
  });
});

describe('detectSignalBurst', () => {
  it('returns anomaly when >5 signals in 1 hour', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ cnt: '8' }],
    });

    const result = await detectSignalBurst('user-1');

    expect(result).toBeDefined();
    expect(result!.anomaly_type).toBe('signal_burst');
    expect(result!.severity).toBe('high');
    expect(result!.metric_name).toBe('signal_count_1h');
    expect(result!.actual_value).toBe(8);
    expect(result!.expected_value).toBe(2.5);
  });

  it('returns null for normal signal rates', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ cnt: '3' }],
    });

    const result = await detectSignalBurst('user-1');

    expect(result).toBeNull();
  });

  it('returns null when count is exactly 5', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ cnt: '5' }],
    });

    const result = await detectSignalBurst('user-1');

    expect(result).toBeNull();
  });
});

describe('handleAnomalyCheck', () => {
  it('skips when no user_id in event', async () => {
    const event = makeDomainEvent(EventType.MESSAGE_CREATED, { some_field: 'value' });

    vi.useFakeTimers();
    const promise = handleAnomalyCheck(event);
    vi.advanceTimersByTime(4000);
    await promise;
    vi.useRealTimers();

    // Should not have queried anything
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('creates alert and logs anomaly when score spike detected', async () => {
    // hasRecentAnomalyAlert: no existing
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // detectScoreSpike: score spike detected
    mockQuery.mockResolvedValueOnce({ rows: [{ score: '78' }, { score: '60' }] });
    // detectSignalBurst: no burst
    mockQuery.mockResolvedValueOnce({ rows: [{ cnt: '2' }] });
    // detectFinancialAnomaly: no transaction data (error case)
    mockQuery.mockRejectedValueOnce(new Error('No transactions table'));
    // logAnomaly INSERT
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // createAlert INSERT
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'alert-1' }] });
    // matchSubscriptions
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // audit log
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const event = makeDomainEvent(EventType.MESSAGE_CREATED, { sender_id: 'user-1' });

    vi.useFakeTimers();
    const promise = handleAnomalyCheck(event);
    vi.advanceTimersByTime(4000);
    await promise;
    vi.useRealTimers();

    // Check that anomaly was logged
    const logCall = mockQuery.mock.calls.find((c: unknown[]) =>
      typeof c[0] === 'string' && c[0].includes('INSERT INTO anomaly_logs')
    );
    expect(logCall).toBeDefined();
    expect(logCall![1]![2]).toBe('score_spike'); // anomaly_type

    // Check that alert was created
    const alertCall = mockQuery.mock.calls.find((c: unknown[]) =>
      typeof c[0] === 'string' && c[0].includes('INSERT INTO alerts')
    );
    expect(alertCall).toBeDefined();
    expect(alertCall![1]![5]).toBe('anomaly'); // source
  });

  it('deduplicates (no duplicate alert in 24h)', async () => {
    // hasRecentAnomalyAlert: existing alert found
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'existing-alert' }] });

    const event = makeDomainEvent(EventType.MESSAGE_CREATED, { sender_id: 'user-1' });

    vi.useFakeTimers();
    const promise = handleAnomalyCheck(event);
    vi.advanceTimersByTime(4000);
    await promise;
    vi.useRealTimers();

    // Should only have checked for existing alert, no INSERT
    const insertCall = mockQuery.mock.calls.find((c: unknown[]) =>
      typeof c[0] === 'string' && c[0].includes('INSERT INTO')
    );
    expect(insertCall).toBeUndefined();
  });

  it('logs to anomaly_logs table with correct fields', async () => {
    // hasRecentAnomalyAlert: no existing
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // detectScoreSpike: no spike
    mockQuery.mockResolvedValueOnce({ rows: [{ score: '65' }, { score: '60' }] });
    // detectSignalBurst: signal burst detected
    mockQuery.mockResolvedValueOnce({ rows: [{ cnt: '7' }] });
    // detectFinancialAnomaly: no data
    mockQuery.mockRejectedValueOnce(new Error('No transactions'));
    // logAnomaly INSERT
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // createAlert INSERT
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'alert-1' }] });
    // matchSubscriptions
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // audit log
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const event = makeDomainEvent(EventType.MESSAGE_CREATED, { sender_id: 'user-1' });

    vi.useFakeTimers();
    const promise = handleAnomalyCheck(event);
    vi.advanceTimersByTime(4000);
    await promise;
    vi.useRealTimers();

    const logCall = mockQuery.mock.calls.find((c: unknown[]) =>
      typeof c[0] === 'string' && c[0].includes('INSERT INTO anomaly_logs')
    );
    expect(logCall).toBeDefined();
    // Verify columns: id, user_id, anomaly_type, severity, metric_name, expected, actual, deviation, context
    expect(logCall![1]).toHaveLength(9);
    expect(logCall![1]![1]).toBe('user-1'); // user_id
    expect(logCall![1]![2]).toBe('signal_burst'); // anomaly_type
    expect(logCall![1]![3]).toBe('high'); // severity
  });
});

// ─── Cluster Consumer Tests ──────────────────────────────────

describe('findConnectedComponent', () => {
  it('returns all members of a cluster', async () => {
    // BFS iteration 1: user-1 connects to user-2, user-3
    mockQuery.mockResolvedValueOnce({
      rows: [
        { user_a_id: 'user-1', user_b_id: 'user-2' },
        { user_a_id: 'user-1', user_b_id: 'user-3' },
      ],
    });
    // BFS iteration 2: user-2 connects to user-4
    mockQuery.mockResolvedValueOnce({
      rows: [{ user_a_id: 'user-2', user_b_id: 'user-4' }],
    });
    // BFS iteration 3: user-3 has no additional connections
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // BFS iteration 4: user-4 has no additional connections
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const component = await findConnectedComponent('user-1');

    expect(component).toHaveLength(4);
    expect(component).toContain('user-1');
    expect(component).toContain('user-2');
    expect(component).toContain('user-3');
    expect(component).toContain('user-4');
  });

  it('returns single member when no connections', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const component = await findConnectedComponent('user-1');

    expect(component).toEqual(['user-1']);
  });

  it('handles bidirectional relationships correctly', async () => {
    // user-1 connects to user-2 (as user_b_id, since user_a_id < user_b_id constraint)
    mockQuery.mockResolvedValueOnce({
      rows: [{ user_a_id: 'user-0', user_b_id: 'user-1' }],
    });
    // user-0 has no additional connections
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const component = await findConnectedComponent('user-1');

    expect(component).toHaveLength(2);
    expect(component).toContain('user-1');
    expect(component).toContain('user-0');
  });
});

describe('handleClusterCheck', () => {
  it('creates critical alert for high-risk cluster', async () => {
    // findConnectedComponent: 5 members
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          { user_a_id: 'user-1', user_b_id: 'user-2' },
          { user_a_id: 'user-1', user_b_id: 'user-3' },
        ],
      })
      .mockResolvedValueOnce({
        rows: [{ user_a_id: 'user-2', user_b_id: 'user-4' }],
      })
      .mockResolvedValueOnce({
        rows: [{ user_a_id: 'user-3', user_b_id: 'user-5' }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    // getUserRiskInfo for 5 members: 3 high-risk, 2 low-risk (60% high-risk)
    mockQuery
      .mockResolvedValueOnce({ rows: [{ tier: 'high', score: '75' }] })
      .mockResolvedValueOnce({ rows: [{ tier: 'critical', score: '88' }] })
      .mockResolvedValueOnce({ rows: [{ tier: 'high', score: '72' }] })
      .mockResolvedValueOnce({ rows: [{ tier: 'low', score: '25' }] })
      .mockResolvedValueOnce({ rows: [{ tier: 'medium', score: '45' }] });

    // hasRecentClusterAlert: no existing
    mockQuery.mockResolvedValueOnce({ rows: [] });

    // createAlert INSERT
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'alert-1' }] });
    // matchSubscriptions
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // audit log
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const event = makeDomainEvent(EventType.USER_REGISTERED, {
      user_id: 'user-1',
    });

    vi.useFakeTimers();
    const promise = handleClusterCheck(event);
    vi.advanceTimersByTime(3000);
    await promise;
    vi.useRealTimers();

    const alertCall = mockQuery.mock.calls.find((c: unknown[]) =>
      typeof c[0] === 'string' && c[0].includes('INSERT INTO alerts')
    );
    expect(alertCall).toBeDefined();
    expect(alertCall![1]![2]).toBe('critical'); // priority
    expect(alertCall![1]![5]).toBe('cluster'); // source
    // Check title contains cluster size
    expect(alertCall![1]![3]).toContain('5 members');
  });

  it('ignores small clusters (<=3)', async () => {
    // findConnectedComponent: 3 members
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ user_a_id: 'user-1', user_b_id: 'user-2' }],
      })
      .mockResolvedValueOnce({
        rows: [{ user_a_id: 'user-2', user_b_id: 'user-3' }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const event = makeDomainEvent(EventType.USER_REGISTERED, { user_id: 'user-1' });

    vi.useFakeTimers();
    const promise = handleClusterCheck(event);
    vi.advanceTimersByTime(3000);
    await promise;
    vi.useRealTimers();

    // Should not create an alert
    const alertCall = mockQuery.mock.calls.find((c: unknown[]) =>
      typeof c[0] === 'string' && c[0].includes('INSERT INTO alerts')
    );
    expect(alertCall).toBeUndefined();
  });

  it('ignores clusters with low risk ratio', async () => {
    // findConnectedComponent: 5 members
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          { user_a_id: 'user-1', user_b_id: 'user-2' },
          { user_a_id: 'user-1', user_b_id: 'user-3' },
        ],
      })
      .mockResolvedValueOnce({
        rows: [{ user_a_id: 'user-2', user_b_id: 'user-4' }],
      })
      .mockResolvedValueOnce({
        rows: [{ user_a_id: 'user-3', user_b_id: 'user-5' }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    // getUserRiskInfo: only 1 high-risk out of 5 (20% risk ratio)
    mockQuery
      .mockResolvedValueOnce({ rows: [{ tier: 'high', score: '75' }] })
      .mockResolvedValueOnce({ rows: [{ tier: 'low', score: '22' }] })
      .mockResolvedValueOnce({ rows: [{ tier: 'monitor', score: '8' }] })
      .mockResolvedValueOnce({ rows: [{ tier: 'low', score: '25' }] })
      .mockResolvedValueOnce({ rows: [{ tier: 'medium', score: '45' }] });

    const event = makeDomainEvent(EventType.RELATIONSHIP_UPDATED, {
      user_a_id: 'user-1',
      user_b_id: 'user-2',
    });

    vi.useFakeTimers();
    const promise = handleClusterCheck(event);
    vi.advanceTimersByTime(3000);
    await promise;
    vi.useRealTimers();

    // Should not create an alert (risk ratio 0.2 <= 0.5)
    const alertCall = mockQuery.mock.calls.find((c: unknown[]) =>
      typeof c[0] === 'string' && c[0].includes('INSERT INTO alerts')
    );
    expect(alertCall).toBeUndefined();
  });

  it('deduplicates cluster alerts', async () => {
    // findConnectedComponent: 4 members
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ user_a_id: 'user-1', user_b_id: 'user-2' }],
      })
      .mockResolvedValueOnce({
        rows: [{ user_a_id: 'user-2', user_b_id: 'user-3' }],
      })
      .mockResolvedValueOnce({
        rows: [{ user_a_id: 'user-3', user_b_id: 'user-4' }],
      })
      .mockResolvedValueOnce({ rows: [] });

    // getUserRiskInfo: 3 high-risk out of 4 (75% risk ratio)
    mockQuery
      .mockResolvedValueOnce({ rows: [{ tier: 'high', score: '75' }] })
      .mockResolvedValueOnce({ rows: [{ tier: 'critical', score: '88' }] })
      .mockResolvedValueOnce({ rows: [{ tier: 'high', score: '72' }] })
      .mockResolvedValueOnce({ rows: [{ tier: 'low', score: '25' }] });

    // hasRecentClusterAlert: existing alert found
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'existing-cluster-alert' }] });

    const event = makeDomainEvent(EventType.PROVIDER_REGISTERED, { provider_id: 'user-1' });

    vi.useFakeTimers();
    const promise = handleClusterCheck(event);
    vi.advanceTimersByTime(3000);
    await promise;
    vi.useRealTimers();

    // Should not create a duplicate alert
    const alertCall = mockQuery.mock.calls.find((c: unknown[]) =>
      typeof c[0] === 'string' && c[0].includes('INSERT INTO alerts')
    );
    expect(alertCall).toBeUndefined();
  });

  it('handles events with no user_id gracefully', async () => {
    const event = makeDomainEvent(EventType.USER_REGISTERED, { some_field: 'value' });

    vi.useFakeTimers();
    const promise = handleClusterCheck(event);
    vi.advanceTimersByTime(3000);
    await promise;
    vi.useRealTimers();

    // Should not have queried anything
    expect(mockQuery).not.toHaveBeenCalled();
  });
});

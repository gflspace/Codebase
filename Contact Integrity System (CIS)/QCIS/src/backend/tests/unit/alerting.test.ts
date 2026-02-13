// QwickServices CIS — Phase 3C: Alerting Engine Unit Tests

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

import {
  computeSlaDeadline,
  escalatePriority,
  matchSubscriptions,
  SLA_DEADLINES,
  createAlert,
} from '../../src/alerting/index';
import { handleThresholdCheck } from '../../src/alerting/consumers/threshold';
import { handleTrendCheck, getSignalVelocity } from '../../src/alerting/consumers/trend';
import { handleLeakageAlert } from '../../src/alerting/consumers/leakage';
import { runSlaEscalation } from '../../src/alerting/sla-escalation';
import { EventType, DomainEvent } from '../../src/events/types';

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

// ─── computeSlaDeadline ──────────────────────────────────────

describe('computeSlaDeadline', () => {
  it('returns 1 hour deadline for critical priority', () => {
    const deadline = computeSlaDeadline('critical');
    const diffMs = deadline.getTime() - Date.now();
    const diffHours = diffMs / (1000 * 60 * 60);
    expect(diffHours).toBeGreaterThan(0.9);
    expect(diffHours).toBeLessThan(1.1);
  });

  it('returns 4 hour deadline for high priority', () => {
    const deadline = computeSlaDeadline('high');
    const diffMs = deadline.getTime() - Date.now();
    const diffHours = diffMs / (1000 * 60 * 60);
    expect(diffHours).toBeGreaterThan(3.9);
    expect(diffHours).toBeLessThan(4.1);
  });

  it('returns 24 hour deadline for medium priority', () => {
    const deadline = computeSlaDeadline('medium');
    const diffMs = deadline.getTime() - Date.now();
    const diffHours = diffMs / (1000 * 60 * 60);
    expect(diffHours).toBeGreaterThan(23.9);
    expect(diffHours).toBeLessThan(24.1);
  });

  it('returns 72 hour deadline for low priority', () => {
    const deadline = computeSlaDeadline('low');
    const diffMs = deadline.getTime() - Date.now();
    const diffHours = diffMs / (1000 * 60 * 60);
    expect(diffHours).toBeGreaterThan(71.9);
    expect(diffHours).toBeLessThan(72.1);
  });

  it('defaults to medium deadline for unknown priority', () => {
    const deadline = computeSlaDeadline('unknown');
    const diffMs = deadline.getTime() - Date.now();
    const diffHours = diffMs / (1000 * 60 * 60);
    expect(diffHours).toBeGreaterThan(23.9);
    expect(diffHours).toBeLessThan(24.1);
  });
});

// ─── SLA_DEADLINES map ──────────────────────────────────────

describe('SLA_DEADLINES', () => {
  it('maps all 4 priority levels', () => {
    expect(SLA_DEADLINES.critical).toBe(1);
    expect(SLA_DEADLINES.high).toBe(4);
    expect(SLA_DEADLINES.medium).toBe(24);
    expect(SLA_DEADLINES.low).toBe(72);
  });
});

// ─── escalatePriority ────────────────────────────────────────

describe('escalatePriority', () => {
  it('escalates low to medium', () => {
    expect(escalatePriority('low')).toBe('medium');
  });

  it('escalates medium to high', () => {
    expect(escalatePriority('medium')).toBe('high');
  });

  it('escalates high to critical', () => {
    expect(escalatePriority('high')).toBe('critical');
  });

  it('keeps critical at critical', () => {
    expect(escalatePriority('critical')).toBe('critical');
  });
});

// ─── matchSubscriptions ─────────────────────────────────────

describe('matchSubscriptions', () => {
  it('returns all enabled subscriptions when no filters set', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 's1', admin_user_id: 'a1', name: 'All alerts', filter_criteria: {}, channels: ['dashboard'], enabled: true },
        { id: 's2', admin_user_id: 'a2', name: 'Critical only', filter_criteria: { priority: ['critical'] }, channels: ['dashboard', 'email'], enabled: true },
      ],
    });

    const matches = await matchSubscriptions({ priority: 'high', source: 'enforcement' });
    // s1 matches (no filters), s2 doesn't match (priority filter: critical only)
    expect(matches).toHaveLength(1);
    expect(matches[0].id).toBe('s1');
  });

  it('matches subscriptions by priority filter', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 's1', admin_user_id: 'a1', name: 'Critical only', filter_criteria: { priority: ['critical'] }, channels: ['dashboard'], enabled: true },
      ],
    });

    const matches = await matchSubscriptions({ priority: 'critical', source: 'threshold' });
    expect(matches).toHaveLength(1);
  });

  it('matches subscriptions by source filter', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 's1', admin_user_id: 'a1', name: 'Threshold alerts', filter_criteria: { source: ['threshold', 'trend'] }, channels: ['dashboard'], enabled: true },
        { id: 's2', admin_user_id: 'a2', name: 'Enforcement only', filter_criteria: { source: ['enforcement'] }, channels: ['dashboard'], enabled: true },
      ],
    });

    const matches = await matchSubscriptions({ priority: 'high', source: 'threshold' });
    expect(matches).toHaveLength(1);
    expect(matches[0].id).toBe('s1');
  });

  it('returns empty array on DB error', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB error'));
    const matches = await matchSubscriptions({ priority: 'high', source: 'enforcement' });
    expect(matches).toEqual([]);
  });
});

// ─── Threshold alert consumer ────────────────────────────────

describe('handleThresholdCheck', () => {
  it('fires alert when score crosses 70 from below', async () => {
    // getRecentScores: current=72, previous=65
    mockQuery.mockResolvedValueOnce({ rows: [{ score: '72' }, { score: '65' }] });
    // hasRecentThresholdAlert: no existing
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // createAlert INSERT
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'alert-1' }] });
    // matchSubscriptions
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // audit log
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const event = makeDomainEvent(EventType.MESSAGE_CREATED, { sender_id: 'user-1' });

    // Override timeout to speed up test
    vi.useFakeTimers();
    const promise = handleThresholdCheck(event);
    vi.advanceTimersByTime(3000);
    await promise;
    vi.useRealTimers();

    // Should have queried for scores
    expect(mockQuery).toHaveBeenCalled();
    // Should have tried to insert an alert
    const insertCall = mockQuery.mock.calls.find((c: unknown[]) =>
      typeof c[0] === 'string' && c[0].includes('INSERT INTO alerts')
    );
    expect(insertCall).toBeDefined();
  });

  it('does not fire when both scores are above threshold (no crossing)', async () => {
    // getRecentScores: current=75, previous=72 — both above 70, no crossing
    mockQuery.mockResolvedValueOnce({ rows: [{ score: '75' }, { score: '72' }] });

    const event = makeDomainEvent(EventType.MESSAGE_CREATED, { sender_id: 'user-1' });

    vi.useFakeTimers();
    const promise = handleThresholdCheck(event);
    vi.advanceTimersByTime(3000);
    await promise;
    vi.useRealTimers();

    // Should NOT have tried to insert an alert
    const insertCall = mockQuery.mock.calls.find((c: unknown[]) =>
      typeof c[0] === 'string' && c[0].includes('INSERT INTO alerts')
    );
    expect(insertCall).toBeUndefined();
  });

  it('does not fire when only 1 score exists (no previous for comparison)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ score: '80' }] });

    const event = makeDomainEvent(EventType.MESSAGE_CREATED, { sender_id: 'user-1' });

    vi.useFakeTimers();
    const promise = handleThresholdCheck(event);
    vi.advanceTimersByTime(3000);
    await promise;
    vi.useRealTimers();

    const insertCall = mockQuery.mock.calls.find((c: unknown[]) =>
      typeof c[0] === 'string' && c[0].includes('INSERT INTO alerts')
    );
    expect(insertCall).toBeUndefined();
  });

  it('does not fire when a recent threshold alert exists (dedup)', async () => {
    // getRecentScores: crosses 70
    mockQuery.mockResolvedValueOnce({ rows: [{ score: '72' }, { score: '65' }] });
    // hasRecentThresholdAlert: existing alert found
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'existing-alert' }] });

    const event = makeDomainEvent(EventType.MESSAGE_CREATED, { sender_id: 'user-1' });

    vi.useFakeTimers();
    const promise = handleThresholdCheck(event);
    vi.advanceTimersByTime(3000);
    await promise;
    vi.useRealTimers();

    const insertCall = mockQuery.mock.calls.find((c: unknown[]) =>
      typeof c[0] === 'string' && c[0].includes('INSERT INTO alerts')
    );
    expect(insertCall).toBeUndefined();
  });
});

// ─── Trend alert consumer ────────────────────────────────────

describe('getSignalVelocity', () => {
  it('returns today count and daily average', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ cnt: '10' }] }) // today
      .mockResolvedValueOnce({ rows: [{ cnt: '24' }] }); // week (6 days)

    const result = await getSignalVelocity('user-1');
    expect(result.todayCount).toBe(10);
    expect(result.dailyAverage).toBe(4); // 24 / 6
  });
});

describe('handleTrendCheck', () => {
  it('fires alert when today > 2x daily average', async () => {
    // getSignalVelocity: today=12, week=18 (avg=3)
    mockQuery
      .mockResolvedValueOnce({ rows: [{ cnt: '12' }] })
      .mockResolvedValueOnce({ rows: [{ cnt: '18' }] });
    // hasRecentTrendAlert: no existing
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // createAlert INSERT
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'alert-1' }] });
    // matchSubscriptions
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // audit log
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const event = makeDomainEvent(EventType.MESSAGE_CREATED, { sender_id: 'user-1' });

    vi.useFakeTimers();
    const promise = handleTrendCheck(event);
    vi.advanceTimersByTime(3000);
    await promise;
    vi.useRealTimers();

    const insertCall = mockQuery.mock.calls.find((c: unknown[]) =>
      typeof c[0] === 'string' && c[0].includes('INSERT INTO alerts')
    );
    expect(insertCall).toBeDefined();
  });

  it('does not fire when today <= 2x daily average', async () => {
    // getSignalVelocity: today=5, week=18 (avg=3), 5 <= 6
    mockQuery
      .mockResolvedValueOnce({ rows: [{ cnt: '5' }] })
      .mockResolvedValueOnce({ rows: [{ cnt: '18' }] });

    const event = makeDomainEvent(EventType.MESSAGE_CREATED, { sender_id: 'user-1' });

    vi.useFakeTimers();
    const promise = handleTrendCheck(event);
    vi.advanceTimersByTime(3000);
    await promise;
    vi.useRealTimers();

    const insertCall = mockQuery.mock.calls.find((c: unknown[]) =>
      typeof c[0] === 'string' && c[0].includes('INSERT INTO alerts')
    );
    expect(insertCall).toBeUndefined();
  });

  it('does not fire when daily average is less than 2', async () => {
    // getSignalVelocity: today=5, week=6 (avg=1)
    mockQuery
      .mockResolvedValueOnce({ rows: [{ cnt: '5' }] })
      .mockResolvedValueOnce({ rows: [{ cnt: '6' }] });

    const event = makeDomainEvent(EventType.MESSAGE_CREATED, { sender_id: 'user-1' });

    vi.useFakeTimers();
    const promise = handleTrendCheck(event);
    vi.advanceTimersByTime(3000);
    await promise;
    vi.useRealTimers();

    const insertCall = mockQuery.mock.calls.find((c: unknown[]) =>
      typeof c[0] === 'string' && c[0].includes('INSERT INTO alerts')
    );
    expect(insertCall).toBeUndefined();
  });
});

// ─── Leakage alert consumer ─────────────────────────────────

describe('handleLeakageAlert', () => {
  it('fires alert when stage reaches confirmation', async () => {
    // createAlert INSERT
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'alert-1' }] });
    // matchSubscriptions
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // audit log
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const event = makeDomainEvent(EventType.LEAKAGE_STAGE_ADVANCED, {
      leakage_event_id: 'leak-1',
      user_id: 'user-1',
      counterparty_id: 'user-2',
      previous_stage: 'attempt',
      new_stage: 'confirmation',
      platform_destination: 'messaging_app',
    });

    await handleLeakageAlert(event);

    const insertCall = mockQuery.mock.calls.find((c: unknown[]) =>
      typeof c[0] === 'string' && c[0].includes('INSERT INTO alerts')
    );
    expect(insertCall).toBeDefined();
  });

  it('does not fire alert for stages other than confirmation', async () => {
    const event = makeDomainEvent(EventType.LEAKAGE_STAGE_ADVANCED, {
      leakage_event_id: 'leak-1',
      user_id: 'user-1',
      previous_stage: 'signal',
      new_stage: 'attempt',
    });

    await handleLeakageAlert(event);

    const insertCall = mockQuery.mock.calls.find((c: unknown[]) =>
      typeof c[0] === 'string' && c[0].includes('INSERT INTO alerts')
    );
    expect(insertCall).toBeUndefined();
  });
});

// ─── SLA escalation ─────────────────────────────────────────

describe('runSlaEscalation', () => {
  it('escalates alerts with breached SLA deadlines', async () => {
    // Query for breached alerts
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 'alert-1',
        user_id: 'user-1',
        priority: 'low',
        status: 'open',
        title: 'Test Alert',
        escalation_count: '0',
      }],
    });
    // UPDATE original alert
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'alert-1' }] });
    // createAlert (child) INSERT
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'alert-child' }] });
    // createAlert matchSubscriptions
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // createAlert audit log
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // SLA escalation audit log
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const count = await runSlaEscalation();
    expect(count).toBe(1);

    // Verify original alert was updated with escalated priority
    const updateCall = mockQuery.mock.calls.find((c: unknown[]) =>
      typeof c[0] === 'string' && c[0].includes('UPDATE alerts')
    );
    expect(updateCall).toBeDefined();
    // New priority should be 'medium' (escalated from 'low')
    expect(updateCall![1]![0]).toBe('medium');
  });

  it('returns 0 when no alerts are breached', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const count = await runSlaEscalation();
    expect(count).toBe(0);
  });
});

// ─── createAlert ─────────────────────────────────────────────

describe('createAlert', () => {
  it('creates an alert with SLA deadline and source', async () => {
    // INSERT alert
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'new-alert' }] });
    // matchSubscriptions
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // audit log
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const alertId = await createAlert({
      user_id: 'user-1',
      priority: 'high',
      title: 'Test Alert',
      description: 'Test description',
      source: 'threshold',
    });

    expect(alertId).toBeTruthy();

    // Verify INSERT was called with correct params
    const insertCall = mockQuery.mock.calls[0];
    expect(insertCall[0]).toContain('INSERT INTO alerts');
    // Check priority (param 3)
    expect(insertCall[1][2]).toBe('high');
    // Check source (param 6)
    expect(insertCall[1][5]).toBe('threshold');
    // Check SLA deadline is set (param 7)
    expect(insertCall[1][6]).toBeTruthy();
  });

  it('returns null on DB error', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const alertId = await createAlert({
      user_id: 'user-1',
      priority: 'high',
      title: 'Test Alert',
      description: 'Test description',
      source: 'threshold',
    });

    expect(alertId).toBeNull();
  });
});

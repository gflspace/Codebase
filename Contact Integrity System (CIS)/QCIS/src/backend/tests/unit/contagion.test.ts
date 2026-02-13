// QwickServices CIS — Contagion Analysis Unit Tests

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.fn();
vi.mock('../../src/database/connection', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

vi.mock('../../src/config', () => ({
  config: { nodeEnv: 'test', logLevel: 'error' },
}));

import { handleContagionEvent, CONTAGION_FACTOR } from '../../src/detection/consumers/contagion';
import { EventType } from '../../src/events/types';

beforeEach(() => { mockQuery.mockReset(); });

function makeEvent(userId: string) {
  return {
    id: '00000000-0000-4000-8000-000000000099',
    type: EventType.MESSAGE_CREATED,
    correlation_id: 'test-corr',
    timestamp: new Date().toISOString(),
    version: 1,
    payload: { sender_id: userId },
  };
}

describe('Contagion Analysis', () => {
  it('creates contagion signals for neighbors of high-risk user', async () => {
    const userId = '00000000-0000-4000-8000-000000000001';
    const neighborId = '00000000-0000-4000-8000-000000000002';

    // User's current score (high)
    mockQuery.mockResolvedValueOnce({ rows: [{ score: '85', tier: 'high' }] });
    // Neighbors
    mockQuery.mockResolvedValueOnce({ rows: [{ user_id: neighborId, strength_score: '0.6' }] });
    // Neighbor's score
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'score-id', score: '30', tier: 'low' }] });
    // Insert signal
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await handleContagionEvent(makeEvent(userId));

    // Verify signal was inserted
    expect(mockQuery).toHaveBeenCalledTimes(4);
    const insertCall = mockQuery.mock.calls[3];
    expect(insertCall[0]).toContain('INSERT INTO risk_signals');
    expect(insertCall[1][2]).toBe('NETWORK_CONTAGION');
  });

  it('skips contagion for low-risk users', async () => {
    const userId = '00000000-0000-4000-8000-000000000001';

    // User's current score (low)
    mockQuery.mockResolvedValueOnce({ rows: [{ score: '20', tier: 'low' }] });

    await handleContagionEvent(makeEvent(userId));

    // Should only have the initial score query
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('skips neighbors with weak connections', async () => {
    const userId = '00000000-0000-4000-8000-000000000001';
    const neighborId = '00000000-0000-4000-8000-000000000002';

    // User's current score (high but moderate)
    mockQuery.mockResolvedValueOnce({ rows: [{ score: '65', tier: 'high' }] });
    // Neighbors with very weak connection
    mockQuery.mockResolvedValueOnce({ rows: [{ user_id: neighborId, strength_score: '0.05' }] });
    // Neighbor score
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'score-id', score: '30', tier: 'low' }] });

    await handleContagionEvent(makeEvent(userId));

    // Delta = 65 * 0.05 * 0.15 = 0.4875 < 1, so should skip
    expect(mockQuery).toHaveBeenCalledTimes(3); // No INSERT call
  });

  it('applies contagion to multiple neighbors', async () => {
    const userId = '00000000-0000-4000-8000-000000000001';

    mockQuery.mockResolvedValueOnce({ rows: [{ score: '90', tier: 'critical' }] });
    mockQuery.mockResolvedValueOnce({
      rows: [
        { user_id: '00000000-0000-4000-8000-000000000002', strength_score: '0.8' },
        { user_id: '00000000-0000-4000-8000-000000000003', strength_score: '0.5' },
      ],
    });
    // Neighbor 1 score + insert
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 's1', score: '25', tier: 'low' }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // Neighbor 2 score + insert
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 's2', score: '40', tier: 'medium' }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await handleContagionEvent(makeEvent(userId));

    // 2 score queries + 2 insert signals = 6 total
    expect(mockQuery).toHaveBeenCalledTimes(6);
  });

  it('does nothing when user has no score', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await handleContagionEvent(makeEvent('00000000-0000-4000-8000-000000000001'));

    expect(mockQuery).toHaveBeenCalledTimes(1);
  });
});

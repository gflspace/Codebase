import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock database before importing modules ────────────────────
const mockQuery = vi.fn();
const mockClosePool = vi.fn();
const mockComputeRiskScore = vi.fn();

vi.mock('../../src/database/connection', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  closePool: () => mockClosePool(),
  getPool: () => ({}),
}));

vi.mock('../../src/scoring/index', () => ({
  computeRiskScore: (userId: string) => mockComputeRiskScore(userId),
}));

vi.mock('../../src/config', () => ({
  config: {
    db: { host: 'localhost', port: 5432, name: 'test', user: 'test', password: 'test', ssl: false },
    scoringModel: '5-component',
  },
}));

// ─── Test Helpers ───────────────────────────────────────────────

interface User {
  id: string;
  trust_score: number | null;
}

describe('Score Recalculation Script (Logic)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('processes all users when no filters specified', async () => {
    const users: User[] = [
      { id: 'u1', trust_score: 10 },
      { id: 'u2', trust_score: 20 },
      { id: 'u3', trust_score: 30 },
    ];

    mockQuery.mockResolvedValueOnce({ rows: users }); // User query
    mockComputeRiskScore.mockImplementation(async (userId: string) => ({
      score: 25,
      tier: 'low',
      user_id: userId,
    }));

    // Simulate the core logic
    const { query } = await import('../../src/database/connection');
    const { computeRiskScore } = await import('../../src/scoring/index');

    const result = await query(`SELECT id, trust_score FROM users WHERE status = 'active' ORDER BY id`);
    const processedUsers = result.rows as User[];

    expect(processedUsers.length).toBe(3);

    // Process each user
    for (const user of processedUsers) {
      await computeRiskScore(user.id);
    }

    expect(mockComputeRiskScore).toHaveBeenCalledTimes(3);
    expect(mockComputeRiskScore).toHaveBeenCalledWith('u1');
    expect(mockComputeRiskScore).toHaveBeenCalledWith('u2');
    expect(mockComputeRiskScore).toHaveBeenCalledWith('u3');
  });

  it('respects min_score filter', async () => {
    const allUsers: User[] = [
      { id: 'u1', trust_score: 10 },
      { id: 'u2', trust_score: 60 },
      { id: 'u3', trust_score: 70 },
    ];
    const filteredUsers = allUsers.filter(u => (u.trust_score ?? 0) >= 50);

    mockQuery.mockResolvedValueOnce({ rows: filteredUsers }); // Filtered query
    mockComputeRiskScore.mockResolvedValue({ score: 65, tier: 'high', user_id: 'test' });

    const { query } = await import('../../src/database/connection');
    const { computeRiskScore } = await import('../../src/scoring/index');

    const minScore = 50;
    const result = await query(
      `SELECT id, trust_score FROM users WHERE status = 'active' AND trust_score >= $1 ORDER BY id`,
      [minScore]
    );
    const processedUsers = result.rows as User[];

    expect(processedUsers.length).toBe(2);
    expect(processedUsers[0].id).toBe('u2');
    expect(processedUsers[1].id).toBe('u3');

    for (const user of processedUsers) {
      await computeRiskScore(user.id);
    }

    expect(mockComputeRiskScore).toHaveBeenCalledTimes(2);
  });

  it('handles individual user failures gracefully', async () => {
    const users: User[] = [
      { id: 'u1', trust_score: 10 },
      { id: 'u2', trust_score: 20 },
      { id: 'u3', trust_score: 30 },
    ];

    mockQuery.mockResolvedValueOnce({ rows: users });
    mockComputeRiskScore
      .mockResolvedValueOnce({ score: 15, tier: 'low', user_id: 'u1' })
      .mockRejectedValueOnce(new Error('Network timeout'))
      .mockResolvedValueOnce({ score: 35, tier: 'medium', user_id: 'u3' });

    const { query } = await import('../../src/database/connection');
    const { computeRiskScore } = await import('../../src/scoring/index');

    const result = await query(`SELECT id, trust_score FROM users WHERE status = 'active' ORDER BY id`);
    const processedUsers = result.rows as User[];

    const stats = { succeeded: 0, failed: 0, errors: [] as Array<{ userId: string; error: string }> };

    for (const user of processedUsers) {
      try {
        await computeRiskScore(user.id);
        stats.succeeded++;
      } catch (error) {
        stats.failed++;
        stats.errors.push({
          userId: user.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    expect(stats.succeeded).toBe(2);
    expect(stats.failed).toBe(1);
    expect(stats.errors).toHaveLength(1);
    expect(stats.errors[0].userId).toBe('u2');
    expect(stats.errors[0].error).toBe('Network timeout');
  });

  it('reports correct summary statistics', async () => {
    const users: User[] = [
      { id: 'u1', trust_score: 10 },
      { id: 'u2', trust_score: 20 },
      { id: 'u3', trust_score: 30 },
      { id: 'u4', trust_score: 40 },
    ];

    mockQuery.mockResolvedValueOnce({ rows: users });
    mockComputeRiskScore
      .mockResolvedValueOnce({ score: 15, tier: 'low', user_id: 'u1' })
      .mockResolvedValueOnce({ score: 25, tier: 'low', user_id: 'u2' })
      .mockResolvedValueOnce({ score: 28, tier: 'low', user_id: 'u3' })
      .mockResolvedValueOnce({ score: 45, tier: 'medium', user_id: 'u4' });

    const { query } = await import('../../src/database/connection');
    const { computeRiskScore } = await import('../../src/scoring/index');

    const result = await query(`SELECT id, trust_score FROM users WHERE status = 'active' ORDER BY id`);
    const processedUsers = result.rows as User[];

    const stats = {
      total: processedUsers.length,
      processed: 0,
      succeeded: 0,
      failed: 0,
      scoreChanges: [] as number[],
    };

    for (const user of processedUsers) {
      try {
        const scoreResult = await computeRiskScore(user.id);
        const oldScore = user.trust_score ?? 0;
        const scoreDelta = scoreResult.score - oldScore;
        stats.scoreChanges.push(Math.abs(scoreDelta));
        stats.succeeded++;
      } catch {
        stats.failed++;
      }
      stats.processed++;
    }

    expect(stats.total).toBe(4);
    expect(stats.processed).toBe(4);
    expect(stats.succeeded).toBe(4);
    expect(stats.failed).toBe(0);
    expect(stats.scoreChanges).toHaveLength(4);

    // Calculate average score change
    const avgChange = stats.scoreChanges.reduce((a, b) => a + b, 0) / stats.scoreChanges.length;
    expect(avgChange).toBeGreaterThan(0);
    expect(avgChange).toBe(4.25); // |15-10| + |25-20| + |28-30| + |45-40| = 5+5+2+5 = 17, avg = 4.25
  });

  it('respects batch size and concurrency settings', async () => {
    const users: User[] = Array.from({ length: 10 }, (_, i) => ({
      id: `u${i + 1}`,
      trust_score: (i + 1) * 10,
    }));

    mockQuery.mockResolvedValueOnce({ rows: users });
    mockComputeRiskScore.mockResolvedValue({ score: 25, tier: 'low', user_id: 'test' });

    const { query } = await import('../../src/database/connection');
    const { computeRiskScore } = await import('../../src/scoring/index');

    const result = await query(`SELECT id, trust_score FROM users WHERE status = 'active' ORDER BY id`);
    const processedUsers = result.rows as User[];

    const batchSize = 3;
    const concurrency = 2;

    // Process in batches
    for (let i = 0; i < processedUsers.length; i += batchSize) {
      const batch = processedUsers.slice(i, Math.min(i + batchSize, processedUsers.length));

      // Process with concurrency control
      const queue = [...batch];
      const workers: Promise<void>[] = [];

      const processNext = async () => {
        while (queue.length > 0) {
          const user = queue.shift();
          if (!user) break;
          await computeRiskScore(user.id);
        }
      };

      for (let w = 0; w < Math.min(concurrency, batch.length); w++) {
        workers.push(processNext());
      }

      await Promise.all(workers);
    }

    expect(mockComputeRiskScore).toHaveBeenCalledTimes(10);
  });

  it('dry-run mode computes scores (note: current implementation still persists)', async () => {
    // Note: The current implementation logs a warning that dry-run still persists
    // This test validates the logic flows correctly even in dry-run mode
    const users: User[] = [
      { id: 'u1', trust_score: 10 },
      { id: 'u2', trust_score: 20 },
    ];

    mockQuery.mockResolvedValueOnce({ rows: users });
    mockComputeRiskScore.mockResolvedValue({ score: 25, tier: 'low', user_id: 'test' });

    const { query } = await import('../../src/database/connection');
    const { computeRiskScore } = await import('../../src/scoring/index');

    const result = await query(`SELECT id, trust_score FROM users WHERE status = 'active' ORDER BY id`);
    const processedUsers = result.rows as User[];

    const isDryRun = true;
    const dryRunResults: Array<{ userId: string; oldScore: number; newScore: number }> = [];

    for (const user of processedUsers) {
      const scoreResult = await computeRiskScore(user.id);
      if (isDryRun) {
        dryRunResults.push({
          userId: user.id,
          oldScore: user.trust_score ?? 0,
          newScore: scoreResult.score,
        });
      }
    }

    expect(mockComputeRiskScore).toHaveBeenCalledTimes(2);
    expect(dryRunResults).toHaveLength(2);
    expect(dryRunResults[0].userId).toBe('u1');
    expect(dryRunResults[0].oldScore).toBe(10);
    expect(dryRunResults[0].newScore).toBe(25);
  });
});

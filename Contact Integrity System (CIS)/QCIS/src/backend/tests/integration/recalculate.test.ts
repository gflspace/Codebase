import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock database and scoring before imports ──────────────────
const mockQuery = vi.fn();
const mockTransaction = vi.fn();
const mockComputeRiskScore = vi.fn();

vi.mock('../../src/database/connection', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  transaction: (fn: (client: unknown) => Promise<unknown>) => mockTransaction(fn),
  getPool: () => ({}),
}));

vi.mock('../../src/scoring/index', () => ({
  computeRiskScore: (userId: string) => mockComputeRiskScore(userId),
}));

vi.mock('../../src/config', () => ({
  config: {
    port: 3099,
    nodeEnv: 'test',
    apiBaseUrl: 'http://localhost:3099',
    db: { host: 'localhost', port: 5432, name: 'test', user: 'test', password: 'test', ssl: false },
    jwt: { secret: 'test-jwt-secret-32-chars-minimum!', expiresIn: '1h' },
    hmac: { secret: 'test-hmac-secret' },
    shadowMode: true,
    enforcementKillSwitch: false,
    scoringModel: '5-component',
    logLevel: 'error',
    dashboardUrl: 'http://localhost:3000',
    openai: { apiKey: '', model: 'gpt-4o-mini' },
  },
}));

import type { Request, Response } from 'express';
import { generateToken } from '../../src/api/middleware/auth';

// ─── Test Helpers ───────────────────────────────────────────────
function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    body: {},
    params: {},
    socket: { remoteAddress: '127.0.0.1' },
    ...overrides,
  } as unknown as Request;
}

function mockRes(): Response & { _status: number; _json: unknown } {
  const res = {
    _status: 200,
    _json: null,
    status(code: number) { res._status = code; return res; },
    json(data: unknown) { res._json = data; return res; },
    set() { return res; },
  };
  return res as unknown as Response & { _status: number; _json: unknown };
}

describe('Admin API — POST /admin/users/recalculate-scores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset timers for setImmediate
    vi.useFakeTimers();
  });

  it('returns 202 and starts recalculation for all users', async () => {
    const token = generateToken({
      id: 'admin1',
      email: 'admin@test.com',
      role: 'super_admin',
      permissions: ['settings.manage_admins'],
    });

    // Mock count query
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '150' }] }); // COUNT query
    // Mock audit log insert
    mockQuery.mockResolvedValueOnce({ rows: [] }); // Audit log

    const req = mockReq({
      headers: { authorization: `Bearer ${token}` },
      body: {},
    });
    req.adminUser = {
      id: 'admin1',
      email: 'admin@test.com',
      role: 'super_admin',
      permissions: ['settings.manage_admins'],
    };

    const res = mockRes();

    // Import route handler
    const router = await import('../../src/api/routes/admin-users');
    const routeHandler = router.default.stack.find(
      (layer: { route?: { path: string; methods: Record<string, boolean> } }) =>
        layer.route?.path === '/recalculate-scores' && layer.route.methods.post
    )?.route.stack.at(-1).handle; // Get the last handler (skip auth, permission, validate middleware)

    await routeHandler(req, res, () => {});

    expect(res._status).toBe(202);
    expect(res._json).toMatchObject({
      status: 'started',
      estimated_users: 150,
      message: expect.stringContaining('background'),
    });

    // Verify audit log was created
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO audit_logs'),
      expect.arrayContaining([
        expect.any(String), // id
        'admin1', // actor
        expect.any(String), // details JSON
        expect.any(String), // ip
      ])
    );
  });

  it('rejects unauthenticated requests (401)', async () => {
    const req = mockReq({
      headers: {}, // No auth header
      body: {},
    });

    const res = mockRes();

    // Import auth middleware
    const { authenticateJWT } = await import('../../src/api/middleware/auth');
    const next = vi.fn();

    authenticateJWT(req, res, next);

    expect(res._status).toBe(401);
    expect(res._json).toMatchObject({ error: expect.stringContaining('authorization') });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects non-admin users (403)', async () => {
    const token = generateToken({
      id: 'user1',
      email: 'user@test.com',
      role: 'ops',
      permissions: ['dashboard.view'], // Missing settings.manage_admins
    });

    const req = mockReq({
      headers: { authorization: `Bearer ${token}` },
      body: {},
    });
    req.adminUser = {
      id: 'user1',
      email: 'user@test.com',
      role: 'ops',
      permissions: ['dashboard.view'],
    };

    const res = mockRes();

    // Import permission middleware
    const { requirePermission } = await import('../../src/api/middleware/auth');
    const next = vi.fn();

    requirePermission('settings.manage_admins')(req, res, next);

    expect(res._status).toBe(403);
    expect(res._json).toMatchObject({ error: expect.stringContaining('permission') });
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts user_ids filter', async () => {
    const token = generateToken({
      id: 'admin1',
      email: 'admin@test.com',
      role: 'super_admin',
      permissions: ['settings.manage_admins'],
    });

    const userIds = ['00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003'];

    // Mock count query with IN clause
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '3' }] });
    // Mock audit log
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const req = mockReq({
      headers: { authorization: `Bearer ${token}` },
      body: { user_ids: userIds },
    });
    req.adminUser = {
      id: 'admin1',
      email: 'admin@test.com',
      role: 'super_admin',
      permissions: ['settings.manage_admins'],
    };

    const res = mockRes();

    // Import route handler
    const router = await import('../../src/api/routes/admin-users');
    const routeHandler = router.default.stack.find(
      (layer: { route?: { path: string; methods: Record<string, boolean> } }) =>
        layer.route?.path === '/recalculate-scores' && layer.route.methods.post
    )?.route.stack.at(-1).handle;

    await routeHandler(req, res, () => {});

    expect(res._status).toBe(202);
    expect(res._json).toMatchObject({
      status: 'started',
      estimated_users: 3,
    });

    // Verify count query used IN clause
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id IN'),
      userIds
    );

    // Verify audit log contains user_ids
    const auditCall = mockQuery.mock.calls.find(call =>
      call[0].includes('INSERT INTO audit_logs')
    );
    expect(auditCall).toBeDefined();
    const auditDetails = JSON.parse(auditCall[1][2]);
    expect(auditDetails.user_ids).toEqual(userIds);
  });

  it('accepts min_score filter', async () => {
    const token = generateToken({
      id: 'admin1',
      email: 'admin@test.com',
      role: 'super_admin',
      permissions: ['settings.manage_admins'],
    });

    const minScore = 50;

    // Mock count query with score filter
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '42' }] });
    // Mock audit log
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const req = mockReq({
      headers: { authorization: `Bearer ${token}` },
      body: { min_score: minScore },
    });
    req.adminUser = {
      id: 'admin1',
      email: 'admin@test.com',
      role: 'super_admin',
      permissions: ['settings.manage_admins'],
    };

    const res = mockRes();

    // Import route handler
    const router = await import('../../src/api/routes/admin-users');
    const routeHandler = router.default.stack.find(
      (layer: { route?: { path: string; methods: Record<string, boolean> } }) =>
        layer.route?.path === '/recalculate-scores' && layer.route.methods.post
    )?.route.stack.at(-1).handle;

    await routeHandler(req, res, () => {});

    expect(res._status).toBe(202);
    expect(res._json).toMatchObject({
      status: 'started',
      estimated_users: 42,
    });

    // Verify count query used score filter
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('trust_score >= $1'),
      [minScore]
    );

    // Verify audit log contains min_score
    const auditCall = mockQuery.mock.calls.find(call =>
      call[0].includes('INSERT INTO audit_logs')
    );
    expect(auditCall).toBeDefined();
    const auditDetails = JSON.parse(auditCall[1][2]);
    expect(auditDetails.min_score).toBe(minScore);
  });

  it('processes users in background after returning 202', async () => {
    const token = generateToken({
      id: 'admin1',
      email: 'admin@test.com',
      role: 'super_admin',
      permissions: ['settings.manage_admins'],
    });

    // Mock initial count
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '2' }] });
    // Mock audit log
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // Mock background user fetch
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'u1' }, { id: 'u2' }],
    });
    // Mock score recalculation
    mockComputeRiskScore
      .mockResolvedValueOnce({ score: 25, tier: 'low', user_id: 'u1' })
      .mockResolvedValueOnce({ score: 55, tier: 'high', user_id: 'u2' });

    const req = mockReq({
      headers: { authorization: `Bearer ${token}` },
      body: {},
    });
    req.adminUser = {
      id: 'admin1',
      email: 'admin@test.com',
      role: 'super_admin',
      permissions: ['settings.manage_admins'],
    };

    const res = mockRes();

    // Import route handler
    const router = await import('../../src/api/routes/admin-users');
    const routeHandler = router.default.stack.find(
      (layer: { route?: { path: string; methods: Record<string, boolean> } }) =>
        layer.route?.path === '/recalculate-scores' && layer.route.methods.post
    )?.route.stack.at(-1).handle;

    await routeHandler(req, res, () => {});

    // Response should be immediate
    expect(res._status).toBe(202);

    // Run background tasks (setImmediate)
    await vi.runAllTimersAsync();

    // Verify background scoring was called
    expect(mockComputeRiskScore).toHaveBeenCalledWith('u1');
    expect(mockComputeRiskScore).toHaveBeenCalledWith('u2');
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';

// ─── Mock database before importing modules that use it ────────
const mockQuery = vi.fn();
vi.mock('../../src/database/connection', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  testConnection: () => Promise.resolve(true),
  getPool: () => ({}),
}));

// Stable config for tests
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
    logLevel: 'error',
    dashboardUrl: 'http://localhost:3000',
    openai: { apiKey: '', model: 'gpt-4o-mini' },
  },
}));

import { authenticateJWT, requirePermission, generateToken } from '../../src/api/middleware/auth';
import type { Request, Response, NextFunction } from 'express';

// ─── Helpers ──────────────────────────────────────────────────
function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    body: {},
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

// ─── Tests ─────────────────────────────────────────────────────

describe('Auth Middleware — authenticateJWT', () => {
  it('rejects requests without Authorization header', () => {
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    authenticateJWT(req, res, next);

    expect(res._status).toBe(401);
    expect(res._json).toEqual({ error: 'Missing or invalid authorization header' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects requests with malformed Authorization header', () => {
    const req = mockReq({ headers: { authorization: 'Basic abc' } });
    const res = mockRes();
    const next = vi.fn();

    authenticateJWT(req, res, next);

    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects expired tokens', () => {
    const token = jwt.sign(
      { id: 'u1', email: 'a@b.com', role: 'ops', permissions: [] },
      'test-jwt-secret-32-chars-minimum!',
      { expiresIn: '-1s' }, // already expired
    );
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = mockRes();
    const next = vi.fn();

    authenticateJWT(req, res, next);

    expect(res._status).toBe(401);
    expect(res._json).toEqual({ error: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects tokens signed with wrong secret', () => {
    const token = jwt.sign(
      { id: 'u1', email: 'a@b.com', role: 'ops', permissions: [] },
      'wrong-secret',
      { expiresIn: '1h' },
    );
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = mockRes();
    const next = vi.fn();

    authenticateJWT(req, res, next);

    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts valid tokens and populates req.adminUser', () => {
    const payload = { id: 'u1', email: 'admin@test.com', role: 'super_admin', permissions: ['alerts.view', 'cases.view'] };
    const token = jwt.sign(payload, 'test-jwt-secret-32-chars-minimum!', { expiresIn: '1h' });
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = mockRes();
    const next = vi.fn();

    authenticateJWT(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.adminUser).toBeDefined();
    expect(req.adminUser!.id).toBe('u1');
    expect(req.adminUser!.email).toBe('admin@test.com');
    expect(req.adminUser!.permissions).toEqual(['alerts.view', 'cases.view']);
  });

  it('defaults permissions to empty array when not in token', () => {
    const token = jwt.sign(
      { id: 'u1', email: 'a@b.com', role: 'ops' },
      'test-jwt-secret-32-chars-minimum!',
      { expiresIn: '1h' },
    );
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = mockRes();
    const next = vi.fn();

    authenticateJWT(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.adminUser!.permissions).toEqual([]);
  });
});

describe('Auth Middleware — requirePermission', () => {
  it('rejects unauthenticated requests (no adminUser)', () => {
    const middleware = requirePermission('alerts.view');
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects when user lacks required permission', () => {
    const middleware = requirePermission('enforcement.reverse');
    const req = mockReq();
    req.adminUser = { id: 'u1', email: 'a@b.com', role: 'auditor', permissions: ['audit_logs.view'] };
    const res = mockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(res._status).toBe(403);
    expect((res._json as Record<string, unknown>).error).toBe('Insufficient permissions');
    expect(next).not.toHaveBeenCalled();
  });

  it('allows when user has all required permissions', () => {
    const middleware = requirePermission('alerts.view', 'cases.view');
    const req = mockReq();
    req.adminUser = { id: 'u1', email: 'a@b.com', role: 'trust_safety', permissions: ['alerts.view', 'cases.view', 'alerts.action'] };
    const res = mockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res._status).toBe(200); // unchanged
  });

  it('rejects when user has some but not all required permissions', () => {
    const middleware = requirePermission('alerts.view', 'enforcement.reverse');
    const req = mockReq();
    req.adminUser = { id: 'u1', email: 'a@b.com', role: 'ops', permissions: ['alerts.view'] };
    const res = mockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(res._status).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('Token Generation', () => {
  it('generates a valid JWT with embedded permissions', () => {
    const user = { id: 'u1', email: 'admin@test.com', role: 'super_admin', permissions: ['alerts.view', 'cases.view'] };
    const token = generateToken(user);

    expect(typeof token).toBe('string');

    const decoded = jwt.verify(token, 'test-jwt-secret-32-chars-minimum!') as Record<string, unknown>;
    expect(decoded.id).toBe('u1');
    expect(decoded.email).toBe('admin@test.com');
    expect(decoded.role).toBe('super_admin');
    expect(decoded.permissions).toEqual(['alerts.view', 'cases.view']);
    expect(decoded.exp).toBeDefined();
  });

  it('produces tokens that authenticateJWT accepts', () => {
    const user = { id: 'u2', email: 'ops@test.com', role: 'ops_monitor', permissions: ['overview.view'] };
    const token = generateToken(user);

    const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = mockRes();
    const next = vi.fn();

    authenticateJWT(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.adminUser!.id).toBe('u2');
    expect(req.adminUser!.permissions).toEqual(['overview.view']);
  });
});

describe('Permission Resolution (resolvePermissions)', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('merges role permissions with overrides', async () => {
    const { resolvePermissions } = await import('../../src/api/middleware/permissions');

    // First call: role_permissions
    mockQuery.mockResolvedValueOnce({
      rows: [
        { permission: 'alerts.view' },
        { permission: 'cases.view' },
        { permission: 'overview.view' },
      ],
    });
    // Second call: admin_permission_overrides
    mockQuery.mockResolvedValueOnce({
      rows: [
        { permission: 'enforcement.reverse', granted: true },  // add
        { permission: 'cases.view', granted: false },           // remove
      ],
    });

    const perms = await resolvePermissions('u1', 'custom');

    expect(perms).toContain('alerts.view');
    expect(perms).toContain('overview.view');
    expect(perms).toContain('enforcement.reverse');
    expect(perms).not.toContain('cases.view');
  });
});

describe('Account Lockout Logic', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('blocks login when account is locked', async () => {
    // Import fresh to avoid stale state
    const express = await import('express');
    const app = express.default();
    app.use(express.default.json());

    const { default: authRoutes } = await import('../../src/api/routes/auth');
    app.use('/api/auth', authRoutes);

    // Mock: user is locked for 10 more minutes
    const futureDate = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 'u1', email: 'locked@test.com', name: 'Locked', role: 'ops',
        password_hash: '$2a$12$fakehash', active: true,
        force_password_change: false, failed_login_attempts: 5,
        locked_until: futureDate,
      }],
    });

    // Use native fetch against a temporary server
    const server = app.listen(0);
    const port = (server.address() as { port: number }).port;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'locked@test.com', password: 'anything' }),
      });

      expect(res.status).toBe(423);
      const body = await res.json();
      expect(body.error).toMatch(/Account locked/);
    } finally {
      server.close();
    }
  });

  it('blocks login when account is deactivated', async () => {
    const express = await import('express');
    const app = express.default();
    app.use(express.default.json());

    const { default: authRoutes } = await import('../../src/api/routes/auth');
    app.use('/api/auth', authRoutes);

    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 'u1', email: 'disabled@test.com', name: 'Disabled', role: 'ops',
        password_hash: '$2a$12$fakehash', active: false,
        force_password_change: false, failed_login_attempts: 0,
        locked_until: null,
      }],
    });

    const server = app.listen(0);
    const port = (server.address() as { port: number }).port;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'disabled@test.com', password: 'anything' }),
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Account is deactivated');
    } finally {
      server.close();
    }
  });
});

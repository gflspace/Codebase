// QwickServices CIS — Layer 9: Admin Rules API Integration Tests

import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import {
  mockQuery, resetAllMocks, createTestApp, startServer, stopServer,
  authHeaders, OPS_USER, uuid, SUPER_ADMIN,
} from '../helpers/setup';
import adminRulesRoutes from '../../src/api/routes/admin-rules';
import http from 'http';

const app = createTestApp();
app.use('/api/admin/rules', adminRulesRoutes);

let server: http.Server;
let port: number;

beforeAll(async () => {
  const s = await startServer(app);
  server = s.server;
  port = s.port;
});
afterAll(() => stopServer(server));
beforeEach(() => resetAllMocks());

const RULE_BODY = {
  name: 'High Score Enforcement',
  description: 'Block users with score >= 80',
  rule_type: 'enforcement_trigger',
  trigger_event_types: ['message.created', 'booking.created'],
  conditions: { all: [{ field: 'score', operator: 'gte', value: 80 }] },
  actions: [{ type: 'create_enforcement', action_type: 'temporary_restriction' }],
  priority: 50,
  enabled: true,
  dry_run: false,
};

const RULE_ROW = {
  id: uuid(100),
  name: RULE_BODY.name,
  description: RULE_BODY.description,
  rule_type: RULE_BODY.rule_type,
  trigger_event_types: RULE_BODY.trigger_event_types,
  conditions: RULE_BODY.conditions,
  actions: RULE_BODY.actions,
  priority: RULE_BODY.priority,
  enabled: true,
  dry_run: false,
  created_by: uuid(1),
  version: 1,
  previous_version_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ─── CRUD ─────────────────────────────────────────────────────

describe('POST /api/admin/rules', () => {
  it('creates a rule and returns it', async () => {
    // INSERT returning
    mockQuery.mockResolvedValueOnce({ rows: [RULE_ROW] });
    // Audit log
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await fetch(`http://127.0.0.1:${port}/api/admin/rules`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(RULE_BODY),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.name).toBe(RULE_BODY.name);
    expect(body.data.rule_type).toBe('enforcement_trigger');
    expect(body.data.version).toBe(1);
  });

  it('validates — rejects empty actions array', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/admin/rules`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ ...RULE_BODY, actions: [] }),
    });

    expect(res.status).toBe(400);
  });

  it('validates — rejects missing conditions', async () => {
    const { conditions, ...noConditions } = RULE_BODY;
    const res = await fetch(`http://127.0.0.1:${port}/api/admin/rules`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(noConditions),
    });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/admin/rules', () => {
  it('lists rules (paginated)', async () => {
    // data query
    mockQuery.mockResolvedValueOnce({ rows: [RULE_ROW] });
    // count query
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '1' }] });

    const res = await fetch(`http://127.0.0.1:${port}/api/admin/rules`, {
      headers: authHeaders(),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.pagination).toBeDefined();
    expect(body.pagination.total).toBe(1);
  });
});

describe('GET /api/admin/rules/:id', () => {
  it('returns a single rule', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [RULE_ROW] });

    const res = await fetch(`http://127.0.0.1:${port}/api/admin/rules/${uuid(100)}`, {
      headers: authHeaders(),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(uuid(100));
    expect(body.data.name).toBe(RULE_BODY.name);
  });

  it('returns 404 for non-existent rule', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await fetch(`http://127.0.0.1:${port}/api/admin/rules/${uuid(999)}`, {
      headers: authHeaders(),
    });

    expect(res.status).toBe(404);
  });
});

describe('PUT /api/admin/rules/:id', () => {
  it('creates new version, disables old', async () => {
    // Fetch existing
    mockQuery.mockResolvedValueOnce({ rows: [RULE_ROW] });
    // Disable old
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // Insert new version
    mockQuery.mockResolvedValueOnce({
      rows: [{
        ...RULE_ROW,
        id: uuid(101),
        name: 'Updated Name',
        version: 2,
        previous_version_id: uuid(100),
      }],
    });
    // Audit log
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await fetch(`http://127.0.0.1:${port}/api/admin/rules/${uuid(100)}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ name: 'Updated Name' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.version).toBe(2);
    expect(body.data.previous_version_id).toBe(uuid(100));
    expect(body.data.name).toBe('Updated Name');
  });

  it('returns 404 for non-existent rule', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await fetch(`http://127.0.0.1:${port}/api/admin/rules/${uuid(999)}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ name: 'Updated' }),
    });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/admin/rules/:id', () => {
  it('soft-disables rule', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: uuid(100) }] });
    // Audit log
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await fetch(`http://127.0.0.1:${port}/api/admin/rules/${uuid(100)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted).toBe(true);
  });

  it('returns 404 for non-existent rule', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await fetch(`http://127.0.0.1:${port}/api/admin/rules/${uuid(999)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });

    expect(res.status).toBe(404);
  });
});

// ─── Auth Enforcement ────────────────────────────────────────

describe('Auth enforcement', () => {
  it('rejects unauthenticated GET request', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/admin/rules`);
    expect(res.status).toBe(401);
  });

  it('rejects unauthenticated POST request', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/admin/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(RULE_BODY),
    });
    expect(res.status).toBe(401);
  });

  it('rejects ops user without rules.manage for POST', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/admin/rules`, {
      method: 'POST',
      headers: authHeaders(OPS_USER),
      body: JSON.stringify(RULE_BODY),
    });
    expect(res.status).toBe(403);
  });

  it('rejects ops user without rules.view for GET', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/admin/rules`, {
      headers: authHeaders(OPS_USER),
    });
    expect(res.status).toBe(403);
  });
});

// ─── History & Matches ───────────────────────────────────────

describe('GET /api/admin/rules/:id/history', () => {
  it('returns version chain', async () => {
    // First version (current)
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: uuid(101), name: 'Rule v2', version: 2, enabled: true, dry_run: false,
        priority: 50, created_by: uuid(1), previous_version_id: uuid(100),
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }],
    });
    // Previous version
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: uuid(100), name: 'Rule v1', version: 1, enabled: false, dry_run: false,
        priority: 50, created_by: uuid(1), previous_version_id: null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }],
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/admin/rules/${uuid(101)}/history`, {
      headers: authHeaders(),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.data[0].version).toBe(2);
    expect(body.data[1].version).toBe(1);
  });
});

describe('GET /api/admin/rules/:id/matches', () => {
  it('returns match log entries', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: uuid(200), rule_id: uuid(100), user_id: uuid(10), event_type: 'message.created', matched: true, dry_run: false, context_snapshot: {}, actions_executed: [], created_at: new Date().toISOString() },
        { id: uuid(201), rule_id: uuid(100), user_id: uuid(11), event_type: 'booking.created', matched: false, dry_run: false, context_snapshot: {}, actions_executed: null, created_at: new Date().toISOString() },
      ],
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/admin/rules/${uuid(100)}/matches`, {
      headers: authHeaders(),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.data[0].matched).toBe(true);
  });
});

describe('POST /api/admin/rules/:id/test', () => {
  it('returns match count and samples', async () => {
    // Load rule
    mockQuery.mockResolvedValueOnce({ rows: [RULE_ROW] });
    // Recent scored users
    mockQuery.mockResolvedValueOnce({
      rows: [
        { user_id: uuid(10), score: '85', tier: 'high' },
        { user_id: uuid(11), score: '30', tier: 'low' },
      ],
    });
    // buildRuleContext queries for user 1 (signal count + user data)
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '2' }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ user_type: 'client', service_category: null }] });
    // buildRuleContext queries for user 2
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ user_type: 'client', service_category: null }] });

    const res = await fetch(`http://127.0.0.1:${port}/api/admin/rules/${uuid(100)}/test`, {
      method: 'POST',
      headers: authHeaders(),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.total).toBe(2);
    // User with score 85 should match (>= 80), user with 30 should not
    expect(body.data.matches).toBe(1);
    expect(body.data.sample_matches).toHaveLength(1);
    expect(body.data.sample_matches[0].score).toBe(85);
  });
});

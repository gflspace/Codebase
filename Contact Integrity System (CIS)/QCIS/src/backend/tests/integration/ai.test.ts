import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import {
  mockQuery,
  createTestApp,
  startServer,
  stopServer,
  authHeaders,
  SUPER_ADMIN,
  OPS_USER,
  resetAllMocks,
  uuid,
} from '../helpers/setup';
import http from 'http';

// Mock OpenAI service before importing routes
const mockGenerateRiskSummary = vi.fn();
const mockAnalyzeAppeal = vi.fn();
const mockDetectPatterns = vi.fn();
const mockGeneratePredictiveAlert = vi.fn();

vi.mock('../../src/services/openai', () => ({
  generateRiskSummary: (...a: unknown[]) => mockGenerateRiskSummary(...a),
  analyzeAppeal: (...a: unknown[]) => mockAnalyzeAppeal(...a),
  detectPatterns: (...a: unknown[]) => mockDetectPatterns(...a),
  generatePredictiveAlert: (...a: unknown[]) => mockGeneratePredictiveAlert(...a),
}));

// Import config to override apiKey in tests
import { config } from '../../src/config';

// Import routes after mocks are set up
import aiRoutes from '../../src/api/routes/ai';

const app = createTestApp();
app.use('/api/ai', aiRoutes);

let server: http.Server;
let port: number;

beforeAll(async () => {
  const s = await startServer(app);
  server = s.server;
  port = s.port;
});

afterAll(() => stopServer(server));

beforeEach(() => {
  resetAllMocks();
  mockGenerateRiskSummary.mockClear();
  mockAnalyzeAppeal.mockClear();
  mockDetectPatterns.mockClear();
  mockGeneratePredictiveAlert.mockClear();
  // Restore default OpenAI API key for tests (empty by default in setup.ts)
  // @ts-expect-error - Overriding readonly config for test
  config.openai.apiKey = '';
});

describe('POST /api/ai/risk-summary', () => {
  it('returns 503 when OpenAI API key is empty', async () => {
    // OpenAI API key is already '' from setup.ts mock
    const res = await fetch(`http://127.0.0.1:${port}/api/ai/risk-summary`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ user_id: uuid(1) }),
    });
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.error).toContain('OpenAI API key not configured');
  });

  it('returns 400 when user_id is missing', async () => {
    // @ts-expect-error - Overriding readonly config for test
    config.openai.apiKey = 'test-key-123';

    const res = await fetch(`http://127.0.0.1:${port}/api/ai/risk-summary`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({}),
    });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('user_id is required');
  });

  it('returns 404 when user not found in DB', async () => {
    // @ts-expect-error - Overriding readonly config for test
    config.openai.apiKey = 'test-key-123';

    mockQuery.mockResolvedValueOnce({ rows: [] }); // User query returns empty

    const res = await fetch(`http://127.0.0.1:${port}/api/ai/risk-summary`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ user_id: uuid(999) }),
    });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe('User not found');
  });

  it('returns AI summary with valid user data', async () => {
    // @ts-expect-error - Overriding readonly config for test
    config.openai.apiKey = 'test-key-123';

    // Mock DB responses: user, alert count, case count, enforcement count, signals
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            display_name: 'Alice',
            trust_score: 65.5,
            status: 'active',
            user_type: 'provider',
            service_category: 'cleaning',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ count: '3' }] }) // alert count
      .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // case count
      .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // enforcement count
      .mockResolvedValueOnce({
        rows: [{ signal_type: 'rapid_contact_change' }, { signal_type: 'geo_anomaly' }],
      }); // signals

    mockGenerateRiskSummary.mockResolvedValueOnce({
      summary: 'User shows moderate risk with recent alerts.',
      risk_level: 'medium',
      recommendations: ['Monitor account', 'Review recent activity'],
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/ai/risk-summary`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ user_id: uuid(1) }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual({
      summary: 'User shows moderate risk with recent alerts.',
      risk_level: 'medium',
      recommendations: ['Monitor account', 'Review recent activity'],
    });

    expect(mockGenerateRiskSummary).toHaveBeenCalledWith({
      display_name: 'Alice',
      trust_score: 65.5,
      status: 'active',
      user_type: 'provider',
      service_category: 'cleaning',
      alert_count: 3,
      case_count: 1,
      enforcement_count: 0,
      signals: ['rapid_contact_change', 'geo_anomaly'],
    });
  });

  it('returns 401 without JWT token', async () => {
    // @ts-expect-error - Overriding readonly config for test
    config.openai.apiKey = 'test-key-123';

    const res = await fetch(`http://127.0.0.1:${port}/api/ai/risk-summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: uuid(1) }),
    });

    expect(res.status).toBe(401);
  });

  it('returns 403 when user lacks alerts.ai_summary permission', async () => {
    // @ts-expect-error - Overriding readonly config for test
    config.openai.apiKey = 'test-key-123';

    const res = await fetch(`http://127.0.0.1:${port}/api/ai/risk-summary`, {
      method: 'POST',
      headers: authHeaders({ ...OPS_USER, permissions: ['overview.view'] }),
      body: JSON.stringify({ user_id: uuid(1) }),
    });

    expect(res.status).toBe(403);
  });
});

describe('POST /api/ai/appeal-analysis', () => {
  it('returns 503 when OpenAI API key is empty', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/ai/appeal-analysis`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ appeal_id: uuid(1) }),
    });
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.error).toContain('OpenAI API key not configured');
  });

  it('returns 400 when appeal_id is missing', async () => {
    // @ts-expect-error - Overriding readonly config for test
    config.openai.apiKey = 'test-key-123';

    const res = await fetch(`http://127.0.0.1:${port}/api/ai/appeal-analysis`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({}),
    });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('appeal_id is required');
  });

  it('returns 404 when appeal not found', async () => {
    // @ts-expect-error - Overriding readonly config for test
    config.openai.apiKey = 'test-key-123';

    mockQuery.mockResolvedValueOnce({ rows: [] }); // Appeal query returns empty

    const res = await fetch(`http://127.0.0.1:${port}/api/ai/appeal-analysis`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ appeal_id: uuid(999) }),
    });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe('Appeal not found');
  });

  it('returns AI analysis with valid appeal data', async () => {
    // @ts-expect-error - Overriding readonly config for test
    config.openai.apiKey = 'test-key-123';

    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            user_id: uuid(1),
            display_name: 'Bob',
            reason: 'Mistaken identity',
            action_type: 'warning',
            enforcement_reason: 'Suspicious activity',
            trust_score: 72.5,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] }); // Prior violations

    mockAnalyzeAppeal.mockResolvedValueOnce({
      recommendation: 'approve',
      reasoning: 'Valid justification with clean history.',
      confidence: 0.85,
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/ai/appeal-analysis`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ appeal_id: uuid(1) }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual({
      recommendation: 'approve',
      reasoning: 'Valid justification with clean history.',
      confidence: 0.85,
    });

    expect(mockAnalyzeAppeal).toHaveBeenCalledWith({
      user_name: 'Bob',
      appeal_reason: 'Mistaken identity',
      enforcement_type: 'warning',
      enforcement_reason: 'Suspicious activity',
      trust_score: 72.5,
      prior_violations: 0,
    });
  });

  it('handles OpenAI service failure gracefully', async () => {
    // @ts-expect-error - Overriding readonly config for test
    config.openai.apiKey = 'test-key-123';

    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            user_id: uuid(1),
            display_name: 'Charlie',
            reason: 'Test',
            action_type: 'suspension',
            enforcement_reason: 'Test',
            trust_score: 50.0,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ count: '2' }] });

    mockAnalyzeAppeal.mockRejectedValueOnce(new Error('OpenAI API failure'));

    const res = await fetch(`http://127.0.0.1:${port}/api/ai/appeal-analysis`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ appeal_id: uuid(1) }),
    });

    expect(res.status).toBe(500);
  });

  it('returns 401 without auth', async () => {
    // @ts-expect-error - Overriding readonly config for test
    config.openai.apiKey = 'test-key-123';

    const res = await fetch(`http://127.0.0.1:${port}/api/ai/appeal-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appeal_id: uuid(1) }),
    });

    expect(res.status).toBe(401);
  });

  it('returns 403 when user lacks appeals.ai_analysis permission', async () => {
    // @ts-expect-error - Overriding readonly config for test
    config.openai.apiKey = 'test-key-123';

    const res = await fetch(`http://127.0.0.1:${port}/api/ai/appeal-analysis`, {
      method: 'POST',
      headers: authHeaders({ ...OPS_USER, permissions: ['overview.view'] }),
      body: JSON.stringify({ appeal_id: uuid(1) }),
    });

    expect(res.status).toBe(403);
  });
});

describe('POST /api/ai/pattern-detection', () => {
  it('returns 503 when OpenAI API key is empty', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/ai/pattern-detection`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({}),
    });
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.error).toContain('OpenAI API key not configured');
  });

  it('returns patterns from recent alerts and signals', async () => {
    // @ts-expect-error - Overriding readonly config for test
    config.openai.apiKey = 'test-key-123';

    mockQuery
      .mockResolvedValueOnce({
        rows: [
          { priority: 'high', title: 'Suspicious activity', category: 'cleaning' },
          { priority: 'medium', title: 'Contact change', category: 'plumbing' },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { signal_type: 'rapid_contact_change', confidence: 0.8 },
          { signal_type: 'geo_anomaly', confidence: 0.75 },
        ],
      });

    mockDetectPatterns.mockResolvedValueOnce({
      patterns: [
        {
          pattern: 'Repeated contact changes in cleaning category',
          severity: 'medium',
          details: '5 providers changed contact info',
        },
      ],
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/ai/pattern-detection`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({}),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.patterns).toHaveLength(1);
    expect(body.data.patterns[0]).toMatchObject({
      pattern: 'Repeated contact changes in cleaning category',
      severity: 'medium',
    });
  });

  it('returns empty patterns when no data exists', async () => {
    // @ts-expect-error - Overriding readonly config for test
    config.openai.apiKey = 'test-key-123';

    mockQuery.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] });

    mockDetectPatterns.mockResolvedValueOnce({ patterns: [] });

    const res = await fetch(`http://127.0.0.1:${port}/api/ai/pattern-detection`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({}),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.patterns).toEqual([]);
  });

  it('returns 401 without auth', async () => {
    // @ts-expect-error - Overriding readonly config for test
    config.openai.apiKey = 'test-key-123';

    const res = await fetch(`http://127.0.0.1:${port}/api/ai/pattern-detection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(401);
  });

  it('returns 403 when user lacks risk.ai_patterns permission', async () => {
    // @ts-expect-error - Overriding readonly config for test
    config.openai.apiKey = 'test-key-123';

    const res = await fetch(`http://127.0.0.1:${port}/api/ai/pattern-detection`, {
      method: 'POST',
      headers: authHeaders({ ...OPS_USER, permissions: ['overview.view'] }),
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(403);
  });
});

describe('POST /api/ai/predictive-alert', () => {
  it('returns 503 when OpenAI API key is empty', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/ai/predictive-alert`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ user_id: uuid(1) }),
    });
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.error).toContain('OpenAI API key not configured');
  });

  it('returns 400 when user_id is missing', async () => {
    // @ts-expect-error - Overriding readonly config for test
    config.openai.apiKey = 'test-key-123';

    const res = await fetch(`http://127.0.0.1:${port}/api/ai/predictive-alert`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({}),
    });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('user_id is required');
  });

  it('returns 404 when user not found', async () => {
    // @ts-expect-error - Overriding readonly config for test
    config.openai.apiKey = 'test-key-123';

    mockQuery.mockResolvedValueOnce({ rows: [] }); // User not found

    const res = await fetch(`http://127.0.0.1:${port}/api/ai/predictive-alert`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ user_id: uuid(999) }),
    });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe('User not found');
  });

  it('returns prediction with valid user data', async () => {
    // @ts-expect-error - Overriding readonly config for test
    config.openai.apiKey = 'test-key-123';

    mockQuery
      .mockResolvedValueOnce({ rows: [{ display_name: 'Dana', trust_score: 58.0 }] })
      .mockResolvedValueOnce({ rows: [{ trend: 'declining' }] })
      .mockResolvedValueOnce({
        rows: [{ signal_type: 'rapid_contact_change' }, { signal_type: 'geo_anomaly' }],
      })
      .mockResolvedValueOnce({ rows: [{ action_type: 'warning' }] });

    mockGeneratePredictiveAlert.mockResolvedValueOnce({
      likelihood: 0.72,
      predicted_violation: 'Contact information manipulation',
      timeframe: '14 days',
      reasoning: 'Trust score declining with multiple suspicious signals.',
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/ai/predictive-alert`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ user_id: uuid(1) }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual({
      likelihood: 0.72,
      predicted_violation: 'Contact information manipulation',
      timeframe: '14 days',
      reasoning: 'Trust score declining with multiple suspicious signals.',
    });

    expect(mockGeneratePredictiveAlert).toHaveBeenCalledWith({
      user_name: 'Dana',
      trust_score: 58.0,
      trend: 'declining',
      recent_signals: ['rapid_contact_change', 'geo_anomaly'],
      enforcement_history: ['warning'],
    });
  });

  it('returns 401 without auth', async () => {
    // @ts-expect-error - Overriding readonly config for test
    config.openai.apiKey = 'test-key-123';

    const res = await fetch(`http://127.0.0.1:${port}/api/ai/predictive-alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: uuid(1) }),
    });

    expect(res.status).toBe(401);
  });

  it('returns 403 when user lacks risk.ai_predictive permission', async () => {
    // @ts-expect-error - Overriding readonly config for test
    config.openai.apiKey = 'test-key-123';

    const res = await fetch(`http://127.0.0.1:${port}/api/ai/predictive-alert`, {
      method: 'POST',
      headers: authHeaders({ ...OPS_USER, permissions: ['overview.view'] }),
      body: JSON.stringify({ user_id: uuid(1) }),
    });

    expect(res.status).toBe(403);
  });
});

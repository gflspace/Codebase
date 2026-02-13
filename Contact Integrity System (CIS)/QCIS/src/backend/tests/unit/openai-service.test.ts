import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock config before importing service
vi.mock('../../src/config', () => ({
  config: {
    openai: { apiKey: 'test-key-abc123', model: 'gpt-4o-mini' },
  },
}));

import { generateRiskSummary, analyzeAppeal, detectPatterns, generatePredictiveAlert } from '../../src/services/openai';

describe('OpenAI Service — generateRiskSummary', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns valid summary, risk_level, recommendations from OpenAI response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                summary: 'User shows elevated risk due to recent alerts.',
                risk_level: 'high',
                recommendations: ['Monitor account activity', 'Review recent transactions'],
              }),
            },
          },
        ],
      }),
    });

    const result = await generateRiskSummary({
      display_name: 'Alice',
      trust_score: 45.0,
      status: 'active',
      user_type: 'provider',
      service_category: 'cleaning',
      alert_count: 3,
      case_count: 1,
      enforcement_count: 0,
      signals: ['rapid_contact_change', 'suspicious_pattern'],
    });

    expect(result).toEqual({
      summary: 'User shows elevated risk due to recent alerts.',
      risk_level: 'high',
      recommendations: ['Monitor account activity', 'Review recent transactions'],
    });
  });

  it('redacts email addresses before sending to API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ summary: 'OK', risk_level: 'low', recommendations: [] }) } }],
      }),
    });

    await generateRiskSummary({
      display_name: 'test@example.com',
      trust_score: 80.0,
      status: 'active',
      user_type: 'customer',
      alert_count: 0,
      case_count: 0,
      enforcement_count: 0,
      signals: [],
    });

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.messages[1].content).toContain('[EMAIL]');
    expect(callBody.messages[1].content).not.toContain('test@example.com');
  });

  it('redacts phone numbers before sending to API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ summary: 'OK', risk_level: 'low', recommendations: [] }) } }],
      }),
    });

    await generateRiskSummary({
      display_name: 'User with 555-123-4567',
      trust_score: 80.0,
      status: 'active',
      user_type: 'customer',
      alert_count: 0,
      case_count: 0,
      enforcement_count: 0,
      signals: [],
    });

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.messages[1].content).toContain('[PHONE]');
    expect(callBody.messages[1].content).not.toContain('555-123-4567');
  });

  it('redacts SSNs before sending to API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ summary: 'OK', risk_level: 'low', recommendations: [] }) } }],
      }),
    });

    await generateRiskSummary({
      display_name: 'User 123-45-6789',
      trust_score: 80.0,
      status: 'active',
      user_type: 'customer',
      alert_count: 0,
      case_count: 0,
      enforcement_count: 0,
      signals: [],
    });

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.messages[1].content).toContain('[SSN]');
    expect(callBody.messages[1].content).not.toContain('123-45-6789');
  });

  it('returns fallback on 500 API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });

    const result = await generateRiskSummary({
      display_name: 'Test',
      trust_score: 70.0,
      status: 'active',
      user_type: 'customer',
      alert_count: 0,
      case_count: 0,
      enforcement_count: 0,
      signals: [],
    });

    expect(result).toEqual({
      summary: 'AI analysis unavailable. Review user data manually.',
      risk_level: 'unknown',
      recommendations: ['Manual review recommended'],
    });
  });

  it('returns fallback on 503 API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: async () => 'Service Unavailable',
    });

    const result = await generateRiskSummary({
      display_name: 'Test',
      trust_score: 70.0,
      status: 'active',
      user_type: 'customer',
      alert_count: 0,
      case_count: 0,
      enforcement_count: 0,
      signals: [],
    });

    expect(result.risk_level).toBe('unknown');
  });

  it('returns fallback on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

    const result = await generateRiskSummary({
      display_name: 'Test',
      trust_score: 70.0,
      status: 'active',
      user_type: 'customer',
      alert_count: 0,
      case_count: 0,
      enforcement_count: 0,
      signals: [],
    });

    expect(result.risk_level).toBe('unknown');
    expect(result.summary).toBe('AI analysis unavailable. Review user data manually.');
  });

  it('returns fallback on malformed JSON from API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'not valid json' } }],
      }),
    });

    const result = await generateRiskSummary({
      display_name: 'Test',
      trust_score: 70.0,
      status: 'active',
      user_type: 'customer',
      alert_count: 0,
      case_count: 0,
      enforcement_count: 0,
      signals: [],
    });

    expect(result.risk_level).toBe('unknown');
  });

  it('sends correct model name from config', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ summary: 'OK', risk_level: 'low', recommendations: [] }) } }],
      }),
    });

    await generateRiskSummary({
      display_name: 'Test',
      trust_score: 70.0,
      status: 'active',
      user_type: 'customer',
      alert_count: 0,
      case_count: 0,
      enforcement_count: 0,
      signals: [],
    });

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.model).toBe('gpt-4o-mini');
  });

  it('uses temperature 0.3 and response_format json_object', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ summary: 'OK', risk_level: 'low', recommendations: [] }) } }],
      }),
    });

    await generateRiskSummary({
      display_name: 'Test',
      trust_score: 70.0,
      status: 'active',
      user_type: 'customer',
      alert_count: 0,
      case_count: 0,
      enforcement_count: 0,
      signals: [],
    });

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.temperature).toBe(0.3);
    expect(callBody.response_format).toEqual({ type: 'json_object' });
  });

  it('sends Authorization header with Bearer token', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ summary: 'OK', risk_level: 'low', recommendations: [] }) } }],
      }),
    });

    await generateRiskSummary({
      display_name: 'Test',
      trust_score: 70.0,
      status: 'active',
      user_type: 'customer',
      alert_count: 0,
      case_count: 0,
      enforcement_count: 0,
      signals: [],
    });

    expect(mockFetch.mock.calls[0][1].headers.Authorization).toBe('Bearer test-key-abc123');
  });
});

describe('OpenAI Service — analyzeAppeal', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns recommendation, reasoning, confidence from API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                recommendation: 'approve',
                reasoning: 'User has valid justification and clean history.',
                confidence: 0.85,
              }),
            },
          },
        ],
      }),
    });

    const result = await analyzeAppeal({
      user_name: 'Bob',
      appeal_reason: 'Was mistakenly flagged',
      enforcement_type: 'warning',
      enforcement_reason: 'Suspicious activity',
      trust_score: 75.0,
      prior_violations: 0,
    });

    expect(result).toEqual({
      recommendation: 'approve',
      reasoning: 'User has valid justification and clean history.',
      confidence: 0.85,
    });
  });

  it('maps "deny" recommendation correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                recommendation: 'deny',
                reasoning: 'Multiple prior violations.',
                confidence: 0.9,
              }),
            },
          },
        ],
      }),
    });

    const result = await analyzeAppeal({
      user_name: 'Charlie',
      appeal_reason: 'Request reconsideration',
      enforcement_type: 'suspension',
      enforcement_reason: 'Policy violation',
      trust_score: 30.0,
      prior_violations: 3,
    });

    expect(result.recommendation).toBe('deny');
  });

  it('maps "escalate" recommendation correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                recommendation: 'escalate',
                reasoning: 'Ambiguous case requiring human review.',
                confidence: 0.5,
              }),
            },
          },
        ],
      }),
    });

    const result = await analyzeAppeal({
      user_name: 'Dana',
      appeal_reason: 'Complicated situation',
      enforcement_type: 'restriction',
      enforcement_reason: 'Complex violation',
      trust_score: 60.0,
      prior_violations: 1,
    });

    expect(result.recommendation).toBe('escalate');
  });

  it('returns "escalate" fallback on error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await analyzeAppeal({
      user_name: 'Eve',
      appeal_reason: 'Test',
      enforcement_type: 'warning',
      enforcement_reason: 'Test',
      trust_score: 70.0,
      prior_violations: 0,
    });

    expect(result).toEqual({
      recommendation: 'escalate',
      reasoning: 'AI analysis unavailable. Manual review required.',
      confidence: 0,
    });
  });
});

describe('OpenAI Service — detectPatterns', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns patterns array from API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                patterns: [
                  {
                    pattern: 'Repeated contact changes in cleaning category',
                    severity: 'medium',
                    details: '5 providers changed emails within 7 days',
                  },
                  {
                    pattern: 'High volume of suspicious_pattern signals',
                    severity: 'high',
                    details: '12 signals detected in last week',
                  },
                ],
              }),
            },
          },
        ],
      }),
    });

    const result = await detectPatterns({
      alerts: [
        { priority: 'high', title: 'Suspicious activity', category: 'cleaning' },
        { priority: 'medium', title: 'Contact change', category: 'cleaning' },
      ],
      signals: [
        { signal_type: 'rapid_contact_change', confidence: 0.8 },
        { signal_type: 'suspicious_pattern', confidence: 0.75 },
      ],
    });

    expect(result.patterns).toHaveLength(2);
    expect(result.patterns[0]).toMatchObject({
      pattern: 'Repeated contact changes in cleaning category',
      severity: 'medium',
    });
  });

  it('returns empty patterns on error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API failure'));

    const result = await detectPatterns({
      alerts: [],
      signals: [],
    });

    expect(result).toEqual({ patterns: [] });
  });

  it('handles empty alerts/signals input', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ patterns: [] }) } }],
      }),
    });

    const result = await detectPatterns({
      alerts: [],
      signals: [],
    });

    expect(result).toEqual({ patterns: [] });
  });
});

describe('OpenAI Service — generatePredictiveAlert', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns likelihood, predicted_violation, timeframe, reasoning', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                likelihood: 0.75,
                predicted_violation: 'Contact information change attempt',
                timeframe: '7 days',
                reasoning: 'Trust score declining with recent suspicious signals.',
              }),
            },
          },
        ],
      }),
    });

    const result = await generatePredictiveAlert({
      user_name: 'Frank',
      trust_score: 55.0,
      trend: 'declining',
      recent_signals: ['rapid_contact_change', 'geo_anomaly'],
      enforcement_history: ['warning'],
    });

    expect(result).toEqual({
      likelihood: 0.75,
      predicted_violation: 'Contact information change attempt',
      timeframe: '7 days',
      reasoning: 'Trust score declining with recent suspicious signals.',
    });
  });

  it('returns zero-confidence fallback on error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await generatePredictiveAlert({
      user_name: 'Grace',
      trust_score: 70.0,
      trend: 'stable',
      recent_signals: [],
      enforcement_history: [],
    });

    expect(result).toEqual({
      likelihood: 0,
      predicted_violation: 'Analysis unavailable',
      timeframe: 'N/A',
      reasoning: 'AI analysis unavailable.',
    });
  });
});

describe('OpenAI Service — Error Handling', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handles rate limiting (429 response)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => 'Rate limit exceeded',
    });

    const result = await generateRiskSummary({
      display_name: 'Test',
      trust_score: 70.0,
      status: 'active',
      user_type: 'customer',
      alert_count: 0,
      case_count: 0,
      enforcement_count: 0,
      signals: [],
    });

    expect(result.risk_level).toBe('unknown');
    expect(result.summary).toBe('AI analysis unavailable. Review user data manually.');
  });

  it('handles API timeout', async () => {
    mockFetch.mockImplementationOnce(
      () => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 100))
    );

    const result = await generateRiskSummary({
      display_name: 'Test',
      trust_score: 70.0,
      status: 'active',
      user_type: 'customer',
      alert_count: 0,
      case_count: 0,
      enforcement_count: 0,
      signals: [],
    });

    expect(result.risk_level).toBe('unknown');
  });
});

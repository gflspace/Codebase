// QwickServices CIS Dashboard — API Client

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

interface ApiOptions {
  method?: string;
  body?: unknown;
  token?: string;
}

async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// Auth
export const login = (email: string, password: string) =>
  request<{ token: string; user: { id: string; email: string; name: string; role: string } }>('/auth/login', { method: 'POST', body: { email, password } });

export const getMe = (token: string) =>
  request<{ user: { id: string; email: string; role: string } }>('/auth/me', { token });

// Health
export const getHealth = () =>
  request<{ status: string; shadowMode: boolean; database: string }>('/health');

// Alerts
export const getAlerts = (token: string, params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return request<{ data: unknown[]; pagination: unknown }>(`/alerts${qs}`, { token });
};

export const updateAlert = (token: string, id: string, data: unknown) =>
  request<{ data: unknown }>(`/alerts/${id}`, { method: 'PATCH', body: data, token });

// Cases
export const getCases = (token: string, params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return request<{ data: unknown[]; pagination: unknown }>(`/cases${qs}`, { token });
};

export const getCase = (token: string, id: string) =>
  request<{ data: unknown }>(`/cases/${id}`, { token });

export const createCase = (token: string, data: unknown) =>
  request<{ data: unknown }>('/cases', { method: 'POST', body: data, token });

export const updateCase = (token: string, id: string, data: unknown) =>
  request<{ data: unknown }>(`/cases/${id}`, { method: 'PATCH', body: data, token });

export const addCaseNote = (token: string, caseId: string, content: string) =>
  request<{ data: unknown }>(`/cases/${caseId}/notes`, { method: 'POST', body: { content }, token });

// Users
export const getUsers = (token: string, params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return request<{ data: unknown[]; pagination: unknown }>(`/users${qs}`, { token });
};

export const getUser = (token: string, id: string) =>
  request<{ data: unknown }>(`/users/${id}`, { token });

// Risk Scores
export const getRiskScores = (token: string, params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return request<{ data: unknown[]; pagination: unknown }>(`/risk-scores${qs}`, { token });
};

export const getUserRiskScore = (token: string, userId: string) =>
  request<{ data: unknown }>(`/risk-scores/user/${userId}`, { token });

// Risk Signals
export const getRiskSignals = (token: string, params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return request<{ data: unknown[]; pagination: unknown }>(`/risk-signals${qs}`, { token });
};

// Enforcement Actions
export const getEnforcementActions = (token: string, params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return request<{ data: unknown[]; pagination: unknown }>(`/enforcement-actions${qs}`, { token });
};

export const reverseEnforcementAction = (token: string, id: string, reason: string) =>
  request<{ data: unknown }>(`/enforcement-actions/${id}/reverse`, { method: 'POST', body: { reason }, token });

// Audit Logs
export const getAuditLogs = (token: string, params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return request<{ data: unknown[]; pagination: unknown }>(`/audit-logs${qs}`, { token });
};

// Appeals
export const getAppeals = (token: string, params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return request<{ data: unknown[]; pagination: unknown }>(`/appeals${qs}`, { token });
};

export const resolveAppeal = (token: string, id: string, data: { status: string; resolution_notes: string }) =>
  request<{ data: unknown }>(`/appeals/${id}/resolve`, { method: 'POST', body: data, token });

// Events
export const submitEvent = (token: string, event: unknown) =>
  request<{ accepted: boolean; event_id: string }>('/events', { method: 'POST', body: event, token });

// ─── Stats Endpoints ──────────────────────────────────────────

export const getOverviewStats = (token: string) =>
  request<{ data: { alerts: Record<string, string>; cases: Record<string, string>; enforcements: Record<string, string>; risk: Record<string, string> } }>('/stats/overview', { token });

export const getCategoryStats = (token: string) =>
  request<{ data: Array<{ category: string; alert_count: string; case_count: string; enforcement_count: string; avg_trust_score: string }> }>('/stats/by-category', { token });

export const getCriticalityStats = (token: string) =>
  request<{ data: { alerts_by_priority: Array<{ priority: string; count: string }>; enforcements_by_type: Array<{ action_type: string; count: string }> } }>('/stats/by-criticality', { token });

export const getTrendStats = (token: string) =>
  request<{ data: { alerts: Array<{ date: string; count: string }>; cases: Array<{ date: string; count: string }>; enforcements: Array<{ date: string; count: string }> } }>('/stats/trends', { token });

// ─── AI Endpoints ─────────────────────────────────────────────

export const getRiskSummary = (token: string, userId: string) =>
  request<{ data: { summary: string; risk_level: string; recommendations: string[] } }>('/ai/risk-summary', { method: 'POST', body: { user_id: userId }, token });

export const analyzeAppealAI = (token: string, appealId: string) =>
  request<{ data: { recommendation: string; reasoning: string; confidence: number } }>('/ai/appeal-analysis', { method: 'POST', body: { appeal_id: appealId }, token });

export const detectPatterns = (token: string) =>
  request<{ data: { patterns: Array<{ pattern: string; severity: string; details: string }> } }>('/ai/pattern-detection', { method: 'POST', body: {}, token });

export const getPredictiveAlert = (token: string, userId: string) =>
  request<{ data: { likelihood: number; predicted_violation: string; timeframe: string; reasoning: string } }>('/ai/predictive-alert', { method: 'POST', body: { user_id: userId }, token });

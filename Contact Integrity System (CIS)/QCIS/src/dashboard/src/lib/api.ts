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
    // Auto-logout on 401 (expired/invalid token)
    if (res.status === 401 && token) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cis-auth-expired'));
      }
    }
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// Auth
export const login = (email: string, password: string) =>
  request<{
    token: string;
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      permissions: string[];
      force_password_change: boolean;
    };
  }>('/auth/login', { method: 'POST', body: { email, password } });

export const getMe = (token: string) =>
  request<{ user: { id: string; email: string; role: string; permissions: string[] } }>('/auth/me', { token });

// Health
export const getHealth = () =>
  request<{ status: string; uptime: number; shadowMode: boolean; database: string }>('/health');

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

// ─── Stats V2 Endpoints (Intelligence Dashboard) ────────────────

export interface KPIMetric {
  value: number;
  previous: number;
  sparkline: number[];
  status: 'green' | 'amber' | 'red';
  tooltip: string;
}

export interface KPIData {
  active_users: KPIMetric;
  active_providers: KPIMetric;
  messages_sent: KPIMetric;
  transactions_completed: KPIMetric;
  off_platform_signals: KPIMetric;
  failed_transactions: KPIMetric;
  open_alerts: KPIMetric;
  trust_score_index: KPIMetric;
}

export interface TimelinePoint {
  timestamp: string;
  messages: number;
  transactions_initiated: number;
  transactions_completed: number;
  risk_signals: number;
  enforcement_actions: number;
}

export const getKPIStats = (token: string, params: Record<string, string>) => {
  const qs = '?' + new URLSearchParams(params).toString();
  return request<{ data: KPIData }>(`/stats/v2/kpi${qs}`, { token });
};

export const getTimelineStats = (token: string, params: Record<string, string>) => {
  const qs = '?' + new URLSearchParams(params).toString();
  return request<{ data: TimelinePoint[] }>(`/stats/v2/timeline${qs}`, { token });
};

// ─── Admin Management Endpoints ──────────────────────────────────

export interface AdminUserData {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  permissions: string[];
  permission_overrides?: Array<{ permission: string; granted: boolean }>;
  force_password_change: boolean;
  last_login_at: string | null;
  last_login_ip: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  action_count_30d?: number;
}

export interface RoleData {
  role: string;
  permissions: string[];
}

export interface PermissionData {
  key: string;
  label: string;
  description: string;
  category: string;
  is_critical: boolean;
}

export const getAdminUsers = (token: string) =>
  request<{ data: AdminUserData[] }>('/admin/users', { token });

export const getAdminUser = (token: string, id: string) =>
  request<{ data: AdminUserData }>(`/admin/users/${id}`, { token });

export const createAdminUser = (token: string, data: {
  email: string;
  name: string;
  password: string;
  role: string;
  force_password_change?: boolean;
  permission_overrides?: Array<{ permission: string; granted: boolean }>;
}) =>
  request<{ data: AdminUserData }>('/admin/users', { method: 'POST', body: data, token });

export const updateAdminUser = (token: string, id: string, data: {
  name?: string;
  role?: string;
  active?: boolean;
  permission_overrides?: Array<{ permission: string; granted: boolean }>;
}) =>
  request<{ data: AdminUserData }>(`/admin/users/${id}`, { method: 'PATCH', body: data, token });

export const resetAdminPassword = (token: string, id: string, newPassword: string) =>
  request<{ data: { message: string; admin: { id: string; email: string; name: string } } }>(
    `/admin/users/${id}/reset-password`,
    { method: 'POST', body: { new_password: newPassword }, token }
  );

export const getAdminRoles = (token: string) =>
  request<{ data: { roles: RoleData[]; permissions: PermissionData[] } }>('/admin/roles', { token });

// ─── Signal Breakdown (Phase 2D) ────────────────────────────────

export interface SignalDomainCount {
  total: number;
  types: Record<string, number>;
}

export interface SignalBreakdownData {
  domains: Record<string, SignalDomainCount>;
  timeSeries: Record<string, Array<{ timestamp: string; count: number }>>;
}

export const getSignalBreakdown = (token: string, params: Record<string, string>) => {
  const qs = '?' + new URLSearchParams(params).toString();
  return request<{ data: SignalBreakdownData }>(`/stats/v2/signal-breakdown${qs}`, { token });
};

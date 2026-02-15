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

// Raw fetch with auth header (for components that need Response directly)
export async function fetchWithAuth(token: string, path: string): Promise<Response> {
  const url = path.startsWith('/api') ? `${API_BASE}${path.slice(4)}` : `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cis-auth-expired'));
    }
    throw new Error(`HTTP ${res.status}`);
  }
  return res;
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

// ─── Leakage Funnel (Phase 3A) ───────────────────────────────────

export interface LeakageFunnelData {
  signal: number;
  attempt: number;
  confirmation: number;
  leakage: number;
}

export interface LeakageDestination {
  platform: string;
  count: number;
}

export const getLeakageFunnel = (token: string, params: Record<string, string>) => {
  const qs = '?' + new URLSearchParams(params).toString();
  return request<{ data: LeakageFunnelData }>(`/intelligence/leakage/funnel${qs}`, { token });
};

export const getLeakageDestinations = (token: string) =>
  request<{ data: LeakageDestination[] }>('/intelligence/leakage/destinations', { token });

// ─── Network Graph (Phase 3A) ────────────────────────────────────

export interface NetworkNode {
  id: string;
  display_name: string;
  user_type: string;
  status: string;
  trust_score: number | null;
}

export interface NetworkEdge {
  id: string;
  user_a_id: string;
  user_b_id: string;
  relationship_type: string;
  interaction_count: number;
  total_value: number;
  strength_score: number;
}

export interface NetworkData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

export const getUserNetwork = (token: string, userId: string, depth: number = 1) =>
  request<{ data: NetworkData }>(`/intelligence/network/${userId}?depth=${depth}`, { token });

// ─── Evaluation Stats (Phase 3B) ────────────────────────────────

export interface EvaluationStatsData {
  decision_time_series: Array<{ timestamp: string; allow: number; flag: number; block: number }>;
  by_action_type: Record<string, { allow: number; flag: number; block: number }>;
  latency: { p50: number; p95: number; p99: number; max: number; total: number };
}

export const getEvaluationStats = (token: string, params: Record<string, string>) => {
  const qs = '?' + new URLSearchParams(params).toString();
  return request<{ data: EvaluationStatsData }>(`/stats/v2/evaluation-stats${qs}`, { token });
};

// ─── Alert Subscriptions (Layer 8) ──────────────────────────────

export interface AlertSubscriptionData {
  id: string;
  admin_user_id: string;
  name: string;
  filter_criteria: {
    priority?: string[];
    source?: string[];
    category?: string[];
    user_type?: string[];
  };
  channels: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export const getAlertSubscriptions = (token: string) =>
  request<{ data: AlertSubscriptionData[] }>('/alert-subscriptions', { token });

export const createAlertSubscription = (token: string, data: {
  name: string;
  filter_criteria: Record<string, unknown>;
  channels?: string[];
  enabled?: boolean;
}) =>
  request<{ data: AlertSubscriptionData }>('/alert-subscriptions', { method: 'POST', body: data, token });

export const updateAlertSubscription = (token: string, id: string, data: {
  name?: string;
  filter_criteria?: Record<string, unknown>;
  channels?: string[];
  enabled?: boolean;
}) =>
  request<{ data: AlertSubscriptionData }>(`/alert-subscriptions/${id}`, { method: 'PATCH', body: data, token });

export const deleteAlertSubscription = (token: string, id: string) =>
  request<{ data: { deleted: boolean; id: string } }>(`/alert-subscriptions/${id}`, { method: 'DELETE', token });

// ─── Detection Rules (Layer 9) ──────────────────────────────────

export interface DetectionRule {
  id: string;
  name: string;
  description: string | null;
  rule_type: string;
  trigger_event_types: string[];
  conditions: unknown;
  actions: unknown[];
  priority: number;
  enabled: boolean;
  dry_run: boolean;
  created_by: string;
  version: number;
  previous_version_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RuleMatchLog {
  id: string;
  rule_id: string;
  user_id: string;
  event_type: string;
  matched: boolean;
  dry_run: boolean;
  context_snapshot: unknown;
  actions_executed: unknown;
  created_at: string;
}

export interface RuleTestResult {
  matches: number;
  total: number;
  sample_matches: Array<{ user_id: string; score: number; tier: string }>;
}

export const getAdminRules = (token: string, params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return request<{ data: DetectionRule[]; pagination: unknown }>(`/admin/rules${qs}`, { token });
};

export const getAdminRule = (token: string, id: string) =>
  request<{ data: DetectionRule }>(`/admin/rules/${id}`, { token });

export const createAdminRule = (token: string, data: {
  name: string;
  description?: string;
  rule_type: string;
  trigger_event_types: string[];
  conditions: unknown;
  actions: unknown[];
  priority?: number;
  enabled?: boolean;
  dry_run?: boolean;
}) =>
  request<{ data: DetectionRule }>('/admin/rules', { method: 'POST', body: data, token });

export const updateAdminRule = (token: string, id: string, data: {
  name?: string;
  description?: string;
  rule_type?: string;
  trigger_event_types?: string[];
  conditions?: unknown;
  actions?: unknown[];
  priority?: number;
  enabled?: boolean;
  dry_run?: boolean;
}) =>
  request<{ data: DetectionRule }>(`/admin/rules/${id}`, { method: 'PUT', body: data, token });

export const deleteAdminRule = (token: string, id: string) =>
  request<{ data: { deleted: boolean; id: string } }>(`/admin/rules/${id}`, { method: 'DELETE', token });

export const testAdminRule = (token: string, id: string) =>
  request<{ data: RuleTestResult }>(`/admin/rules/${id}/test`, { method: 'POST', token });

export const getAdminRuleHistory = (token: string, id: string) =>
  request<{ data: DetectionRule[] }>(`/admin/rules/${id}/history`, { token });

export const getAdminRuleMatches = (token: string, id: string) =>
  request<{ data: RuleMatchLog[] }>(`/admin/rules/${id}/matches`, { token });

// ─── Booking Timeline ───────────────────────────────────────────

export interface BookingKPI {
  total_bookings: { value: number; previous: number; status: 'green' | 'amber' | 'red' };
  completed: { value: number; previous: number; status: 'green' | 'amber' | 'red' };
  cancelled: { value: number; previous: number; status: 'green' | 'amber' | 'red' };
  no_shows: { value: number; previous: number; status: 'green' | 'amber' | 'red' };
  completion_rate: number;
  avg_booking_value: { value: number; previous: number };
}

export interface BookingTimelinePoint {
  timestamp: string;
  total: number;
  completed: number;
  cancelled: number;
  no_show: number;
  pending: number;
}

export interface BookingCategoryBreakdown {
  category: string;
  total: number;
  completed: number;
  cancelled: number;
  no_show: number;
}

export interface BookingTimelineData {
  kpi: BookingKPI;
  timeline: BookingTimelinePoint[];
  by_category: BookingCategoryBreakdown[];
}

export const getBookingTimeline = (token: string, params: Record<string, string>) => {
  const qs = '?' + new URLSearchParams(params).toString();
  return request<{ data: BookingTimelineData }>(`/stats/v2/booking-timeline${qs}`, { token });
};

// ─── Financial Flow ─────────────────────────────────────────────

export interface WalletTimelinePoint {
  timestamp: string;
  deposits: number;
  withdrawals: number;
  transfers: number;
  deposit_volume: number;
  withdrawal_volume: number;
  transfer_volume: number;
}

export interface TxTimelinePoint {
  timestamp: string;
  total: number;
  completed: number;
  failed: number;
  pending: number;
}

export interface FinancialFlowKPI {
  total_volume: number;
  avg_transaction: number;
  completed_volume: number;
  failed_volume: number;
  total_transactions: number;
  deposits: { value: number; previous: number; status: 'green' | 'amber' | 'red' };
  withdrawals: { value: number; previous: number; status: 'green' | 'amber' | 'red' };
  tx_completed: { value: number; previous: number; status: 'green' | 'amber' | 'red' };
  tx_failed: { value: number; previous: number; status: 'green' | 'amber' | 'red' };
}

export interface FinancialFlowData {
  kpi: FinancialFlowKPI;
  wallet_timeline: WalletTimelinePoint[];
  transaction_timeline: TxTimelinePoint[];
}

export const getFinancialFlow = (token: string, params: Record<string, string>) => {
  const qs = '?' + new URLSearchParams(params).toString();
  return request<{ data: FinancialFlowData }>(`/stats/v2/financial-flow${qs}`, { token });
};

// ─── Alert Stats (Layer 8) ──────────────────────────────────────

export interface AlertStatsData {
  by_source: Record<string, number>;
  by_priority: Record<string, number>;
  open_count: number;
  resolved_count: number;
  total: number;
  avg_resolution_hours: number;
  sla_breach_count: number;
  sla_breach_rate: number;
}

export const getAlertStats = (token: string, params: Record<string, string>) => {
  const qs = '?' + new URLSearchParams(params).toString();
  return request<{ data: AlertStatsData }>(`/stats/v2/alert-stats${qs}`, { token });
};

// ─── Leakage Funnel Stats (Phase 3A — extended) ─────────────────

export interface LeakageFunnelStatsData {
  funnel: Record<string, number>;
  destinations: Array<{ platform: string; count: number }>;
  revenue: { total_loss: number; avg_loss: number; confirmed_leakages: number };
  velocity: Array<{ day: string; count: number; leakage_count: number }>;
}

export const getLeakageFunnelStats = (token: string, params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return request<{ data: LeakageFunnelStatsData }>(`/stats/v2/leakage-funnel${qs}`, { token });
};

// ─── Data Sync Management ───────────────────────────────────────

export interface SyncTableStatus {
  source_table: string;
  enabled: boolean;
  last_synced_at: string;
  last_run_at: string | null;
  last_run_duration_ms: number | null;
  records_synced: number;
  last_error: string | null;
}

export interface SyncStatus {
  enabled: boolean;
  running: boolean;
  intervalMs: number;
  tables: SyncTableStatus[];
  externalDbConnected: boolean;
}

export interface SyncRunLog {
  id: string;
  source_table: string;
  started_at: string;
  finished_at: string | null;
  records_found: number;
  records_processed: number;
  records_failed: number;
  events_emitted: number;
  error: string | null;
}

export const getSyncStatus = (token: string) =>
  request<SyncStatus>('/sync/status', { token });

export const getSyncHistory = (token: string, limit?: number) =>
  request<{ runs: SyncRunLog[]; total: number }>(`/sync/history?limit=${limit || 50}`, { token });

export const triggerSync = (token: string, table?: string) =>
  request<{ message: string; results: unknown[] }>('/sync/trigger', {
    method: 'POST',
    body: table ? { table } : {},
    token,
  });

export const toggleTableSync = (token: string, table: string, enabled: boolean) =>
  request<{ message: string }>(`/sync/tables/${table}`, {
    method: 'PUT',
    body: { enabled },
    token,
  });

export const resetTableWatermark = (token: string, table: string) =>
  request<{ message: string }>(`/sync/tables/${table}/reset`, {
    method: 'POST',
    token,
  });

export const testSyncConnection = (token: string) =>
  request<{ connected: boolean; host?: string; port?: number; database?: string; error?: string }>('/sync/test-connection', {
    token,
  });

// QwickServices CIS — OpenAI Integration Service

import { config } from '../config';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: { content: string };
  }>;
}

// Strip PII before sending to LLM
function redactPII(text: string): string {
  return text
    .replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL]')
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]')
    .replace(/\+\d{1,3}[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/g, '[PHONE]')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]');
}

const OPENAI_TIMEOUT_MS = 30_000;

async function chatCompletion(messages: ChatMessage[]): Promise<string> {
  if (!config.openai.apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.openai.apiKey}`,
      },
      body: JSON.stringify({
        model: config.openai.model,
        messages,
        temperature: 0.3,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${err}`);
    }

    const data = (await response.json()) as OpenAIResponse;
    return data.choices[0]?.message?.content || '{}';
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateRiskSummary(userData: {
  display_name: string;
  trust_score: number;
  status: string;
  user_type: string;
  service_category?: string;
  alert_count: number;
  case_count: number;
  enforcement_count: number;
  signals: string[];
}): Promise<{ summary: string; risk_level: string; recommendations: string[] }> {
  try {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are a trust & safety analyst for a service marketplace. Provide risk assessments in JSON format with keys: summary (string, 2-3 sentences), risk_level (low|medium|high|critical), recommendations (array of 2-3 action items).',
      },
      {
        role: 'user',
        content: redactPII(`Assess risk for user: name="${userData.display_name}", trust_score=${userData.trust_score}, status=${userData.status}, type=${userData.user_type}, category=${userData.service_category || 'N/A'}, alerts=${userData.alert_count}, cases=${userData.case_count}, enforcements=${userData.enforcement_count}, signals=[${userData.signals.join(', ')}]`),
      },
    ];

    const result = JSON.parse(await chatCompletion(messages));
    return {
      summary: result.summary || 'Unable to generate summary.',
      risk_level: result.risk_level || 'medium',
      recommendations: result.recommendations || [],
    };
  } catch (error) {
    console.error('generateRiskSummary error:', error);
    return {
      summary: 'AI analysis unavailable. Review user data manually.',
      risk_level: 'unknown',
      recommendations: ['Manual review recommended'],
    };
  }
}

export async function analyzeAppeal(appealData: {
  user_name: string;
  appeal_reason: string;
  enforcement_type: string;
  enforcement_reason: string;
  trust_score: number;
  prior_violations: number;
}): Promise<{ recommendation: string; reasoning: string; confidence: number }> {
  try {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are a trust & safety appeal reviewer. Analyze appeals and provide recommendations in JSON format with keys: recommendation (approve|deny|escalate), reasoning (string, 2-3 sentences), confidence (0-1 float).',
      },
      {
        role: 'user',
        content: redactPII(`Review appeal: user="${appealData.user_name}", appeal_reason="${appealData.appeal_reason}", enforcement_type=${appealData.enforcement_type}, enforcement_reason="${appealData.enforcement_reason}", trust_score=${appealData.trust_score}, prior_violations=${appealData.prior_violations}`),
      },
    ];

    const result = JSON.parse(await chatCompletion(messages));
    return {
      recommendation: result.recommendation || 'escalate',
      reasoning: result.reasoning || 'Unable to determine.',
      confidence: result.confidence || 0.5,
    };
  } catch (error) {
    console.error('analyzeAppeal error:', error);
    return {
      recommendation: 'escalate',
      reasoning: 'AI analysis unavailable. Manual review required.',
      confidence: 0,
    };
  }
}

export async function detectPatterns(data: {
  alerts: Array<{ priority: string; title: string; category?: string }>;
  signals: Array<{ signal_type: string; confidence: number }>;
}): Promise<{ patterns: Array<{ pattern: string; severity: string; details: string }> }> {
  try {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are a trust & safety pattern analyst. Identify behavioral patterns from alerts and signals. Return JSON with key: patterns (array of objects with pattern, severity (low|medium|high|critical), details).',
      },
      {
        role: 'user',
        content: redactPII(`Analyze patterns in: alerts=${JSON.stringify(data.alerts)}, signals=${JSON.stringify(data.signals)}`),
      },
    ];

    const result = JSON.parse(await chatCompletion(messages));
    return { patterns: result.patterns || [] };
  } catch (error) {
    console.error('detectPatterns error:', error);
    return { patterns: [] };
  }
}

// ─── Phase 3: Platform Health + Anomaly Digest + Insights ───

export async function generatePlatformHealthSummary(metrics: {
  active_users: number;
  active_providers: number;
  transactions_completed: number;
  failed_transactions: number;
  open_alerts: number;
  off_platform_signals: number;
  trust_score_index: number;
}): Promise<{ narrative: string; health_status: 'healthy' | 'degraded' | 'critical'; key_concerns: string[]; recommended_actions: string[] }> {
  try {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are a platform health analyst for a service marketplace. Given KPI metrics, write a brief executive narrative. Return JSON with keys: narrative (string, 3-4 sentences), health_status (healthy|degraded|critical), key_concerns (array of strings, 0-3 items), recommended_actions (array of strings, 1-3 items).',
      },
      {
        role: 'user',
        content: `Assess platform health: active_users=${metrics.active_users}, active_providers=${metrics.active_providers}, tx_completed=${metrics.transactions_completed}, tx_failed=${metrics.failed_transactions}, open_alerts=${metrics.open_alerts}, off_platform_signals=${metrics.off_platform_signals}, trust_score_index=${metrics.trust_score_index}`,
      },
    ];

    const result = JSON.parse(await chatCompletion(messages));
    return {
      narrative: result.narrative || 'Platform health data analyzed.',
      health_status: result.health_status || 'healthy',
      key_concerns: result.key_concerns || [],
      recommended_actions: result.recommended_actions || [],
    };
  } catch (error) {
    console.error('generatePlatformHealthSummary error:', error);
    return {
      narrative: 'AI health summary unavailable. Review metrics manually.',
      health_status: 'healthy',
      key_concerns: [],
      recommended_actions: ['Manual review recommended'],
    };
  }
}

export async function generateAnomalyDigest(data: {
  signals: Array<{ signal_type: string; confidence: number; user_id: string }>;
  alerts: Array<{ priority: string; title: string; status: string }>;
}): Promise<{ findings: Array<{ title: string; severity: string; affected_users_count: number; description: string; action: string }> }> {
  try {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are a trust & safety anomaly analyst. Summarize recent anomalies into findings. Return JSON with key: findings (array of objects with title, severity (low|medium|high|critical), affected_users_count (number), description (1-2 sentences), action (recommended next step)).',
      },
      {
        role: 'user',
        content: redactPII(`Analyze anomalies from last 24h: signals=${JSON.stringify(data.signals.slice(0, 50))}, alerts=${JSON.stringify(data.alerts.slice(0, 30))}`),
      },
    ];

    const result = JSON.parse(await chatCompletion(messages));
    return { findings: result.findings || [] };
  } catch (error) {
    console.error('generateAnomalyDigest error:', error);
    return { findings: [] };
  }
}

export interface AIInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'recommendation' | 'milestone';
  title: string;
  body: string;
  severity: 'info' | 'warning' | 'critical';
  cta_label: string;
  cta_link: string;
  created_at: string;
}

export async function generateInsights(data: {
  metrics: Record<string, number>;
  anomaly_count: number;
  trend_direction: string;
}): Promise<AIInsight[]> {
  try {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are a trust & safety insights generator for a service marketplace. Generate 2-3 actionable insight cards. Return JSON with key: insights (array of objects with type (trend|anomaly|recommendation|milestone), title (short), body (1-2 sentences), severity (info|warning|critical), cta_label (short button text), cta_link (dashboard route like /intelligence or /alerts)).',
      },
      {
        role: 'user',
        content: `Generate insights from: metrics=${JSON.stringify(data.metrics)}, anomaly_count=${data.anomaly_count}, trend=${data.trend_direction}`,
      },
    ];

    const result = JSON.parse(await chatCompletion(messages));
    const insights: AIInsight[] = (result.insights || []).map((item: Partial<AIInsight>, idx: number) => ({
      id: `ai-insight-${Date.now()}-${idx}`,
      type: item.type || 'recommendation',
      title: item.title || 'Insight',
      body: item.body || '',
      severity: item.severity || 'info',
      cta_label: item.cta_label || 'View',
      cta_link: item.cta_link || '/intelligence',
      created_at: new Date().toISOString(),
    }));
    return insights;
  } catch (error) {
    console.error('generateInsights error:', error);
    return [];
  }
}

export async function generatePredictiveAlert(data: {
  user_name: string;
  trust_score: number;
  trend: string;
  recent_signals: string[];
  enforcement_history: string[];
}): Promise<{ likelihood: number; predicted_violation: string; timeframe: string; reasoning: string }> {
  try {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are a predictive trust & safety analyst. Predict violation likelihood. Return JSON with keys: likelihood (0-1 float), predicted_violation (string), timeframe (string e.g. "7 days"), reasoning (string, 2-3 sentences).',
      },
      {
        role: 'user',
        content: redactPII(`Predict violations for: user="${data.user_name}", trust_score=${data.trust_score}, trend=${data.trend}, recent_signals=[${data.recent_signals.join(', ')}], enforcement_history=[${data.enforcement_history.join(', ')}]`),
      },
    ];

    const result = JSON.parse(await chatCompletion(messages));
    return {
      likelihood: result.likelihood || 0.5,
      predicted_violation: result.predicted_violation || 'Unknown',
      timeframe: result.timeframe || 'Unknown',
      reasoning: result.reasoning || 'Unable to predict.',
    };
  } catch (error) {
    console.error('generatePredictiveAlert error:', error);
    return {
      likelihood: 0,
      predicted_violation: 'Analysis unavailable',
      timeframe: 'N/A',
      reasoning: 'AI analysis unavailable.',
    };
  }
}

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

async function chatCompletion(messages: ChatMessage[]): Promise<string> {
  if (!config.openai.apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

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
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${err}`);
  }

  const data = (await response.json()) as OpenAIResponse;
  return data.choices[0]?.message?.content || '{}';
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

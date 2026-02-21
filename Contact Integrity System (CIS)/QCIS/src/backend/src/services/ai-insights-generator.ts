// QwickServices CIS — Background AI Insight Generator
// Runs every 15 minutes, queries aggregate metrics from CIS PostgreSQL,
// calls OpenAI to generate 2-3 actionable insights, and stores them
// in an in-memory cache with a 4-hour TTL.

import { config } from '../config';
import { query } from '../database/connection';
import { generateInsights, AIInsight } from './openai';

// ─── In-Memory Cache ──────────────────────────────────────────

const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
const GENERATION_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

let insightsCache: AIInsight[] = [];
let cacheTimestamp = 0;
let intervalHandle: ReturnType<typeof setInterval> | null = null;

export function getInsightsCache(): AIInsight[] {
  // Return cached insights if still valid
  if (Date.now() - cacheTimestamp > CACHE_TTL_MS) {
    return []; // Stale cache — return empty until next generation
  }
  return insightsCache;
}

// ─── Generation Logic ─────────────────────────────────────────

async function generateAndCache(): Promise<void> {
  if (!config.openai.apiKey) {
    return; // Gracefully degrade — no API key
  }

  try {
    // Query aggregate metrics
    const [userCount, txStats, alertCount, signalCount, scoreResult] = await Promise.all([
      query(`SELECT COUNT(*) as total FROM users WHERE status = 'active'`),
      query(`SELECT
               COUNT(*) FILTER (WHERE status = 'completed') as completed,
               COUNT(*) FILTER (WHERE status = 'failed') as failed
             FROM transactions WHERE created_at > NOW() - INTERVAL '24 hours'`),
      query(`SELECT COUNT(*) as open_alerts FROM alerts WHERE status IN ('open', 'assigned', 'in_progress')`),
      query(`SELECT COUNT(*) as total FROM risk_signals WHERE created_at > NOW() - INTERVAL '24 hours'`),
      query(`SELECT AVG(score) as avg FROM risk_scores WHERE created_at > NOW() - INTERVAL '7 days'`),
    ]);

    const metrics: Record<string, number> = {
      total_users: parseInt(userCount.rows[0]?.total || '0', 10),
      tx_completed_24h: parseInt(txStats.rows[0]?.completed || '0', 10),
      tx_failed_24h: parseInt(txStats.rows[0]?.failed || '0', 10),
      open_alerts: parseInt(alertCount.rows[0]?.open_alerts || '0', 10),
      signals_24h: parseInt(signalCount.rows[0]?.total || '0', 10),
      avg_trust_score: Math.round(parseFloat(scoreResult.rows[0]?.avg || '50') * 10) / 10,
    };

    const anomalyCount = metrics.signals_24h;
    const trendDirection = metrics.tx_failed_24h > metrics.tx_completed_24h * 0.1 ? 'degrading' : 'stable';

    const insights = await generateInsights({ metrics, anomaly_count: anomalyCount, trend_direction: trendDirection });

    if (insights.length > 0) {
      insightsCache = insights;
      cacheTimestamp = Date.now();
      console.log(`[AIInsights] Generated ${insights.length} insights`);
    }
  } catch (err) {
    console.error('[AIInsights] Generation failed:', err);
  }
}

// ─── Lifecycle ────────────────────────────────────────────────

export function startAIInsightGenerator(): void {
  if (!config.openai.apiKey) {
    console.log('  AI insights: disabled (no OPENAI_API_KEY)');
    return;
  }

  // Generate immediately, then on interval
  generateAndCache().catch(() => {});
  intervalHandle = setInterval(generateAndCache, GENERATION_INTERVAL_MS);
  console.log('  AI insights: generator started (15-min interval)');
}

export function stopAIInsightGenerator(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

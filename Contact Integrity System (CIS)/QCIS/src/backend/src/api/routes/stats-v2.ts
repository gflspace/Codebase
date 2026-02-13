import { Router, Request, Response } from 'express';
import { query } from '../../database/connection';
import { authenticateJWT, requirePermission } from '../middleware/auth';

const router = Router();

// ─── Shared filter parsing ──────────────────────────────────────

const INTERVAL_MAP: Record<string, string> = {
  last_24h: '24 hours',
  last_7d: '7 days',
  last_30d: '30 days',
};

const BUCKET_MAP: Record<string, string> = {
  hourly: 'hour',
  daily: 'day',
  weekly: 'week',
};

interface ParsedFilters {
  interval: string;
  doubleInterval: string;
  bucket: string;
  entityType: string;
  category: string;
  riskLevel: string;
}

function parseFilters(req: Request): ParsedFilters {
  const range = (req.query.range as string) || 'last_24h';
  const granularity = (req.query.granularity as string) || 'hourly';
  const entityType = (req.query.entity_type as string) || 'both';
  const category = (req.query.category as string) || '';
  const riskLevel = (req.query.risk_level as string) || 'all';

  const interval = INTERVAL_MAP[range] || '24 hours';
  const doubleInterval = range === 'last_7d' ? '14 days' : range === 'last_30d' ? '60 days' : '48 hours';
  const bucket = BUCKET_MAP[granularity] || 'hour';

  return { interval, doubleInterval, bucket, entityType, category, riskLevel };
}

/** Build optional WHERE conditions for entity_type and category filtering on a user join. */
function entityConditions(filters: ParsedFilters, userAlias: string): { joins: string; wheres: string[]; values: unknown[]; nextIdx: number; startIdx?: number } {
  const joins = `LEFT JOIN users ${userAlias} ON ${userAlias}.id = `;
  const wheres: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (filters.entityType === 'users') {
    wheres.push(`${userAlias}.user_type = $${idx++}`);
    values.push('customer');
  } else if (filters.entityType === 'providers') {
    wheres.push(`${userAlias}.user_type = $${idx++}`);
    values.push('provider');
  }

  if (filters.category) {
    wheres.push(`${userAlias}.service_category = $${idx++}`);
    values.push(filters.category);
  }

  return { joins, wheres, values, nextIdx: idx };
}

/** Split time-bucketed rows into current vs previous period and build sparkline. */
function splitPeriods(rows: Array<{ ts: string; [k: string]: unknown }>, interval: string, field: string): {
  current: number;
  previous: number;
  sparkline: number[];
} {
  const intervalMs = interval === '24 hours' ? 86400000 : interval === '7 days' ? 604800000 : 2592000000;
  const cutoff = new Date(Date.now() - intervalMs);

  let current = 0;
  let previous = 0;
  const sparkline: number[] = [];

  for (const row of rows) {
    const ts = new Date(row.ts);
    const val = Number(row[field]) || 0;
    if (ts >= cutoff) {
      current += val;
      sparkline.push(val);
    } else {
      previous += val;
    }
  }

  return { current, previous, sparkline };
}

function splitPeriodsAvg(rows: Array<{ ts: string; [k: string]: unknown }>, interval: string, field: string): {
  current: number;
  previous: number;
  sparkline: number[];
} {
  const intervalMs = interval === '24 hours' ? 86400000 : interval === '7 days' ? 604800000 : 2592000000;
  const cutoff = new Date(Date.now() - intervalMs);

  const currentVals: number[] = [];
  const previousVals: number[] = [];
  const sparkline: number[] = [];

  for (const row of rows) {
    const ts = new Date(row.ts);
    const val = Number(row[field]) || 0;
    if (ts >= cutoff) {
      currentVals.push(val);
      sparkline.push(val);
    } else {
      previousVals.push(val);
    }
  }

  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  return { current: Math.round(avg(currentVals) * 10) / 10, previous: Math.round(avg(previousVals) * 10) / 10, sparkline };
}

function computeStatus(current: number, previous: number, higherIsBad: boolean): 'green' | 'amber' | 'red' {
  if (previous === 0) return 'green';
  const pctChange = ((current - previous) / previous) * 100;
  if (higherIsBad) {
    if (pctChange > 50) return 'red';
    if (pctChange > 20) return 'amber';
    return 'green';
  }
  // higher is good (e.g. active users)
  if (pctChange < -20) return 'red';
  if (pctChange < -10) return 'amber';
  return 'green';
}

// ─── GET /api/stats/v2/kpi ──────────────────────────────────────

router.get(
  '/kpi',
  authenticateJWT,
  requirePermission('intelligence.view'),
  async (req: Request, res: Response) => {
    try {
      const filters = parseFilters(req);
      const { interval, doubleInterval, bucket } = filters;

      // Entity conditions for message queries
      const msgCond = entityConditions(filters, 'u_msg');
      const msgEntityJoin = (msgCond.wheres.length > 0)
        ? `LEFT JOIN users u_msg ON u_msg.id = m.sender_id`
        : '';
      const msgWhere = msgCond.wheres.length > 0
        ? 'AND ' + msgCond.wheres.join(' AND ')
        : '';

      // Entity conditions for transaction queries
      const txCond = entityConditions(filters, 'u_tx');
      const txEntityJoin = (txCond.wheres.length > 0)
        ? `LEFT JOIN users u_tx ON u_tx.id = t.user_id`
        : '';
      const txWhere = txCond.wheres.length > 0
        ? 'AND ' + txCond.wheres.join(' AND ')
        : '';

      // Run 5 batch queries in parallel
      const [msgRows, txRows, sigRows, alertRows, scoreRows] = await Promise.all([
        // 1. Messages: active_users + message_count by bucket
        query(
          `SELECT DATE_TRUNC('${bucket}', m.created_at) as ts,
                  COUNT(DISTINCT m.sender_id) as active_users,
                  COUNT(*) as messages
           FROM messages m
           ${msgEntityJoin}
           WHERE m.created_at > NOW() - INTERVAL '${doubleInterval}'
           ${msgWhere}
           GROUP BY ts ORDER BY ts`,
          msgCond.values
        ),

        // 2. Transactions: completed + failed by bucket
        query(
          `SELECT DATE_TRUNC('${bucket}', t.created_at) as ts,
                  COUNT(*) FILTER (WHERE t.status = 'completed') as completed,
                  COUNT(*) FILTER (WHERE t.status = 'failed') as failed,
                  COUNT(*) as total
           FROM transactions t
           ${txEntityJoin}
           WHERE t.created_at > NOW() - INTERVAL '${doubleInterval}'
           ${txWhere}
           GROUP BY ts ORDER BY ts`,
          txCond.values
        ),

        // 3. Risk signals: total + off-platform by bucket
        query(
          `SELECT DATE_TRUNC('${bucket}', rs.created_at) as ts,
                  COUNT(*) as total_signals,
                  COUNT(*) FILTER (WHERE rs.signal_type IN ('OFF_PLATFORM_INTENT', 'PAYMENT_EXTERNAL')) as off_platform
           FROM risk_signals rs
           WHERE rs.created_at > NOW() - INTERVAL '${doubleInterval}'
           GROUP BY ts ORDER BY ts`
        ),

        // 4. Alerts: total + open by bucket
        query(
          `SELECT DATE_TRUNC('${bucket}', a.created_at) as ts,
                  COUNT(*) as total,
                  COUNT(*) FILTER (WHERE a.status IN ('open', 'assigned', 'in_progress')) as open_count
           FROM alerts a
           WHERE a.created_at > NOW() - INTERVAL '${doubleInterval}'
           GROUP BY ts ORDER BY ts`
        ),

        // 5. Risk scores: avg score by bucket
        query(
          `SELECT DATE_TRUNC('${bucket}', rs2.created_at) as ts,
                  AVG(rs2.score) as avg_score,
                  COUNT(DISTINCT rs2.user_id) as user_count
           FROM risk_scores rs2
           WHERE rs2.created_at > NOW() - INTERVAL '${doubleInterval}'
           GROUP BY ts ORDER BY ts`
        ),
      ]);

      // Compute KPIs from batch results
      const activeUsers = splitPeriods(msgRows.rows, interval, 'active_users');
      const messagesSent = splitPeriods(msgRows.rows, interval, 'messages');
      const txCompleted = splitPeriods(txRows.rows, interval, 'completed');
      const txFailed = splitPeriods(txRows.rows, interval, 'failed');
      const offPlatform = splitPeriods(sigRows.rows, interval, 'off_platform');
      const openAlerts = splitPeriods(alertRows.rows, interval, 'open_count');
      const trustScore = splitPeriodsAvg(scoreRows.rows, interval, 'avg_score');
      const userCount = splitPeriods(scoreRows.rows, interval, 'user_count');

      // Active providers (simple count — not time-bucketed)
      const providerResult = await query(
        `SELECT COUNT(*) as value FROM users WHERE user_type = 'provider' AND status = 'active'`
      );
      const activeProviders = parseInt(providerResult.rows[0]?.value || '0', 10);

      res.json({
        data: {
          active_users: {
            value: activeUsers.current,
            previous: activeUsers.previous,
            sparkline: activeUsers.sparkline,
            status: computeStatus(activeUsers.current, activeUsers.previous, false),
            tooltip: 'Unique users who sent at least one message in this period.',
          },
          active_providers: {
            value: activeProviders,
            previous: activeProviders, // no historical baseline for simple count
            sparkline: [],
            status: 'green' as const,
            tooltip: 'Total service providers with active account status.',
          },
          messages_sent: {
            value: messagesSent.current,
            previous: messagesSent.previous,
            sparkline: messagesSent.sparkline,
            status: computeStatus(messagesSent.current, messagesSent.previous, false),
            tooltip: 'Total messages sent through the platform in this period.',
          },
          transactions_completed: {
            value: txCompleted.current,
            previous: txCompleted.previous,
            sparkline: txCompleted.sparkline,
            status: computeStatus(txCompleted.current, txCompleted.previous, false),
            tooltip: 'Transactions that reached completed status.',
          },
          off_platform_signals: {
            value: offPlatform.current,
            previous: offPlatform.previous,
            sparkline: offPlatform.sparkline,
            status: computeStatus(offPlatform.current, offPlatform.previous, true),
            tooltip: 'Risk signals indicating off-platform payment or contact attempts.',
          },
          failed_transactions: {
            value: txFailed.current,
            previous: txFailed.previous,
            sparkline: txFailed.sparkline,
            status: computeStatus(txFailed.current, txFailed.previous, true),
            tooltip: 'Transactions that failed or were abandoned.',
          },
          open_alerts: {
            value: openAlerts.current,
            previous: openAlerts.previous,
            sparkline: openAlerts.sparkline,
            status: computeStatus(openAlerts.current, openAlerts.previous, true),
            tooltip: 'Alerts currently open, assigned, or in progress.',
          },
          trust_score_index: {
            value: trustScore.current,
            previous: trustScore.previous,
            sparkline: trustScore.sparkline,
            status: trustScore.current < 30 ? 'red' as const : trustScore.current < 50 ? 'amber' as const : 'green' as const,
            tooltip: `Trust Score Index combines transaction success rate, behavioral consistency, and anomaly signals. ${userCount.current} users scored.`,
          },
        },
      });
    } catch (error) {
      console.error('Stats v2 KPI error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── GET /api/stats/v2/timeline ─────────────────────────────────

router.get(
  '/timeline',
  authenticateJWT,
  requirePermission('intelligence.view'),
  async (req: Request, res: Response) => {
    try {
      const filters = parseFilters(req);
      const { interval, bucket } = filters;

      const [msgRows, txRows, sigRows, enfRows] = await Promise.all([
        query(
          `SELECT DATE_TRUNC('${bucket}', created_at) as ts, COUNT(*) as messages
           FROM messages
           WHERE created_at > NOW() - INTERVAL '${interval}'
           GROUP BY ts ORDER BY ts`
        ),
        query(
          `SELECT DATE_TRUNC('${bucket}', created_at) as ts,
                  COUNT(*) FILTER (WHERE status = 'initiated') as transactions_initiated,
                  COUNT(*) FILTER (WHERE status = 'completed') as transactions_completed
           FROM transactions
           WHERE created_at > NOW() - INTERVAL '${interval}'
           GROUP BY ts ORDER BY ts`
        ),
        query(
          `SELECT DATE_TRUNC('${bucket}', created_at) as ts, COUNT(*) as risk_signals
           FROM risk_signals
           WHERE created_at > NOW() - INTERVAL '${interval}'
           GROUP BY ts ORDER BY ts`
        ),
        query(
          `SELECT DATE_TRUNC('${bucket}', created_at) as ts, COUNT(*) as enforcement_actions
           FROM enforcement_actions
           WHERE created_at > NOW() - INTERVAL '${interval}'
           GROUP BY ts ORDER BY ts`
        ),
      ]);

      // Merge into unified timeline
      const timeMap = new Map<string, {
        timestamp: string;
        messages: number;
        transactions_initiated: number;
        transactions_completed: number;
        risk_signals: number;
        enforcement_actions: number;
      }>();

      const ensure = (rawTs: string | Date) => {
        const ts = rawTs instanceof Date ? rawTs.toISOString() : String(rawTs);
        if (!timeMap.has(ts)) {
          timeMap.set(ts, {
            timestamp: ts,
            messages: 0,
            transactions_initiated: 0,
            transactions_completed: 0,
            risk_signals: 0,
            enforcement_actions: 0,
          });
        }
        return timeMap.get(ts)!;
      };

      for (const r of msgRows.rows) { ensure(r.ts).messages = parseInt(r.messages); }
      for (const r of txRows.rows) {
        const entry = ensure(r.ts);
        entry.transactions_initiated = parseInt(r.transactions_initiated);
        entry.transactions_completed = parseInt(r.transactions_completed);
      }
      for (const r of sigRows.rows) { ensure(r.ts).risk_signals = parseInt(r.risk_signals); }
      for (const r of enfRows.rows) { ensure(r.ts).enforcement_actions = parseInt(r.enforcement_actions); }

      const data = [...timeMap.values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

      res.json({ data });
    } catch (error) {
      console.error('Stats v2 timeline error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── Signal Domain Mapping ───────────────────────────────────

const SIGNAL_DOMAINS: Record<string, string[]> = {
  off_platform: [
    'OFF_PLATFORM_INTENT', 'PAYMENT_EXTERNAL', 'CONTACT_PHONE', 'CONTACT_EMAIL',
    'CONTACT_SOCIAL', 'CONTACT_MESSAGING_APP', 'GROOMING_LANGUAGE',
  ],
  transaction: [
    'TX_REDIRECT_ATTEMPT', 'TX_FAILURE_CORRELATED', 'TX_TIMING_ALIGNMENT',
  ],
  booking: [
    'BOOKING_CANCEL_PATTERN', 'BOOKING_NO_SHOW_PATTERN', 'BOOKING_RAPID_CANCELLATION',
    'BOOKING_FAKE_COMPLETION', 'BOOKING_SAME_PROVIDER_REPEAT', 'BOOKING_TIME_CLUSTERING',
    'BOOKING_VALUE_ANOMALY',
  ],
  payment: [
    'WALLET_VELOCITY_SPIKE', 'WALLET_SPLIT_PATTERN', 'PAYMENT_CIRCULAR',
    'PAYMENT_RAPID_TOPUP', 'PAYMENT_SPLIT_TRANSACTION', 'PAYMENT_METHOD_SWITCHING',
    'PAYMENT_WITHDRAWAL_SPIKE',
  ],
  provider: [
    'PROVIDER_RATING_DROP', 'PROVIDER_COMPLAINT_CLUSTER', 'PROVIDER_DUPLICATE_IDENTITY',
    'PROVIDER_RESPONSE_DEGRADATION', 'PROVIDER_RATING_MANIPULATION', 'PROVIDER_CANCELLATION_SPIKE',
  ],
  behavioral: [
    'TEMPORAL_BURST_ACTIVITY', 'TEMPORAL_DORMANT_ACTIVATION',
    'CONTACT_PHONE_CHANGED', 'CONTACT_EMAIL_CHANGED',
  ],
};

// Reverse lookup: signal_type → domain
const SIGNAL_TO_DOMAIN: Record<string, string> = {};
for (const [domain, types] of Object.entries(SIGNAL_DOMAINS)) {
  for (const t of types) {
    SIGNAL_TO_DOMAIN[t] = domain;
  }
}

// ─── GET /api/stats/v2/signal-breakdown ──────────────────────

router.get(
  '/signal-breakdown',
  authenticateJWT,
  requirePermission('intelligence.view'),
  async (req: Request, res: Response) => {
    try {
      const filters = parseFilters(req);
      const { interval, bucket } = filters;

      // Two queries in parallel: counts by type, time-series by type
      const [countRows, tsRows] = await Promise.all([
        query(
          `SELECT signal_type, COUNT(*) AS cnt
           FROM risk_signals
           WHERE created_at > NOW() - INTERVAL '${interval}'
           GROUP BY signal_type`
        ),
        query(
          `SELECT DATE_TRUNC('${bucket}', created_at) AS ts, signal_type, COUNT(*) AS cnt
           FROM risk_signals
           WHERE created_at > NOW() - INTERVAL '${interval}'
           GROUP BY ts, signal_type
           ORDER BY ts`
        ),
      ]);

      // Build domain counts
      const domains: Record<string, { total: number; types: Record<string, number> }> = {};
      for (const domain of Object.keys(SIGNAL_DOMAINS)) {
        domains[domain] = { total: 0, types: {} };
      }
      for (const row of countRows.rows) {
        const domain = SIGNAL_TO_DOMAIN[row.signal_type];
        if (domain && domains[domain]) {
          const cnt = parseInt(row.cnt, 10);
          domains[domain].types[row.signal_type] = cnt;
          domains[domain].total += cnt;
        }
      }

      // Build time-series per domain
      const timeSeries: Record<string, Array<{ timestamp: string; count: number }>> = {};
      for (const domain of Object.keys(SIGNAL_DOMAINS)) {
        timeSeries[domain] = [];
      }
      // Aggregate by timestamp+domain
      const tsMap = new Map<string, Map<string, number>>();
      for (const row of tsRows.rows) {
        const ts = row.ts instanceof Date ? row.ts.toISOString() : String(row.ts);
        const domain = SIGNAL_TO_DOMAIN[row.signal_type];
        if (!domain) continue;
        if (!tsMap.has(ts)) tsMap.set(ts, new Map());
        const domainMap = tsMap.get(ts)!;
        domainMap.set(domain, (domainMap.get(domain) || 0) + parseInt(row.cnt, 10));
      }
      // Convert to arrays
      const sortedTimestamps = [...tsMap.keys()].sort();
      for (const ts of sortedTimestamps) {
        const domainMap = tsMap.get(ts)!;
        for (const [domain, count] of domainMap) {
          timeSeries[domain].push({ timestamp: ts, count });
        }
      }

      res.json({
        data: { domains, timeSeries },
      });
    } catch (error) {
      console.error('Stats v2 signal-breakdown error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── GET /api/stats/v2/evaluation-stats ──────────────────────

router.get(
  '/evaluation-stats',
  authenticateJWT,
  requirePermission('intelligence.view'),
  async (req: Request, res: Response) => {
    try {
      const filters = parseFilters(req);
      const { interval, bucket } = filters;

      const [decisionRows, actionTypeRows, latencyRows] = await Promise.all([
        // Decision distribution over time
        query(
          `SELECT DATE_TRUNC('${bucket}', created_at) AS ts,
                  decision,
                  COUNT(*) AS cnt
           FROM evaluation_log
           WHERE created_at > NOW() - INTERVAL '${interval}'
           GROUP BY ts, decision
           ORDER BY ts`
        ),
        // Breakdown by action_type
        query(
          `SELECT action_type, decision, COUNT(*) AS cnt
           FROM evaluation_log
           WHERE created_at > NOW() - INTERVAL '${interval}'
           GROUP BY action_type, decision`
        ),
        // Latency percentiles
        query(
          `SELECT
             PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY evaluation_time_ms) AS p50,
             PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY evaluation_time_ms) AS p95,
             PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY evaluation_time_ms) AS p99,
             MAX(evaluation_time_ms) AS max_ms,
             COUNT(*) AS total
           FROM evaluation_log
           WHERE created_at > NOW() - INTERVAL '${interval}'`
        ),
      ]);

      // Build decision time series
      const decisionTimeSeries: Array<{ timestamp: string; allow: number; flag: number; block: number }> = [];
      const tsMap = new Map<string, { allow: number; flag: number; block: number }>();
      for (const row of decisionRows.rows) {
        const ts = row.ts instanceof Date ? row.ts.toISOString() : String(row.ts);
        if (!tsMap.has(ts)) tsMap.set(ts, { allow: 0, flag: 0, block: 0 });
        const entry = tsMap.get(ts)!;
        const d = row.decision as 'allow' | 'flag' | 'block';
        if (d in entry) entry[d] = parseInt(row.cnt, 10);
      }
      for (const [ts, counts] of [...tsMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        decisionTimeSeries.push({ timestamp: ts, ...counts });
      }

      // Build action type breakdown
      const byActionType: Record<string, { allow: number; flag: number; block: number }> = {};
      for (const row of actionTypeRows.rows) {
        const at = row.action_type as string;
        if (!byActionType[at]) byActionType[at] = { allow: 0, flag: 0, block: 0 };
        const d = row.decision as 'allow' | 'flag' | 'block';
        if (d in byActionType[at]) byActionType[at][d] = parseInt(row.cnt, 10);
      }

      // Latency
      const latRow = latencyRows.rows[0] || {};
      const latency = {
        p50: Math.round(parseFloat(latRow.p50) || 0),
        p95: Math.round(parseFloat(latRow.p95) || 0),
        p99: Math.round(parseFloat(latRow.p99) || 0),
        max: parseInt(latRow.max_ms) || 0,
        total: parseInt(latRow.total) || 0,
      };

      res.json({
        data: {
          decision_time_series: decisionTimeSeries,
          by_action_type: byActionType,
          latency,
        },
      });
    } catch (error) {
      console.error('Stats v2 evaluation-stats error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── GET /api/stats/v2/alert-stats ───────────────────────────

router.get(
  '/alert-stats',
  authenticateJWT,
  requirePermission('alerts.view'),
  async (req: Request, res: Response) => {
    try {
      const filters = parseFilters(req);
      const { interval } = filters;

      const [bySource, byPriority, statusCounts, avgResolution, slaBreach] = await Promise.all([
        // Count by source
        query(
          `SELECT COALESCE(source, 'enforcement') AS source, COUNT(*) AS cnt
           FROM alerts
           WHERE created_at > NOW() - INTERVAL '${interval}'
           GROUP BY source`
        ),
        // Count by priority
        query(
          `SELECT priority, COUNT(*) AS cnt
           FROM alerts
           WHERE created_at > NOW() - INTERVAL '${interval}'
           GROUP BY priority`
        ),
        // Open vs resolved counts
        query(
          `SELECT
             COUNT(*) FILTER (WHERE status IN ('open', 'assigned', 'in_progress')) AS open_count,
             COUNT(*) FILTER (WHERE status IN ('resolved', 'dismissed')) AS resolved_count,
             COUNT(*) AS total
           FROM alerts
           WHERE created_at > NOW() - INTERVAL '${interval}'`
        ),
        // Average time to resolution (for resolved alerts)
        query(
          `SELECT AVG(EXTRACT(EPOCH FROM (COALESCE(resolved_at, updated_at) - created_at))) AS avg_seconds
           FROM alerts
           WHERE status IN ('resolved', 'dismissed')
             AND created_at > NOW() - INTERVAL '${interval}'`
        ),
        // SLA breach count and rate
        query(
          `SELECT
             COUNT(*) FILTER (WHERE escalation_count > 0) AS breached,
             COUNT(*) AS total
           FROM alerts
           WHERE created_at > NOW() - INTERVAL '${interval}'
             AND sla_deadline IS NOT NULL`
        ),
      ]);

      // Build source breakdown
      const sourceBreakdown: Record<string, number> = {};
      for (const row of bySource.rows) {
        sourceBreakdown[row.source] = parseInt(row.cnt, 10);
      }

      // Build priority breakdown
      const priorityBreakdown: Record<string, number> = {};
      for (const row of byPriority.rows) {
        priorityBreakdown[row.priority] = parseInt(row.cnt, 10);
      }

      const statusRow = statusCounts.rows[0] || {};
      const openCount = parseInt(statusRow.open_count || '0', 10);
      const resolvedCount = parseInt(statusRow.resolved_count || '0', 10);
      const total = parseInt(statusRow.total || '0', 10);

      const avgSeconds = parseFloat(avgResolution.rows[0]?.avg_seconds || '0');
      const avgResolutionHours = Math.round((avgSeconds / 3600) * 10) / 10;

      const slaRow = slaBreach.rows[0] || {};
      const slaBreached = parseInt(slaRow.breached || '0', 10);
      const slaTotal = parseInt(slaRow.total || '0', 10);
      const slaBreachRate = slaTotal > 0 ? Math.round((slaBreached / slaTotal) * 1000) / 10 : 0;

      res.json({
        data: {
          by_source: sourceBreakdown,
          by_priority: priorityBreakdown,
          open_count: openCount,
          resolved_count: resolvedCount,
          total,
          avg_resolution_hours: avgResolutionHours,
          sla_breach_count: slaBreached,
          sla_breach_rate: slaBreachRate,
        },
      });
    } catch (error) {
      console.error('Stats v2 alert-stats error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── GET /api/stats/v2/booking-timeline ──────────────────────

router.get(
  '/booking-timeline',
  authenticateJWT,
  requirePermission('intelligence.view'),
  async (req: Request, res: Response) => {
    try {
      const filters = parseFilters(req);
      const { interval, doubleInterval, bucket } = filters;

      const [statusRows, categoryRows, valueRows] = await Promise.all([
        // Bookings by status over time
        query(
          `SELECT DATE_TRUNC('${bucket}', b.created_at) AS ts,
                  COUNT(*) AS total,
                  COUNT(*) FILTER (WHERE b.status = 'completed') AS completed,
                  COUNT(*) FILTER (WHERE b.status = 'cancelled') AS cancelled,
                  COUNT(*) FILTER (WHERE b.status = 'no_show') AS no_show,
                  COUNT(*) FILTER (WHERE b.status IN ('created', 'updated')) AS pending
           FROM bookings b
           WHERE b.created_at > NOW() - INTERVAL '${doubleInterval}'
           GROUP BY ts ORDER BY ts`
        ),
        // Bookings by service category
        query(
          `SELECT COALESCE(b.service_category, 'uncategorized') AS category,
                  COUNT(*) AS total,
                  COUNT(*) FILTER (WHERE b.status = 'completed') AS completed,
                  COUNT(*) FILTER (WHERE b.status = 'cancelled') AS cancelled,
                  COUNT(*) FILTER (WHERE b.status = 'no_show') AS no_show
           FROM bookings b
           WHERE b.created_at > NOW() - INTERVAL '${interval}'
           GROUP BY category
           ORDER BY total DESC`
        ),
        // Average booking value
        query(
          `SELECT DATE_TRUNC('${bucket}', b.created_at) AS ts,
                  AVG(b.amount) AS avg_value,
                  SUM(b.amount) AS total_value,
                  COUNT(*) AS booking_count
           FROM bookings b
           WHERE b.created_at > NOW() - INTERVAL '${doubleInterval}'
             AND b.amount IS NOT NULL
           GROUP BY ts ORDER BY ts`
        ),
      ]);

      // Build time series
      const totalBookings = splitPeriods(statusRows.rows, interval, 'total');
      const completedBookings = splitPeriods(statusRows.rows, interval, 'completed');
      const cancelledBookings = splitPeriods(statusRows.rows, interval, 'cancelled');
      const noShows = splitPeriods(statusRows.rows, interval, 'no_show');
      const avgValue = splitPeriodsAvg(valueRows.rows, interval, 'avg_value');

      // Build timeline
      const timeline: Array<{ timestamp: string; total: number; completed: number; cancelled: number; no_show: number; pending: number }> = [];
      for (const row of statusRows.rows) {
        const ts = row.ts instanceof Date ? row.ts.toISOString() : String(row.ts);
        timeline.push({
          timestamp: ts,
          total: parseInt(row.total) || 0,
          completed: parseInt(row.completed) || 0,
          cancelled: parseInt(row.cancelled) || 0,
          no_show: parseInt(row.no_show) || 0,
          pending: parseInt(row.pending) || 0,
        });
      }

      // Completion rate
      const completionRate = totalBookings.current > 0
        ? Math.round((completedBookings.current / totalBookings.current) * 1000) / 10
        : 0;

      res.json({
        data: {
          kpi: {
            total_bookings: { value: totalBookings.current, previous: totalBookings.previous, status: computeStatus(totalBookings.current, totalBookings.previous, false) },
            completed: { value: completedBookings.current, previous: completedBookings.previous, status: computeStatus(completedBookings.current, completedBookings.previous, false) },
            cancelled: { value: cancelledBookings.current, previous: cancelledBookings.previous, status: computeStatus(cancelledBookings.current, cancelledBookings.previous, true) },
            no_shows: { value: noShows.current, previous: noShows.previous, status: computeStatus(noShows.current, noShows.previous, true) },
            completion_rate: completionRate,
            avg_booking_value: { value: avgValue.current, previous: avgValue.previous },
          },
          timeline,
          by_category: categoryRows.rows.map((r) => ({
            category: r.category,
            total: parseInt(r.total) || 0,
            completed: parseInt(r.completed) || 0,
            cancelled: parseInt(r.cancelled) || 0,
            no_show: parseInt(r.no_show) || 0,
          })),
        },
      });
    } catch (error) {
      console.error('Stats v2 booking-timeline error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── GET /api/stats/v2/financial-flow ────────────────────────

router.get(
  '/financial-flow',
  authenticateJWT,
  requirePermission('intelligence.view'),
  async (req: Request, res: Response) => {
    try {
      const filters = parseFilters(req);
      const { interval, doubleInterval, bucket } = filters;

      const [walletRows, txStatusRows, txValueRows] = await Promise.all([
        // Wallet activity by type over time
        query(
          `SELECT DATE_TRUNC('${bucket}', t.created_at) AS ts,
                  COUNT(*) FILTER (WHERE t.tx_type = 'deposit') AS deposits,
                  COUNT(*) FILTER (WHERE t.tx_type = 'withdrawal') AS withdrawals,
                  COUNT(*) FILTER (WHERE t.tx_type = 'transfer') AS transfers,
                  SUM(t.amount) FILTER (WHERE t.tx_type = 'deposit') AS deposit_volume,
                  SUM(t.amount) FILTER (WHERE t.tx_type = 'withdrawal') AS withdrawal_volume,
                  SUM(t.amount) FILTER (WHERE t.tx_type = 'transfer') AS transfer_volume
           FROM wallet_transactions t
           WHERE t.created_at > NOW() - INTERVAL '${doubleInterval}'
           GROUP BY ts ORDER BY ts`
        ),
        // Transaction success/fail over time
        query(
          `SELECT DATE_TRUNC('${bucket}', t.created_at) AS ts,
                  COUNT(*) AS total,
                  COUNT(*) FILTER (WHERE t.status = 'completed') AS completed,
                  COUNT(*) FILTER (WHERE t.status = 'failed') AS failed,
                  COUNT(*) FILTER (WHERE t.status = 'initiated') AS pending
           FROM transactions t
           WHERE t.created_at > NOW() - INTERVAL '${doubleInterval}'
           GROUP BY ts ORDER BY ts`
        ),
        // Transaction value stats
        query(
          `SELECT
             AVG(amount) AS avg_amount,
             SUM(amount) AS total_volume,
             COUNT(*) AS total_count,
             SUM(amount) FILTER (WHERE status = 'completed') AS completed_volume,
             SUM(amount) FILTER (WHERE status = 'failed') AS failed_volume
           FROM transactions
           WHERE created_at > NOW() - INTERVAL '${interval}'`
        ),
      ]);

      // Wallet timeline
      const walletTimeline: Array<{
        timestamp: string; deposits: number; withdrawals: number; transfers: number;
        deposit_volume: number; withdrawal_volume: number; transfer_volume: number;
      }> = [];
      for (const row of walletRows.rows) {
        const ts = row.ts instanceof Date ? row.ts.toISOString() : String(row.ts);
        walletTimeline.push({
          timestamp: ts,
          deposits: parseInt(row.deposits) || 0,
          withdrawals: parseInt(row.withdrawals) || 0,
          transfers: parseInt(row.transfers) || 0,
          deposit_volume: parseFloat(row.deposit_volume) || 0,
          withdrawal_volume: parseFloat(row.withdrawal_volume) || 0,
          transfer_volume: parseFloat(row.transfer_volume) || 0,
        });
      }

      // Transaction timeline
      const txTimeline: Array<{ timestamp: string; total: number; completed: number; failed: number; pending: number }> = [];
      for (const row of txStatusRows.rows) {
        const ts = row.ts instanceof Date ? row.ts.toISOString() : String(row.ts);
        txTimeline.push({
          timestamp: ts,
          total: parseInt(row.total) || 0,
          completed: parseInt(row.completed) || 0,
          failed: parseInt(row.failed) || 0,
          pending: parseInt(row.pending) || 0,
        });
      }

      // KPIs from tx values
      const txVal = txValueRows.rows[0] || {};
      const totalDeposits = splitPeriods(walletRows.rows, interval, 'deposits');
      const totalWithdrawals = splitPeriods(walletRows.rows, interval, 'withdrawals');
      const txCompleted = splitPeriods(txStatusRows.rows, interval, 'completed');
      const txFailed = splitPeriods(txStatusRows.rows, interval, 'failed');

      res.json({
        data: {
          kpi: {
            total_volume: parseFloat(txVal.total_volume) || 0,
            avg_transaction: Math.round((parseFloat(txVal.avg_amount) || 0) * 100) / 100,
            completed_volume: parseFloat(txVal.completed_volume) || 0,
            failed_volume: parseFloat(txVal.failed_volume) || 0,
            total_transactions: parseInt(txVal.total_count) || 0,
            deposits: { value: totalDeposits.current, previous: totalDeposits.previous, status: computeStatus(totalDeposits.current, totalDeposits.previous, false) },
            withdrawals: { value: totalWithdrawals.current, previous: totalWithdrawals.previous, status: computeStatus(totalWithdrawals.current, totalWithdrawals.previous, false) },
            tx_completed: { value: txCompleted.current, previous: txCompleted.previous, status: computeStatus(txCompleted.current, txCompleted.previous, false) },
            tx_failed: { value: txFailed.current, previous: txFailed.previous, status: computeStatus(txFailed.current, txFailed.previous, true) },
          },
          wallet_timeline: walletTimeline,
          transaction_timeline: txTimeline,
        },
      });
    } catch (error) {
      console.error('Stats v2 financial-flow error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── GET /api/stats/v2/leakage-funnel ────────────────────────

router.get(
  '/leakage-funnel',
  authenticateJWT,
  requirePermission('intelligence.view'),
  async (req: Request, res: Response) => {
    try {
      const { interval } = parseFilters(req);

      const [funnelResult, destResult, revenueResult, velocityResult] = await Promise.all([
        // Funnel counts by stage
        query(
          `SELECT stage, COUNT(*) AS count
           FROM leakage_events
           WHERE created_at > NOW() - $1::interval
           GROUP BY stage`,
          [interval]
        ),
        // Top destinations
        query(
          `SELECT platform_destination AS platform, COUNT(*) AS count
           FROM leakage_events
           WHERE created_at > NOW() - $1::interval
             AND platform_destination IS NOT NULL
           GROUP BY platform_destination
           ORDER BY count DESC
           LIMIT 10`,
          [interval]
        ),
        // Revenue impact
        query(
          `SELECT
             COALESCE(SUM(estimated_revenue_loss), 0) AS total_loss,
             COALESCE(AVG(estimated_revenue_loss), 0) AS avg_loss,
             COUNT(*) FILTER (WHERE stage = 'leakage') AS confirmed_leakages
           FROM leakage_events
           WHERE created_at > NOW() - $1::interval`,
          [interval]
        ),
        // Daily velocity (last 30 days for trend)
        query(
          `SELECT DATE_TRUNC('day', created_at) AS day,
                  COUNT(*) AS count,
                  COUNT(*) FILTER (WHERE stage = 'leakage') AS leakage_count
           FROM leakage_events
           WHERE created_at > NOW() - INTERVAL '30 days'
           GROUP BY day
           ORDER BY day ASC`
        ),
      ]);

      // Build funnel
      const funnel: Record<string, number> = { signal: 0, attempt: 0, confirmation: 0, leakage: 0 };
      for (const row of funnelResult.rows) {
        funnel[row.stage] = parseInt(row.count, 10);
      }

      // Build destinations
      const destinations = destResult.rows.map((r: { platform: string; count: string }) => ({
        platform: r.platform,
        count: parseInt(r.count, 10),
      }));

      // Revenue
      const revenue = {
        total_loss: parseFloat(revenueResult.rows[0]?.total_loss || '0'),
        avg_loss: parseFloat(revenueResult.rows[0]?.avg_loss || '0'),
        confirmed_leakages: parseInt(revenueResult.rows[0]?.confirmed_leakages || '0', 10),
      };

      // Velocity
      const velocity = velocityResult.rows.map((r: { day: string; count: string; leakage_count: string }) => ({
        day: r.day,
        count: parseInt(r.count, 10),
        leakage_count: parseInt(r.leakage_count, 10),
      }));

      res.json({
        data: { funnel, destinations, revenue, velocity },
      });
    } catch (error) {
      console.error('Stats leakage-funnel error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;

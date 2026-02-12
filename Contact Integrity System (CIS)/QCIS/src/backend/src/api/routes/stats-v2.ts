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

export default router;

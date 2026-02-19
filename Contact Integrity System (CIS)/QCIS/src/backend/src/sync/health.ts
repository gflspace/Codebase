// QwickServices CIS — Sync Health Monitor
// Detects stalled watermarks, high error rates, and latency spikes.
// Fires deduplicated alerts via the alerting engine.

import { query } from '../database/connection';
import { createAlert } from '../alerting/index';
import { SyncResult } from './poller';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

// ─── Types ──────────────────────────────────────────────────

export interface SyncHealthIssue {
  table: string;
  anomaly: 'stalled_watermark' | 'high_error_rate' | 'latency_spike';
  description: string;
  priority: string;
  metric?: number;
}

export interface SyncHealthReport {
  healthy: boolean;
  issues: SyncHealthIssue[];
  checkedAt: string;
  tables: Record<string, {
    recentRuns: number;
    errorRate: number;
    avgDurationMs: number;
    watermarkAdvancing: boolean;
  }>;
}

// ─── Alert Deduplication ────────────────────────────────────

const DEDUP_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const alertDedupMap = new Map<string, number>(); // key → timestamp of last alert

export function clearAlertDedupState(): void {
  alertDedupMap.clear();
}

function dedupKey(table: string, anomaly: string): string {
  return `${table}:${anomaly}`;
}

function shouldAlert(table: string, anomaly: string): boolean {
  const key = dedupKey(table, anomaly);
  const lastAlerted = alertDedupMap.get(key);
  if (lastAlerted && Date.now() - lastAlerted < DEDUP_WINDOW_MS) {
    return false;
  }
  alertDedupMap.set(key, Date.now());
  return true;
}

// ─── Quick Health Check (in-memory, no DB) ──────────────────

/**
 * Fast in-memory health check based on the current cycle's results.
 * No database queries — safe to call on every cycle.
 */
export function quickHealthCheck(results: SyncResult[]): { hasIssues: boolean; issues: SyncHealthIssue[] } {
  const issues: SyncHealthIssue[] = [];

  for (const r of results) {
    // High error rate in this cycle
    if (r.recordsFound > 0) {
      const errorRate = r.recordsFailed / r.recordsFound;
      if (errorRate > 0.2) {
        const priority = errorRate > 0.5 ? 'critical' : 'high';
        issues.push({
          table: r.sourceTable,
          anomaly: 'high_error_rate',
          description: `${(errorRate * 100).toFixed(0)}% failure rate (${r.recordsFailed}/${r.recordsFound} records)`,
          priority,
          metric: errorRate,
        });
      }
    }

    // Stalled watermark — records found but watermark didn't advance
    if (r.recordsFound > 0 && r.watermarkBefore === r.watermarkAfter) {
      issues.push({
        table: r.sourceTable,
        anomaly: 'stalled_watermark',
        description: `Watermark did not advance despite ${r.recordsFound} records found`,
        priority: 'high',
      });
    }
  }

  return { hasIssues: issues.length > 0, issues };
}

// ─── Full Health Check (DB-backed) ──────────────────────────

// Thresholds
const STALLED_CYCLE_THRESHOLD = 10; // Watermark not advancing for 10+ runs
const ERROR_RATE_THRESHOLD = 0.2;   // >20% failure rate
const LATENCY_SPIKE_MULTIPLIER = 2; // Current > 2x rolling average

/**
 * Comprehensive sync health check. Queries sync_run_log for anomalies
 * across recent cycles. Fires deduplicated alerts for detected issues.
 */
export async function checkSyncHealth(): Promise<SyncHealthReport> {
  const issues: SyncHealthIssue[] = [];
  const tables: SyncHealthReport['tables'] = {};

  try {
    // Get recent runs grouped by table (last 20 runs per table)
    const recentRuns = await query(
      `SELECT source_table, records_found, records_processed, records_failed,
              watermark_before, watermark_after, error,
              EXTRACT(EPOCH FROM (finished_at - started_at)) * 1000 AS duration_ms
       FROM sync_run_log
       WHERE started_at > NOW() - INTERVAL '2 hours'
       ORDER BY started_at DESC`
    );

    // Group runs by table
    const runsByTable = new Map<string, Record<string, unknown>[]>();
    for (const row of recentRuns.rows) {
      const table = String(row.source_table);
      if (!runsByTable.has(table)) runsByTable.set(table, []);
      runsByTable.get(table)!.push(row);
    }

    for (const [table, runs] of runsByTable) {
      const totalRuns = runs.length;
      const totalFailed = runs.reduce((sum, r) => sum + Number(r.records_failed || 0), 0);
      const totalFound = runs.reduce((sum, r) => sum + Number(r.records_found || 0), 0);
      const errorRate = totalFound > 0 ? totalFailed / totalFound : 0;
      const durations = runs
        .map(r => Number(r.duration_ms || 0))
        .filter(d => d > 0);
      const avgDuration = durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0;

      // Check stalled watermarks
      const runsWithRecords = runs.filter(r => Number(r.records_found) > 0);
      const stalledRuns = runsWithRecords.filter(
        r => String(r.watermark_before) === String(r.watermark_after)
      );
      const watermarkAdvancing = stalledRuns.length < STALLED_CYCLE_THRESHOLD;

      if (!watermarkAdvancing) {
        const issue: SyncHealthIssue = {
          table,
          anomaly: 'stalled_watermark',
          description: `Watermark not advancing for ${stalledRuns.length} cycles despite records found`,
          priority: 'high',
        };
        issues.push(issue);
        if (shouldAlert(table, 'stalled_watermark')) {
          await fireHealthAlert(issue);
        }
      }

      // Check error rate
      if (errorRate > ERROR_RATE_THRESHOLD) {
        const priority = errorRate > 0.5 ? 'critical' : 'high';
        const issue: SyncHealthIssue = {
          table,
          anomaly: 'high_error_rate',
          description: `${(errorRate * 100).toFixed(0)}% failure rate over ${totalRuns} recent runs`,
          priority,
          metric: errorRate,
        };
        issues.push(issue);
        if (shouldAlert(table, 'high_error_rate')) {
          await fireHealthAlert(issue);
        }
      }

      // Check latency spikes (latest run vs rolling average)
      if (durations.length >= 3) {
        const latestDuration = durations[0];
        const baseline = durations.slice(1).reduce((a, b) => a + b, 0) / (durations.length - 1);
        if (latestDuration > baseline * LATENCY_SPIKE_MULTIPLIER && baseline > 0) {
          const issue: SyncHealthIssue = {
            table,
            anomaly: 'latency_spike',
            description: `Latest run ${latestDuration.toFixed(0)}ms vs ${baseline.toFixed(0)}ms baseline (${(latestDuration / baseline).toFixed(1)}x)`,
            priority: 'medium',
            metric: latestDuration / baseline,
          };
          issues.push(issue);
          if (shouldAlert(table, 'latency_spike')) {
            await fireHealthAlert(issue);
          }
        }
      }

      tables[table] = {
        recentRuns: totalRuns,
        errorRate,
        avgDurationMs: Math.round(avgDuration),
        watermarkAdvancing,
      };
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Health] Sync health check failed: ${errorMsg}`);
    // Return degraded report — don't crash the sync cycle
  }

  return {
    healthy: issues.length === 0,
    issues,
    checkedAt: new Date().toISOString(),
    tables,
  };
}

// ─── Alert Helpers ──────────────────────────────────────────

async function fireHealthAlert(issue: SyncHealthIssue): Promise<void> {
  try {
    await createAlert({
      user_id: SYSTEM_USER_ID,
      priority: issue.priority,
      title: `Sync health: ${issue.anomaly} on ${issue.table}`,
      description: issue.description,
      source: 'sync_health_monitor',
      auto_generated: true,
      metadata: {
        table: issue.table,
        anomaly: issue.anomaly,
        metric: issue.metric,
      },
    });
  } catch (err) {
    console.error(`[Health] Failed to fire alert for ${issue.table}:${issue.anomaly}:`, err);
  }
}

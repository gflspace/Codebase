import type { Request, Response, NextFunction } from 'express';

// ─── Metrics Storage ──────────────────────────────────────────────

interface Metrics {
  http_requests_total: Map<string, number>;      // label: method_path_status
  http_request_duration_ms: Map<string, number[]>; // label: method_path
  db_queries_total: number;
  db_query_duration_ms: number[];
  events_processed_total: Map<string, number>;    // label: event_type
  active_connections: number;
}

const metrics: Metrics = {
  http_requests_total: new Map<string, number>(),
  http_request_duration_ms: new Map<string, number[]>(),
  db_queries_total: 0,
  db_query_duration_ms: [],
  events_processed_total: new Map<string, number>(),
  active_connections: 0,
};

const startTime = Date.now();

// ─── Path Normalization ───────────────────────────────────────────

const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

function normalizePath(path: string): string {
  return path.replace(UUID_REGEX, ':id');
}

// ─── Metrics Middleware ───────────────────────────────────────────

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  metrics.active_connections++;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const normalizedPath = normalizePath(req.path);
    const method = req.method;
    const status = res.statusCode;

    // Increment request counter
    const requestLabel = `${method}_${normalizedPath}_${status}`;
    const currentCount = metrics.http_requests_total.get(requestLabel) || 0;
    metrics.http_requests_total.set(requestLabel, currentCount + 1);

    // Record request duration
    const durationLabel = `${method}_${normalizedPath}`;
    const durations = metrics.http_request_duration_ms.get(durationLabel) || [];
    durations.push(duration);
    metrics.http_request_duration_ms.set(durationLabel, durations);

    metrics.active_connections--;
  });

  next();
}

// ─── Database Metrics ─────────────────────────────────────────────

export function recordDbQuery(durationMs: number): void {
  metrics.db_queries_total++;
  metrics.db_query_duration_ms.push(durationMs);

  // Keep only last 10,000 query durations to prevent memory bloat
  if (metrics.db_query_duration_ms.length > 10000) {
    metrics.db_query_duration_ms = metrics.db_query_duration_ms.slice(-5000);
  }
}

// ─── Event Metrics ────────────────────────────────────────────────

export function recordEventProcessed(eventType: string): void {
  const currentCount = metrics.events_processed_total.get(eventType) || 0;
  metrics.events_processed_total.set(eventType, currentCount + 1);
}

// ─── Quantile Calculation ─────────────────────────────────────────

function calculateQuantile(values: number[], quantile: number): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * quantile) - 1;
  return sorted[Math.max(0, index)];
}

// ─── Prometheus Text Format ──────────────────────────────────────

export function getMetricsText(): string {
  const lines: string[] = [];

  // HTTP request totals
  lines.push('# HELP http_requests_total Total HTTP requests');
  lines.push('# TYPE http_requests_total counter');
  for (const [label, count] of metrics.http_requests_total.entries()) {
    const [method, path, status] = label.split('_');
    const pathPart = label.substring(method.length + 1, label.lastIndexOf('_'));
    lines.push(`http_requests_total{method="${method}",path="${pathPart}",status="${status}"} ${count}`);
  }

  // HTTP request duration (quantiles)
  lines.push('');
  lines.push('# HELP http_request_duration_ms HTTP request duration in milliseconds');
  lines.push('# TYPE http_request_duration_ms summary');
  for (const [label, durations] of metrics.http_request_duration_ms.entries()) {
    const [method, ...pathParts] = label.split('_');
    const path = pathParts.join('_');

    if (durations.length > 0) {
      const p50 = calculateQuantile(durations, 0.5);
      const p95 = calculateQuantile(durations, 0.95);
      const p99 = calculateQuantile(durations, 0.99);

      lines.push(`http_request_duration_ms{method="${method}",path="${path}",quantile="0.5"} ${p50}`);
      lines.push(`http_request_duration_ms{method="${method}",path="${path}",quantile="0.95"} ${p95}`);
      lines.push(`http_request_duration_ms{method="${method}",path="${path}",quantile="0.99"} ${p99}`);
    }
  }

  // Database queries
  lines.push('');
  lines.push('# HELP db_queries_total Total database queries');
  lines.push('# TYPE db_queries_total counter');
  lines.push(`db_queries_total ${metrics.db_queries_total}`);

  // Database query duration
  if (metrics.db_query_duration_ms.length > 0) {
    lines.push('');
    lines.push('# HELP db_query_duration_ms Database query duration in milliseconds');
    lines.push('# TYPE db_query_duration_ms summary');
    const dbP50 = calculateQuantile(metrics.db_query_duration_ms, 0.5);
    const dbP95 = calculateQuantile(metrics.db_query_duration_ms, 0.95);
    const dbP99 = calculateQuantile(metrics.db_query_duration_ms, 0.99);
    lines.push(`db_query_duration_ms{quantile="0.5"} ${dbP50}`);
    lines.push(`db_query_duration_ms{quantile="0.95"} ${dbP95}`);
    lines.push(`db_query_duration_ms{quantile="0.99"} ${dbP99}`);
  }

  // Events processed
  if (metrics.events_processed_total.size > 0) {
    lines.push('');
    lines.push('# HELP events_processed_total Total events processed by type');
    lines.push('# TYPE events_processed_total counter');
    for (const [eventType, count] of metrics.events_processed_total.entries()) {
      lines.push(`events_processed_total{event_type="${eventType}"} ${count}`);
    }
  }

  // Active connections
  lines.push('');
  lines.push('# HELP active_connections Current number of active HTTP connections');
  lines.push('# TYPE active_connections gauge');
  lines.push(`active_connections ${metrics.active_connections}`);

  // Process uptime
  lines.push('');
  lines.push('# HELP process_uptime_seconds Process uptime in seconds');
  lines.push('# TYPE process_uptime_seconds gauge');
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  lines.push(`process_uptime_seconds ${uptimeSeconds}`);

  return lines.join('\n') + '\n';
}

// ─── Reset (for testing) ──────────────────────────────────────────

export function resetMetrics(): void {
  metrics.http_requests_total.clear();
  metrics.http_request_duration_ms.clear();
  metrics.db_queries_total = 0;
  metrics.db_query_duration_ms = [];
  metrics.events_processed_total.clear();
  metrics.active_connections = 0;
}

# QwickServices CIS — Load Testing Guide

## Overview

The load test script (`load-test.ts`) is a self-contained performance validation tool for the CIS backend. It validates the **<200ms p99 SLA** for the `/api/evaluate` endpoint as specified in `TARGET_ARCHITECTURE_v2.md`.

## Features

- **Zero external dependencies** — Uses native Node.js `fetch` API
- **Realistic payload generation** — Randomized booking/payment/provider scenarios
- **Configurable load profiles** — CLI-driven RPS, duration, and endpoint selection
- **Comprehensive metrics** — Latency percentiles (p50, p95, p99, max), throughput, error rates
- **SLA validation** — Automatic pass/fail check against 200ms p99 target
- **Dual authentication** — Supports both HMAC (service-to-service) and JWT (admin testing)

## Usage

### Basic Examples

```bash
# Default: 10 RPS for 10s against /api/evaluate
npx tsx src/backend/scripts/load-test.ts

# Higher load: 50 RPS for 30 seconds
npx tsx src/backend/scripts/load-test.ts --rps=50 --duration=30

# Sustained load: 100 RPS for 2 minutes
npx tsx src/backend/scripts/load-test.ts --rps=100 --duration=120

# Test webhook ingestion throughput
npx tsx src/backend/scripts/load-test.ts --endpoint=webhooks/ingest --rps=100

# Health check baseline (GET)
npx tsx src/backend/scripts/load-test.ts --endpoint=health --rps=200
```

### Production Testing

```bash
# Test production endpoint with JWT token
npx tsx src/backend/scripts/load-test.ts \
  --url=https://api-cis.qwickservices.com \
  --token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... \
  --rps=25 \
  --duration=60
```

### CLI Arguments

| Argument | Default | Description |
|----------|---------|-------------|
| `--rps=N` | `10` | Target requests per second |
| `--duration=N` | `10` | Test duration in seconds |
| `--endpoint=PATH` | `evaluate` | Endpoint to test (`evaluate`, `webhooks/ingest`, `health`) |
| `--url=URL` | `http://localhost:3001` | Base URL of CIS backend |
| `--token=JWT` | *(uses HMAC)* | JWT token for authentication (overrides HMAC) |

## Output Format

```
═══════════════════════════════════════════════════════════════════
  QwickServices CIS — Load Test
═══════════════════════════════════════════════════════════════════
  Target RPS:     50
  Duration:       30s
  Endpoint:       evaluate
  Base URL:       http://localhost:3001
───────────────────────────────────────────────────────────────────
  Progress: 100% | Requests: 1500 | Avg latency: 45ms
───────────────────────────────────────────────────────────────────

  RESULTS
═══════════════════════════════════════════════════════════════════
  Total requests:    1,500
  Successful:        1,498 (99.87%)
  Failed:            2 (0.13%)
  Actual RPS:        49.9
  Duration:          30.06s

  STATUS CODE DISTRIBUTION
───────────────────────────────────────────────────────────────────
  200:    1,498 (99.87%)
  500:        2 (0.13%)

  LATENCY DISTRIBUTION (ms)
───────────────────────────────────────────────────────────────────
  Min:      12
  p50:      38
  p75:      52
  p90:      78
  p95:     105
  p99:     145
  Max:     312
  Avg:      45

  SLA CHECK
───────────────────────────────────────────────────────────────────
  Target:    p99 < 200ms
  Actual:    p99 = 145ms
  Status:    ✓ PASS

═══════════════════════════════════════════════════════════════════
```

## SLA Targets

From `TARGET_ARCHITECTURE_v2.md` (Phase 3B):

| Endpoint | p99 Target | p95 Target | Notes |
|----------|------------|------------|-------|
| `/api/evaluate` | **<200ms** | <150ms | Pre-transaction blocking (hot path) |
| `/api/webhooks/ingest` | <500ms | <300ms | Async processing (returns 202) |
| `/api/health` | <50ms | <25ms | Lightweight health check |

## Load Test Scenarios

### Scenario 1: Pre-Production Validation
**Goal:** Validate SLA before deploying new scoring logic

```bash
# Run 5-minute sustained load at expected peak RPS
npx tsx src/backend/scripts/load-test.ts --rps=75 --duration=300
```

**Success criteria:**
- p99 latency <200ms
- Error rate <0.5%
- No memory leaks (stable RPS throughout duration)

### Scenario 2: Capacity Planning
**Goal:** Find maximum RPS before SLA degradation

```bash
# Gradually increase load
for rps in 25 50 100 150 200; do
  echo "Testing $rps RPS..."
  npx tsx src/backend/scripts/load-test.ts --rps=$rps --duration=60 | tee "results-${rps}rps.log"
  sleep 10
done
```

**Look for:**
- RPS where p99 crosses 200ms threshold
- Error rate inflection point
- Database connection pool saturation

### Scenario 3: Shadow Mode Baseline
**Goal:** Measure overhead of enforcement logic in shadow mode

```bash
# With shadow mode enabled (default)
npx tsx src/backend/scripts/load-test.ts --rps=50 --duration=60 > shadow-on.log

# Compare with kill switch active (no enforcement)
# (requires config change: enforcementKillSwitch=true)
npx tsx src/backend/scripts/load-test.ts --rps=50 --duration=60 > kill-switch.log

# Diff latencies to measure enforcement overhead
```

## Interpreting Results

### ✓ PASS Criteria
- p99 latency <200ms
- Error rate <1%
- Status codes: mostly 200 (or 202 for webhooks)
- Actual RPS ≥90% of target RPS

### ✗ FAIL Indicators
- **p99 >200ms** → Database query optimization needed (check indexes)
- **High error rate** → Connection pool saturation or enforcement logic errors
- **Actual RPS << target RPS** → Rate limiting or bottleneck upstream
- **Bimodal latency distribution** → Database timeout/retry logic kicking in

## Troubleshooting

### Issue: p99 latency >>200ms
**Root causes:**
- Missing database indexes (check `risk_scores.user_id`, `risk_signals.user_id`)
- Slow enforcement history queries (optimize with materialized views)
- Network latency (if testing remote endpoint)

**Diagnosis:**
```sql
-- Check slow queries during load test
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE query LIKE '%risk_scores%' OR query LIKE '%risk_signals%'
ORDER BY mean_exec_time DESC LIMIT 10;
```

### Issue: High error rate (>1%)
**Root causes:**
- Database connection pool exhausted
- Enforcement logic throwing unhandled exceptions
- HMAC signature validation failing (clock skew)

**Diagnosis:**
- Check backend logs for stack traces
- Verify database `max_connections` setting
- Confirm test secret matches backend config (`config.hmac.secret`)

### Issue: Actual RPS << target RPS
**Root causes:**
- Client-side rate limiting (intervalMs too conservative)
- Network bandwidth saturation
- Server rejecting requests (429 Too Many Requests)

**Fix:**
- Increase duration to smooth out startup overhead
- Run from low-latency network (same AWS region as server)
- Check Nginx/Express rate limit configs

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Load Test

on:
  pull_request:
    paths:
      - 'src/backend/src/scoring/**'
      - 'src/backend/src/enforcement/**'
      - 'src/backend/src/api/routes/evaluate.ts'

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Start CIS backend
        run: |
          npm install
          npm run build
          npm run start:test &
          sleep 5

      - name: Run load test
        run: npx tsx src/backend/scripts/load-test.ts --rps=50 --duration=30

      - name: Check SLA
        run: |
          # Parse output and fail if p99 >200ms
          # (implement in separate script or use jq if JSON output added)
```

## Performance Benchmarks

### Expected Results (MacBook Pro M1, PostgreSQL 15, local)

| RPS | p50 | p95 | p99 | Max | Error Rate |
|-----|-----|-----|-----|-----|------------|
| 10  | 15ms | 25ms | 35ms | 45ms | 0% |
| 25  | 22ms | 38ms | 55ms | 85ms | 0% |
| 50  | 35ms | 65ms | 95ms | 150ms | <0.1% |
| 100 | 58ms | 120ms | 175ms | 280ms | <0.5% |
| 200 | 95ms | 190ms | 245ms | 450ms | 1.2% ⚠️ |

> **Note:** Results vary based on hardware, database tuning, and enforcement rule complexity. Measure your own baseline.

## Best Practices

1. **Always warm up** — First 10-20 requests may be slower (JIT compilation, cache warming)
2. **Run multiple iterations** — One-off spikes are normal; look for trends across 3+ runs
3. **Monitor database** — Watch connection pool usage, query plans, lock contention
4. **Test realistic payloads** — Use production-like metadata sizes and field distributions
5. **Isolate variables** — Change one parameter at a time (RPS vs. payload size vs. endpoint)

## Next Steps

- **Automated regression testing** — Add to CI/CD to catch performance regressions
- **Distributed load testing** — Use k6 or Artillery for multi-region tests
- **Production profiling** — Add OpenTelemetry for request-level tracing
- **Database optimization** — Materialize enforcement history queries, add partial indexes

---

**Related:**
- `TARGET_ARCHITECTURE_v2.md` — SLA requirements and architecture context
- `src/backend/tests/integration/laravel-e2e.test.ts` — Functional correctness tests
- `src/backend/src/api/routes/evaluate.ts` — Endpoint implementation

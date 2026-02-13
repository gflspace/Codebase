# E2E Smoke Test Suite

Complete end-to-end smoke test suite that runs against real PostgreSQL + Redis services (via Docker). This is different from the existing unit/integration tests which mock external dependencies.

## Overview

The E2E test suite validates the entire CIS pipeline from webhook ingestion through risk scoring, enforcement evaluation, and alerting. It tests:

- Real database queries (PostgreSQL)
- Real event bus (Redis)
- Real HTTP endpoints
- Real async processing pipelines
- Complete request/response flows

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ E2E Test Suite                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐      ┌─────────────────────────────┐    │
│  │  smoke.test  │─────▶│  CIS Backend (Express)      │    │
│  │              │ HTTP │  - No mocks                  │    │
│  │  - Health    │      │  - Real routes               │    │
│  │  - Auth      │      │  - Real consumers            │    │
│  │  - Webhooks  │      └─────────────────────────────┘    │
│  │  - Evaluate  │               │           │              │
│  │  - Rules     │               ▼           ▼              │
│  │  - Alerts    │      ┌──────────┐  ┌──────────┐         │
│  └──────────────┘      │ Postgres │  │  Redis   │         │
│                        │  (5433)  │  │  (6380)  │         │
│                        └──────────┘  └──────────┘         │
│                        Docker Compose Test Services       │
└─────────────────────────────────────────────────────────────┘
```

## Files

- **`docker-compose.test.yml`** — Test infrastructure (PostgreSQL + Redis)
- **`vitest.e2e.config.ts`** — Vitest configuration for E2E tests
- **`global-setup.ts`** — Starts Docker services and runs migrations (once)
- **`global-teardown.ts`** — Stops Docker services (once)
- **`setup.ts`** — Test utilities (server lifecycle, HMAC signing, admin seeding)
- **`smoke.test.ts`** — Main E2E smoke tests (11 test suites, sequential)
- **`run-e2e.sh`** — Shell script orchestrator (Linux/Mac)
- **`run-e2e.ps1`** — PowerShell script orchestrator (Windows)

## Prerequisites

1. **Docker Desktop** — Must be running
2. **Node.js 18+** — For running tests
3. **Ports Available** — 5433 (PostgreSQL), 6380 (Redis)

## Running the Tests

### Option 1: Using the Shell Script (Recommended for Linux/Mac)

```bash
cd src/backend
chmod +x tests/e2e/run-e2e.sh
./tests/e2e/run-e2e.sh
```

### Option 2: Using PowerShell (Recommended for Windows)

```powershell
cd src/backend
.\tests\e2e\run-e2e.ps1
```

### Option 3: Manual Execution

```bash
# 1. Start services
docker-compose -f docker-compose.test.yml up -d

# 2. Wait for services (check health)
docker-compose -f docker-compose.test.yml ps

# 3. Run tests
npx vitest run tests/e2e/ --config vitest.e2e.config.ts

# 4. Teardown
docker-compose -f docker-compose.test.yml down -v
```

## Test Environment

The E2E tests use isolated test credentials:

```env
DB_HOST=localhost
DB_PORT=5433
DB_NAME=qwick_cis_test
DB_USER=cis_test_user
DB_PASSWORD=cis_test_password
DB_SSL=false
REDIS_URL=redis://localhost:6380
EVENT_BUS_BACKEND=redis
JWT_SECRET=e2e-test-jwt-secret-minimum-32-chars!!
HMAC_SECRET=e2e-test-hmac-secret-minimum-32-chars!!
WEBHOOK_SECRET=e2e-test-webhook-secret-min-32-chars!!
SHADOW_MODE=false
NODE_ENV=test
LOG_LEVEL=error
SCORING_MODEL=5-component
```

**Admin credentials:**
- Email: `e2e-admin@qwickservices.test`
- Password: `E2ETestPass123!@#`

## Test Suites

### 1. Health Check
- Verifies `/api/health` returns 200
- Confirms database connection

### 2. Admin Login
- Authenticates admin user
- Retrieves JWT token
- Validates token on protected routes

### 3. Webhook Ingestion — Booking Created
- Posts `booking-save` webhook
- Verifies HMAC signature validation
- Tests idempotency (duplicate rejection)

### 4. Webhook Ingestion — Message with Suspicious Content
- Posts `message-save` webhook with off-platform signals
- Triggers detection pipeline

### 5. Verify Risk Signals Generated
- Queries database for risk signals (CONTACT_PHONE, OFF_PLATFORM_INTENT, PAYMENT_EXTERNAL)
- Verifies risk score calculation

### 6. Synchronous Evaluation
- Tests `/api/evaluate` with HMAC auth
- Tests with JWT auth (admin testing)
- Validates decision, risk_score, risk_tier, evaluation_time_ms
- Performance check: evaluation < 500ms

### 7. Webhook — Multiple Suspicious Messages (Escalation)
- Sends 3 additional suspicious messages
- Verifies score escalation
- Re-evaluates to confirm higher risk tier

### 8. Admin Rules CRUD
- Creates a new admin rule
- Lists rules (GET)
- Updates rule priority (PUT)
- Disables rule (DELETE)
- Verifies version increments

### 9. Alerts Generated
- Queries `/api/alerts` for test user
- Verifies at least one alert exists
- Retrieves alert details

### 10. Metrics Endpoint
- Fetches `/api/metrics`
- Verifies Prometheus metrics format
- Checks for key metrics (http_requests_total, db_queries_total, events_processed_total)

### 11. Stats Endpoint
- Fetches `/api/stats`
- Validates dashboard statistics (users, risk_scores, enforcement_actions)

## Test Execution Flow

Tests run **SEQUENTIALLY** (not in parallel) because they build on each other:

1. Global setup (starts Docker, runs migrations) — **once**
2. Test suite setup (seeds admin, starts server)
3. Test 1: Health check
4. Test 2: Admin login → stores JWT token
5. Test 3: Webhook booking → creates user
6. Test 4: Webhook message → detects signals
7. Test 5: Verify signals in DB
8. Test 6: Evaluate user
9. Test 7: Send more messages → escalate score
10. Test 8: Test admin rules CRUD
11. Test 9: Verify alerts
12. Test 10: Check metrics
13. Test 11: Check stats
14. Test suite teardown (stops server)
15. Global teardown (stops Docker) — **once**

## Performance Expectations

- **Total suite runtime:** ~30-45 seconds
- **Individual evaluation:** < 500ms
- **Webhook processing:** 200-400ms (async, plus 2s wait)
- **Database migrations:** 5-10 seconds

## Troubleshooting

### Port Already in Use

If ports 5433 or 6380 are already in use:

```bash
# Check what's using the port
lsof -i :5433  # Mac/Linux
netstat -ano | findstr :5433  # Windows

# Stop existing containers
docker-compose -f docker-compose.test.yml down -v
```

### PostgreSQL Not Ready

If PostgreSQL health checks fail:

```bash
# Check container logs
docker-compose -f docker-compose.test.yml logs test-postgres

# Restart services
docker-compose -f docker-compose.test.yml restart
```

### Redis Connection Issues

```bash
# Test Redis connection
docker-compose -f docker-compose.test.yml exec test-redis redis-cli ping

# Should return: PONG
```

### Migration Failures

If migrations fail:

```bash
# Check migration status
docker-compose -f docker-compose.test.yml exec -T test-postgres \
  psql -U cis_test_user -d qwick_cis_test -c "SELECT * FROM schema_migrations ORDER BY id DESC LIMIT 5;"

# Manually run migrations
DB_HOST=localhost DB_PORT=5433 DB_NAME=qwick_cis_test \
DB_USER=cis_test_user DB_PASSWORD=cis_test_password DB_SSL=false \
npx tsx scripts/migrate.ts
```

### Tests Hang or Timeout

Increase timeouts in `vitest.e2e.config.ts`:

```typescript
testTimeout: 120000, // 2 minutes
hookTimeout: 120000,
```

## Cleaning Up

### Remove All Test Data

```bash
docker-compose -f docker-compose.test.yml down -v
```

The `-v` flag removes volumes, ensuring a clean slate for next run.

### Remove Docker Images

```bash
docker rmi postgres:15-alpine redis:7-alpine
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: cd src/backend && npm ci
      - name: Run E2E tests
        run: cd src/backend && ./tests/e2e/run-e2e.sh
```

## Differences from Unit/Integration Tests

| Aspect | Unit/Integration Tests | E2E Tests |
|--------|------------------------|-----------|
| Database | Mocked | Real PostgreSQL |
| Redis | Mocked | Real Redis |
| HTTP Server | Express mock | Real Express server |
| Event Bus | In-memory mock | Real Redis event bus |
| Consumers | Not registered | All 17 consumers active |
| Parallelism | Parallel | Sequential |
| Isolation | Per-test | Shared state |
| Runtime | < 1s per test | 30-45s total |

## Best Practices

1. **Run E2E tests before deployment** — They catch integration issues unit tests miss
2. **Don't run in parallel** — Tests build on each other
3. **Clean database between runs** — Use `cleanupDatabase()` in setup
4. **Check Docker Desktop** — Ensure it's running and not resource-constrained
5. **Monitor timing** — If evaluation_time_ms > 500ms, investigate performance

## Future Enhancements

- [ ] Add test for alert subscriptions (email/Slack notifications)
- [ ] Add test for appeal workflow
- [ ] Add test for case management
- [ ] Add test for AI content analysis endpoints
- [ ] Add load testing (concurrent requests)
- [ ] Add test for SSE streaming endpoints
- [ ] Add test for rate limiting behavior
- [ ] Add test for graceful shutdown

## Maintenance

### When Adding New Migrations

E2E tests will automatically run new migrations on startup. No changes needed.

### When Adding New Endpoints

Add test cases to `smoke.test.ts`:

```typescript
describe('12. New Endpoint', () => {
  it('should handle new functionality', async () => {
    const response = await fetch(`${baseUrl}/api/new-endpoint`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(response.status).toBe(200);
  });
});
```

### When Changing Authentication

Update `setup.ts` helpers:
- `signHmac()` — For HMAC-authenticated endpoints
- `signWebhook()` — For webhook signature verification
- `generateAdminToken()` — For JWT-authenticated endpoints

## Support

For issues or questions:
1. Check Docker logs: `docker-compose -f docker-compose.test.yml logs`
2. Review test output for specific failures
3. Verify ports 5433 and 6380 are available
4. Ensure Docker has sufficient memory (4GB+ recommended)

# E2E Tests — Quick Start

Run complete end-to-end tests against real PostgreSQL + Redis services.

## TL;DR

### Windows (PowerShell)
```powershell
cd D:\Codebase\Contact Integrity System (CIS)\QCIS\src\backend
.\tests\e2e\run-e2e.ps1
```

### Linux/Mac (Bash)
```bash
cd /path/to/QCIS/src/backend
chmod +x tests/e2e/run-e2e.sh
./tests/e2e/run-e2e.sh
```

### Manual (Any OS)
```bash
# Install dependencies (first time only)
npm install

# Start services
docker-compose -f docker-compose.test.yml up -d

# Run tests
npm run test:e2e

# Cleanup
docker-compose -f docker-compose.test.yml down -v
```

## What Gets Tested

✅ Health check & readiness probes
✅ Admin authentication (JWT)
✅ Webhook ingestion (HMAC verification)
✅ Risk signal detection pipeline
✅ Risk scoring (5-component model)
✅ Synchronous evaluation endpoint
✅ Risk escalation on repeated violations
✅ Admin rules CRUD operations
✅ Alert generation
✅ Prometheus metrics
✅ Dashboard statistics

## Expected Output

```
════════════════════════════════════════════════════════════
  QwickServices CIS — E2E Test Runner
════════════════════════════════════════════════════════════

[1/5] Starting Docker Compose services...
[2/5] Waiting for PostgreSQL to be ready...
  ✓ PostgreSQL is ready
[3/5] Waiting for Redis to be ready...
  ✓ Redis is ready
[4/5] Running E2E tests...

─── Starting E2E Smoke Tests ───

[Setup] Cleaning database...
[Setup] Seeding admin user...
  ✓ Admin user created
[Setup] Starting test server...
  ✓ Test server started on port 54321
[Setup] E2E environment ready

 ✓ tests/e2e/smoke.test.ts (33)
   ✓ E2E Pipeline Smoke Tests (33)
     ✓ 1. Health Check (1)
     ✓ 2. Admin Login (2)
     ✓ 3. Webhook Ingestion — Booking Created (2)
     ✓ 4. Webhook Ingestion — Message with Suspicious Content (1)
     ✓ 5. Verify Risk Signals Generated (2)
     ✓ 6. Synchronous Evaluation (2)
     ✓ 7. Webhook — Multiple Suspicious Messages (2)
     ✓ 8. Admin Rules CRUD (4)
     ✓ 9. Alerts Generated (2)
     ✓ 10. Metrics Endpoint (1)
     ✓ 11. Stats Endpoint (1)

Test Files  1 passed (1)
     Tests  33 passed (33)
  Start at  10:15:23
  Duration  38.45s

[5/5] Tearing down Docker Compose services...

════════════════════════════════════════════════════════════
  ✓ E2E Test Suite Complete — All Passed
════════════════════════════════════════════════════════════
```

## Troubleshooting

### "Port 5433 is already in use"

```bash
# Stop existing test containers
docker-compose -f docker-compose.test.yml down -v

# Or change the port in docker-compose.test.yml
```

### "Docker not running"

Start Docker Desktop and try again.

### "Migrations failed"

```bash
# Check database logs
docker-compose -f docker-compose.test.yml logs test-postgres

# Manually run migrations
DB_HOST=localhost DB_PORT=5433 DB_NAME=qwick_cis_test \
DB_USER=cis_test_user DB_PASSWORD=cis_test_password DB_SSL=false \
npx tsx scripts/migrate.ts
```

### "Tests timeout"

Increase memory for Docker Desktop (Settings → Resources → Memory → 4GB+)

## Performance Benchmarks

- **Total suite:** 30-45 seconds
- **Evaluation latency:** < 500ms
- **Webhook processing:** 200-400ms
- **Database migrations:** 5-10 seconds

## What's Different from Unit Tests?

| Feature | Unit Tests | E2E Tests |
|---------|-----------|-----------|
| Database | Mocked | Real PostgreSQL |
| Redis | Mocked | Real Redis |
| HTTP | Mocked | Real Express server |
| Speed | < 1s | 30-45s |
| Isolation | High | Low (shared state) |

## CI/CD

Run in CI with:

```yaml
- name: Run E2E Tests
  run: |
    cd src/backend
    ./tests/e2e/run-e2e.sh
```

## Need Help?

See full documentation: [tests/e2e/README.md](./README.md)

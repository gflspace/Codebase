# E2E Test Suite Index

Complete end-to-end smoke test suite for the QwickServices Contact Integrity System (CIS).

## Quick Links

- **[QUICKSTART.md](./QUICKSTART.md)** — Get running in 60 seconds
- **[README.md](./README.md)** — Full documentation (500+ lines)
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** — What was built and why

## File Structure

```
tests/e2e/
├── index.md                      # This file
├── QUICKSTART.md                 # Quick reference guide
├── README.md                     # Complete documentation
├── IMPLEMENTATION_SUMMARY.md     # Implementation overview
│
├── global-setup.ts               # Vitest global setup (Docker + migrations)
├── global-teardown.ts            # Vitest global teardown (cleanup)
├── setup.ts                      # Test utilities and helpers
├── matchers.ts                   # Custom Vitest matchers
├── smoke.test.ts                 # Main test suite (33 tests)
│
├── run-e2e.js                    # Cross-platform runner (Node.js)
├── run-e2e.sh                    # Linux/Mac runner (Bash)
└── run-e2e.ps1                   # Windows runner (PowerShell)
```

## Running Tests

### Recommended (Any OS)
```bash
npm run test:e2e:full
```

### Platform-Specific

**Windows:**
```powershell
.\tests\e2e\run-e2e.ps1
```

**Linux/Mac:**
```bash
./tests/e2e/run-e2e.sh
```

**Manual:**
```bash
docker-compose -f docker-compose.test.yml up -d
npm run test:e2e
docker-compose -f docker-compose.test.yml down -v
```

## Test Suites (11 Total)

| # | Suite Name | Tests | What It Tests |
|---|-----------|-------|---------------|
| 1 | Health Check | 1 | API health endpoint + DB connection |
| 2 | Admin Login | 2 | JWT authentication + protected routes |
| 3 | Webhook — Booking | 2 | HMAC verification + idempotency |
| 4 | Webhook — Message | 1 | Suspicious content detection |
| 5 | Risk Signals | 2 | Signal generation + score calculation |
| 6 | Synchronous Evaluation | 2 | `/api/evaluate` with HMAC + JWT |
| 7 | Risk Escalation | 2 | Multiple violations → higher score |
| 8 | Admin Rules CRUD | 4 | Create, read, update, delete rules |
| 9 | Alerts | 2 | Alert generation + retrieval |
| 10 | Metrics | 1 | Prometheus metrics endpoint |
| 11 | Stats | 1 | Dashboard statistics |

**Total: 33 tests**

## Key Features

✅ **Real Services** — PostgreSQL + Redis (no mocks)
✅ **Real Pipeline** — 17 event consumers active
✅ **Complete Flow** — Webhooks → Detection → Scoring → Enforcement → Alerts
✅ **Performance Tests** — Evaluation < 500ms
✅ **Security Tests** — HMAC verification + JWT auth
✅ **Idempotency** — Duplicate webhook rejection
✅ **Observability** — Metrics + health checks

## Prerequisites

1. **Docker Desktop** — Running and healthy
2. **Node.js 18+** — For test execution
3. **Available Ports** — 5433 (PostgreSQL), 6380 (Redis)

## Expected Runtime

- **Total:** 30-45 seconds
- **Docker startup:** 5-10 seconds
- **Migrations:** 5-10 seconds
- **Tests:** 15-25 seconds
- **Teardown:** 2-5 seconds

## Test Environment

| Resource | Value |
|----------|-------|
| PostgreSQL | localhost:5433 |
| Redis | localhost:6380 |
| Database | qwick_cis_test |
| Admin Email | e2e-admin@qwickservices.test |
| Shadow Mode | false (enforcement active) |
| Event Bus | Redis (durable) |

## Success Criteria

✅ All 33 tests pass
✅ Evaluation latency < 500ms
✅ No database errors
✅ No event bus errors
✅ Clean Docker teardown

## Troubleshooting

### Port in Use
```bash
docker-compose -f docker-compose.test.yml down -v
```

### Service Not Ready
```bash
docker-compose -f docker-compose.test.yml logs test-postgres
docker-compose -f docker-compose.test.yml logs test-redis
```

### Test Failures
```bash
# Run with verbose output
npx vitest run tests/e2e/ --config vitest.e2e.config.ts --reporter=verbose
```

## CI/CD Integration

### GitHub Actions
```yaml
- name: E2E Tests
  run: npm run test:e2e:full
```

### GitLab CI
```yaml
script:
  - npm run test:e2e:full
```

## Documentation

| File | Purpose | Lines |
|------|---------|-------|
| QUICKSTART.md | Quick reference | 150 |
| README.md | Complete docs | 500+ |
| IMPLEMENTATION_SUMMARY.md | Architecture | 400+ |

## Test Data

**Test User:** `test-user-001`
**Test Provider:** `test-provider-001`
**Admin User:** `e2e-admin@qwickservices.test`

All test data is created during test execution and cleaned up between runs.

## Next Steps

1. Read [QUICKSTART.md](./QUICKSTART.md) to run tests immediately
2. Review [README.md](./README.md) for detailed documentation
3. Check [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) for architecture details
4. Run `npm run test:e2e:full` to execute tests

## Maintenance

### Adding Tests
1. Add test case to `smoke.test.ts`
2. Use helpers from `setup.ts`
3. Update README with test description

### Debugging
1. Check Docker logs
2. Inspect database state
3. Run with verbose logging
4. Review test output

## Support

Questions? Check:
1. [QUICKSTART.md](./QUICKSTART.md) for common scenarios
2. [README.md](./README.md) troubleshooting section
3. Docker logs for service issues
4. Vitest output for test failures

---

**Status:** ✅ Ready to use
**Version:** 1.0.0
**Last Updated:** 2026-02-13

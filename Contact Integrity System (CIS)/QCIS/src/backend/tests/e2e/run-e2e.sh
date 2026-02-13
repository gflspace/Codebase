#!/bin/bash
# QwickServices CIS — E2E Test Runner
# Orchestrates Docker services, runs E2E tests, and tears down cleanly

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "════════════════════════════════════════════════════════════"
echo "  QwickServices CIS — E2E Test Runner"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Backend directory: ${BACKEND_DIR}"
echo ""

cd "${BACKEND_DIR}"

# ─── 1. Start Docker Compose services ────────────────────────────

echo "[1/5] Starting Docker Compose services..."
docker-compose -f docker-compose.test.yml up -d

# ─── 2. Wait for PostgreSQL ───────────────────────────────────────

echo "[2/5] Waiting for PostgreSQL to be ready..."
RETRY_COUNT=0
MAX_RETRIES=30

until docker-compose -f docker-compose.test.yml exec -T test-postgres pg_isready -U cis_test_user -d qwick_cis_test > /dev/null 2>&1; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "✗ PostgreSQL did not become ready in time"
    docker-compose -f docker-compose.test.yml down -v
    exit 1
  fi
  echo "  Waiting... (attempt ${RETRY_COUNT}/${MAX_RETRIES})"
  sleep 1
done

echo "  ✓ PostgreSQL is ready"

# ─── 3. Wait for Redis ────────────────────────────────────────────

echo "[3/5] Waiting for Redis to be ready..."
RETRY_COUNT=0

until docker-compose -f docker-compose.test.yml exec -T test-redis redis-cli ping | grep -q PONG; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "✗ Redis did not become ready in time"
    docker-compose -f docker-compose.test.yml down -v
    exit 1
  fi
  echo "  Waiting... (attempt ${RETRY_COUNT}/${MAX_RETRIES})"
  sleep 1
done

echo "  ✓ Redis is ready"

# ─── 4. Run E2E tests ─────────────────────────────────────────────

echo "[4/5] Running E2E tests..."
echo ""

set +e  # Don't exit on test failure (we need to cleanup)

npx vitest run tests/e2e/ --config vitest.e2e.config.ts

EXIT_CODE=$?

set -e

echo ""
if [ $EXIT_CODE -eq 0 ]; then
  echo "✓ All E2E tests passed"
else
  echo "✗ Some E2E tests failed (exit code: ${EXIT_CODE})"
fi

# ─── 5. Teardown ──────────────────────────────────────────────────

echo "[5/5] Tearing down Docker Compose services..."
docker-compose -f docker-compose.test.yml down -v

echo ""
echo "════════════════════════════════════════════════════════════"
if [ $EXIT_CODE -eq 0 ]; then
  echo "  ✓ E2E Test Suite Complete — All Passed"
else
  echo "  ✗ E2E Test Suite Complete — Some Failed"
fi
echo "════════════════════════════════════════════════════════════"
echo ""

exit $EXIT_CODE

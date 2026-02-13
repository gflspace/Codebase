#!/usr/bin/env node
/**
 * E2E Test Runner — Cross-platform JavaScript version
 *
 * This script orchestrates Docker services and runs E2E tests.
 * Works on Windows, Linux, and Mac without requiring bash or PowerShell.
 *
 * Usage:
 *   node tests/e2e/run-e2e.js
 *   npm run test:e2e:full
 */

const { execSync, spawn } = require('child_process');
const path = require('path');

const BACKEND_DIR = path.resolve(__dirname, '../..');
const COMPOSE_FILE = 'docker-compose.test.yml';
const MAX_RETRIES = 30;

let exitCode = 0;

// ─── Logging Helpers ─────────────────────────────────────────────

function log(message) {
  console.log(message);
}

function logSection(title) {
  console.log('\n════════════════════════════════════════════════════════════');
  console.log(`  ${title}`);
  console.log('════════════════════════════════════════════════════════════\n');
}

function logStep(step, total, message) {
  console.log(`[${step}/${total}] ${message}`);
}

function logSuccess(message) {
  console.log(`  ✓ ${message}`);
}

function logError(message) {
  console.error(`  ✗ ${message}`);
}

// ─── Execution Helpers ───────────────────────────────────────────

function exec(command, options = {}) {
  try {
    return execSync(command, {
      cwd: BACKEND_DIR,
      stdio: options.silent ? 'pipe' : 'inherit',
      encoding: 'utf-8',
      ...options,
    });
  } catch (error) {
    if (options.silent) {
      return null;
    }
    throw error;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Service Health Checks ───────────────────────────────────────

async function waitForPostgres() {
  logStep(2, 5, 'Waiting for PostgreSQL to be ready...');

  for (let i = 0; i < MAX_RETRIES; i++) {
    const result = exec(
      `docker-compose -f ${COMPOSE_FILE} exec -T test-postgres pg_isready -U cis_test_user -d qwick_cis_test`,
      { silent: true }
    );

    if (result) {
      logSuccess('PostgreSQL is ready');
      return true;
    }

    process.stdout.write(`  Waiting... (attempt ${i + 1}/${MAX_RETRIES})\r`);
    await sleep(1000);
  }

  logError('PostgreSQL did not become ready in time');
  return false;
}

async function waitForRedis() {
  logStep(3, 5, 'Waiting for Redis to be ready...');

  for (let i = 0; i < MAX_RETRIES; i++) {
    const result = exec(
      `docker-compose -f ${COMPOSE_FILE} exec -T test-redis redis-cli ping`,
      { silent: true }
    );

    if (result && result.includes('PONG')) {
      logSuccess('Redis is ready');
      return true;
    }

    process.stdout.write(`  Waiting... (attempt ${i + 1}/${MAX_RETRIES})\r`);
    await sleep(1000);
  }

  logError('Redis did not become ready in time');
  return false;
}

// ─── Main Workflow ───────────────────────────────────────────────

async function main() {
  logSection('QwickServices CIS — E2E Test Runner');
  log(`Backend directory: ${BACKEND_DIR}\n`);

  try {
    // Step 1: Start Docker Compose services
    logStep(1, 5, 'Starting Docker Compose services...');
    exec(`docker-compose -f ${COMPOSE_FILE} up -d`);

    // Step 2: Wait for PostgreSQL
    const pgReady = await waitForPostgres();
    if (!pgReady) {
      throw new Error('PostgreSQL health check failed');
    }

    // Step 3: Wait for Redis
    const redisReady = await waitForRedis();
    if (!redisReady) {
      throw new Error('Redis health check failed');
    }

    // Step 4: Run E2E tests
    logStep(4, 5, 'Running E2E tests...\n');

    try {
      exec('npx vitest run tests/e2e/ --config vitest.e2e.config.ts');
      log('');
      logSuccess('All E2E tests passed');
    } catch (error) {
      log('');
      logError('Some E2E tests failed');
      exitCode = 1;
    }
  } catch (error) {
    logError(`Fatal error: ${error.message}`);
    exitCode = 1;
  } finally {
    // Step 5: Teardown
    logStep(5, 5, 'Tearing down Docker Compose services...');
    try {
      exec(`docker-compose -f ${COMPOSE_FILE} down -v`);
    } catch (error) {
      logError(`Teardown failed: ${error.message}`);
      exitCode = 1;
    }
  }

  // Final status
  logSection(
    exitCode === 0
      ? '✓ E2E Test Suite Complete — All Passed'
      : '✗ E2E Test Suite Complete — Some Failed'
  );

  process.exit(exitCode);
}

// ─── Entry Point ─────────────────────────────────────────────────

main().catch((error) => {
  logError(`Unhandled error: ${error.message}`);
  console.error(error);
  process.exit(1);
});

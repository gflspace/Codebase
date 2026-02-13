/**
 * E2E Test Suite — Global Setup
 *
 * Responsibilities:
 * - Start Docker Compose services (PostgreSQL + Redis)
 * - Wait for services to be healthy
 * - Run all migrations
 * - Seed admin user
 *
 * This runs ONCE before all E2E tests.
 */

import { execSync } from 'child_process';
import path from 'path';

const BACKEND_DIR = path.resolve(__dirname, '../..');

export default async function globalSetup(): Promise<void> {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  E2E Test Suite — Global Setup');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // 1. Start Docker Compose services
    console.log('[1/4] Starting Docker Compose services...');
    execSync('docker-compose -f docker-compose.test.yml up -d', {
      cwd: BACKEND_DIR,
      stdio: 'inherit',
    });

    // 2. Wait for PostgreSQL to be healthy
    console.log('[2/4] Waiting for PostgreSQL to be healthy...');
    let pgReady = false;
    for (let i = 0; i < 30; i++) {
      try {
        execSync(
          'docker-compose -f docker-compose.test.yml exec -T test-postgres pg_isready -U cis_test_user -d qwick_cis_test',
          {
            cwd: BACKEND_DIR,
            stdio: 'pipe',
          }
        );
        pgReady = true;
        console.log('  ✓ PostgreSQL is ready');
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    if (!pgReady) {
      throw new Error('PostgreSQL did not become healthy in time');
    }

    // 3. Wait for Redis to be healthy
    console.log('[3/4] Waiting for Redis to be healthy...');
    let redisReady = false;
    for (let i = 0; i < 30; i++) {
      try {
        const result = execSync(
          'docker-compose -f docker-compose.test.yml exec -T test-redis redis-cli ping',
          {
            cwd: BACKEND_DIR,
            encoding: 'utf-8',
          }
        );
        if (result.trim() === 'PONG') {
          redisReady = true;
          console.log('  ✓ Redis is ready');
          break;
        }
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    if (!redisReady) {
      throw new Error('Redis did not become healthy in time');
    }

    // 4. Run migrations
    console.log('[4/4] Running database migrations...');

    // Set environment variables for migrations
    const env = {
      ...process.env,
      DB_HOST: 'localhost',
      DB_PORT: '5433',
      DB_NAME: 'qwick_cis_test',
      DB_USER: 'cis_test_user',
      DB_PASSWORD: 'cis_test_password',
      DB_SSL: 'false',
    };

    execSync('npx tsx scripts/migrate.ts', {
      cwd: BACKEND_DIR,
      env,
      stdio: 'inherit',
    });

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  ✓ Global Setup Complete');
    console.log('═══════════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('\n✗ Global Setup Failed:', error);

    // Attempt cleanup on failure
    try {
      execSync('docker-compose -f docker-compose.test.yml down -v', {
        cwd: BACKEND_DIR,
        stdio: 'inherit',
      });
    } catch {
      // Ignore cleanup errors
    }

    throw error;
  }
}

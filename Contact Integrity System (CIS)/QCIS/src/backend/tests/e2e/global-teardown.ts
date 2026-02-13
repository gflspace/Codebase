/**
 * E2E Test Suite — Global Teardown
 *
 * Responsibilities:
 * - Stop and remove Docker Compose services
 * - Clean up volumes
 *
 * This runs ONCE after all E2E tests.
 */

import { execSync } from 'child_process';
import path from 'path';

const BACKEND_DIR = path.resolve(__dirname, '../..');

export default async function globalTeardown(): Promise<void> {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  E2E Test Suite — Global Teardown');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    console.log('Stopping Docker Compose services...');
    execSync('docker-compose -f docker-compose.test.yml down -v', {
      cwd: BACKEND_DIR,
      stdio: 'inherit',
    });

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  ✓ Global Teardown Complete');
    console.log('═══════════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('\n✗ Global Teardown Failed:', error);
    throw error;
  }
}

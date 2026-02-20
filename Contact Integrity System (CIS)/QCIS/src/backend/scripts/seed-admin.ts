#!/usr/bin/env node
/**
 * QwickServices CIS — Production Admin User Seeder
 *
 * This script creates an initial super_admin user for production deployment.
 * It is idempotent and safe to run multiple times.
 *
 * Usage:
 *   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=SecurePass123! npx tsx scripts/seed-admin.ts
 *
 * Environment Variables Required:
 *   - ADMIN_EMAIL: Email address for the admin user
 *   - ADMIN_PASSWORD: Strong password (min 12 characters, mixed case, numbers, symbols)
 *
 * Security:
 *   - Password is hashed with bcrypt (12 rounds)
 *   - User is created with force_password_change=true
 *   - Script will not overwrite existing admin users
 */

import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.production') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ─── Configuration ───────────────────────────────────────────────

const REQUIRED_PASSWORD_LENGTH = 12;
const BCRYPT_ROUNDS = 12;

interface AdminUser {
  id: number;
  email: string;
  password_hash: string;
  role: string;
  is_active: boolean;
  force_password_change: boolean;
  created_at: Date;
}

// ─── Validation ──────────────────────────────────────────────────

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < REQUIRED_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${REQUIRED_PASSWORD_LENGTH} characters`);
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return { valid: errors.length === 0, errors };
}

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

// ─── Database Connection ─────────────────────────────────────────

async function createPool(): Promise<Pool> {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'qwick_cis',
    user: process.env.DB_USER || 'cis_app_user',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });

  // Test connection
  try {
    await pool.query('SELECT 1');
  } catch (error) {
    throw new Error(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return pool;
}

// ─── Admin User Creation ─────────────────────────────────────────

async function checkExistingAdmin(pool: Pool, email: string): Promise<boolean> {
  const result = await pool.query<AdminUser>(
    'SELECT id FROM admin_users WHERE email = $1',
    [email]
  );
  return result.rows.length > 0;
}

async function createAdminUser(
  pool: Pool,
  email: string,
  password: string
): Promise<AdminUser> {
  // Hash password
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Insert admin user
  const result = await pool.query<AdminUser>(
    `INSERT INTO admin_users (
      email,
      password_hash,
      role,
      is_active,
      force_password_change,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    RETURNING *`,
    [
      email,
      passwordHash,
      'super_admin',
      true,
      true, // Force password change on first login
    ]
  );

  return result.rows[0];
}

// ─── Main Function ───────────────────────────────────────────────

async function seedAdmin(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  QwickServices CIS — Admin User Seeder');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  // Get credentials from environment
  let email: string;
  let password: string;

  try {
    email = getRequiredEnv('ADMIN_EMAIL');
    password = getRequiredEnv('ADMIN_PASSWORD');
  } catch (error) {
    console.error('✗ Configuration Error:');
    console.error('  ', error instanceof Error ? error.message : 'Unknown error');
    console.error('');
    console.error('Usage:');
    console.error('  ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=SecurePass123! npx tsx scripts/seed-admin.ts');
    console.error('');
    process.exit(1);
  }

  // Validate email
  if (!validateEmail(email)) {
    console.error('✗ Invalid email address:', email);
    process.exit(1);
  }

  // Validate password
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    console.error('✗ Password validation failed:');
    passwordValidation.errors.forEach(error => console.error('  -', error));
    process.exit(1);
  }

  console.log('Configuration:');
  console.log('  Email:', email);
  console.log('  Password: ********** (length:', password.length, ')');
  console.log('  Role: super_admin');
  console.log('  Force password change: true');
  console.log('───────────────────────────────────────────────────────────');
  console.log('');

  let pool: Pool | null = null;

  try {
    // Connect to database
    console.log('Connecting to database...');
    pool = await createPool();
    console.log('✓ Connected');
    console.log('');

    // Check if admin already exists
    console.log('Checking for existing admin user...');
    const exists = await checkExistingAdmin(pool, email);

    if (exists) {
      console.log('✓ Admin user already exists:', email);
      console.log('');
      console.log('No changes made. To reset password:');
      console.log('  1. Update password_hash in admin_users table manually, or');
      console.log('  2. Delete the existing user and re-run this script');
      console.log('');
      return;
    }

    console.log('✓ No existing admin found');
    console.log('');

    // Create admin user
    console.log('Creating admin user...');
    const admin = await createAdminUser(pool, email, password);

    console.log('✓ Admin user created successfully!');
    console.log('');
    console.log('───────────────────────────────────────────────────────────');
    console.log('Admin User Details:');
    console.log('───────────────────────────────────────────────────────────');
    console.log('  ID:', admin.id);
    console.log('  Email:', admin.email);
    console.log('  Role:', admin.role);
    console.log('  Active:', admin.is_active);
    console.log('  Force Password Change:', admin.force_password_change);
    console.log('  Created:', admin.created_at.toISOString());
    console.log('───────────────────────────────────────────────────────────');
    console.log('');
    console.log('IMPORTANT:');
    console.log('  - Save these credentials securely');
    console.log('  - User will be required to change password on first login');
    console.log('  - Do not share credentials via insecure channels');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');

  } catch (error) {
    console.error('');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('✗ Admin User Creation Failed');
    console.error('═══════════════════════════════════════════════════════════');

    if (error instanceof Error) {
      console.error('Error:', error.message);

      if (error.message.includes('relation "admin_users" does not exist')) {
        console.error('');
        console.error('The admin_users table does not exist.');
        console.error('Please run database migrations first:');
        console.error('  npx tsx scripts/migrate.ts');
      }

      if (error.stack) {
        console.error('');
        console.error('Stack trace:');
        console.error(error.stack);
      }
    } else {
      console.error(error);
    }

    console.error('═══════════════════════════════════════════════════════════');
    throw error;

  } finally {
    // Close database connection
    if (pool) {
      await pool.end();
    }
  }
}

// ─── Entry Point ─────────────────────────────────────────────────

if (require.main === module) {
  seedAdmin()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('');
      console.error('Seeding process terminated with errors.');
      process.exit(1);
    });
}

export { seedAdmin };

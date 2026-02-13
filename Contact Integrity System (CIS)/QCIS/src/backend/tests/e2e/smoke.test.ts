/**
 * E2E Pipeline Smoke Tests
 *
 * Tests the complete CIS pipeline end-to-end against real PostgreSQL + Redis services.
 * This is NOT mocked — it runs the actual application with real database queries.
 *
 * Tests run SEQUENTIALLY to build on previous state.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import './matchers'; // Import custom matchers
import {
  startTestServer,
  stopTestServer,
  seedAdminUser,
  getBaseUrl,
  closeTestPool,
  cleanupDatabase,
  ADMIN_CREDENTIALS,
  signHmac,
  signWebhook,
  E2E_CONFIG,
  getTestPool,
} from './setup';

// ─── Test State ──────────────────────────────────────────────────

let baseUrl: string;
let adminToken: string;

// ─── Lifecycle Hooks ─────────────────────────────────────────────

beforeAll(async () => {
  console.log('\n─── Starting E2E Smoke Tests ───\n');

  // Clean database before tests
  console.log('[Setup] Cleaning database...');
  await cleanupDatabase();

  // Seed admin user
  console.log('[Setup] Seeding admin user...');
  await seedAdminUser();

  // Start server
  console.log('[Setup] Starting test server...');
  const { baseUrl: url } = await startTestServer();
  baseUrl = url;

  // Wait a bit for consumers to register
  await new Promise((resolve) => setTimeout(resolve, 2000));

  console.log('[Setup] E2E environment ready\n');
}, 60000);

afterAll(async () => {
  console.log('\n[Teardown] Cleaning up...');
  await stopTestServer();
  await closeTestPool();
  console.log('[Teardown] Complete\n');
}, 30000);

// ─── Helper Functions ────────────────────────────────────────────

async function loginAdmin(): Promise<string> {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: ADMIN_CREDENTIALS.email,
      password: ADMIN_CREDENTIALS.password,
    }),
  });

  const data = await response.json();
  return data.token;
}

async function postWebhook(body: object): Promise<Response> {
  const bodyStr = JSON.stringify(body);
  const signature = signWebhook(bodyStr);

  return fetch(`${baseUrl}/api/webhooks/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
    },
    body: bodyStr,
  });
}

async function postEvaluate(body: object, useHmac: boolean = true): Promise<Response> {
  const bodyStr = JSON.stringify(body);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (useHmac) {
    const { signature, timestamp } = signHmac(bodyStr);
    headers['X-Hmac-Signature'] = signature;
    headers['X-Hmac-Timestamp'] = timestamp;
  } else {
    headers['Authorization'] = `Bearer ${adminToken}`;
  }

  return fetch(`${baseUrl}/api/evaluate`, {
    method: 'POST',
    headers,
    body: bodyStr,
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Test Suite ──────────────────────────────────────────────────

describe('E2E Pipeline Smoke Tests', () => {
  describe('1. Health Check', () => {
    it('should return healthy status with database connection', async () => {
      const response = await fetch(`${baseUrl}/api/health`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.checks).toBeDefined();
      expect(data.checks.database).toBe('connected');
      expect(data.version).toBeDefined();
      expect(data.timestamp).toBeDefined();
    });
  });

  describe('2. Admin Login', () => {
    it('should authenticate admin and return JWT token', async () => {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.token).toBeDefined();
      expect(typeof data.token).toBe('string');
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(ADMIN_CREDENTIALS.email);
      expect(data.user.role).toBe('super_admin');

      // Store token for subsequent tests
      adminToken = data.token;
    });

    it('should access protected route with valid token', async () => {
      const response = await fetch(`${baseUrl}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(ADMIN_CREDENTIALS.email);
    });
  });

  describe('3. Webhook Ingestion — Booking Created', () => {
    it('should accept and process booking.created webhook', async () => {
      const webhookBody = {
        event_id: 'e2e-booking-001',
        event_type: 'booking-save',
        timestamp: new Date().toISOString(),
        source: 'qwickservices',
        payload: {
          booking_id: 'bk-001',
          customer_id: 'test-user-001',
          provider_id: 'test-provider-001',
          amount: 150.0,
          service_type: 'cleaning',
          status: 'pending',
          scheduled_at: '2026-03-01T10:00:00Z',
        },
      };

      const response = await postWebhook(webhookBody);
      const data = await response.json();

      expect(response.status).toBeOneOf([200, 202]);
      expect(data.received).toBe(true);
      expect(data.event_id).toBeDefined();

      // Wait for async processing
      console.log('  Waiting 2s for async processing...');
      await sleep(2000);
    });

    it('should reject duplicate webhook (idempotency)', async () => {
      const webhookBody = {
        event_id: 'e2e-booking-001', // Same event_id as previous test
        event_type: 'booking-save',
        timestamp: new Date().toISOString(),
        source: 'qwickservices',
        payload: {
          booking_id: 'bk-001',
          customer_id: 'test-user-001',
          provider_id: 'test-provider-001',
          amount: 150.0,
          service_type: 'cleaning',
          status: 'pending',
        },
      };

      const response = await postWebhook(webhookBody);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.duplicate).toBe(true);
    });
  });

  describe('4. Webhook Ingestion — Message with Suspicious Content', () => {
    it('should detect off-platform signals in message content', async () => {
      const webhookBody = {
        event_id: 'e2e-message-001',
        event_type: 'message-save',
        timestamp: new Date().toISOString(),
        source: 'qwickservices',
        payload: {
          message_id: 'msg-001',
          sender_id: 'test-user-001',
          recipient_id: 'test-provider-001',
          content:
            "Hey, let's skip the platform. Call me at 555-123-4567 and we can deal directly via Venmo",
          conversation_id: 'conv-001',
          sent_at: new Date().toISOString(),
        },
      };

      const response = await postWebhook(webhookBody);
      const data = await response.json();

      expect(response.status).toBeOneOf([200, 202]);
      expect(data.received).toBe(true);

      // Wait for detection pipeline
      console.log('  Waiting 2s for detection pipeline...');
      await sleep(2000);
    });
  });

  describe('5. Verify Risk Signals Generated', () => {
    it('should have created risk signals for test-user-001', async () => {
      // Query database directly to verify signals
      const pool = getTestPool();
      const result = await pool.query(
        `SELECT signal_type, confidence, pattern_flags
         FROM risk_signals
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        ['test-user-001']
      );

      expect(result.rows.length).toBeGreaterThan(0);

      const signalTypes = result.rows.map((r) => r.signal_type);
      console.log(`  Detected signals: ${signalTypes.join(', ')}`);

      // Expect at least one of the suspicious signals
      const suspiciousSignals = [
        'CONTACT_PHONE',
        'CONTACT_EMAIL',
        'OFF_PLATFORM_INTENT',
        'PAYMENT_EXTERNAL',
      ];
      const hasSuspiciousSignal = signalTypes.some((s) =>
        suspiciousSignals.includes(s)
      );

      expect(hasSuspiciousSignal).toBe(true);
    });

    it('should have calculated risk score for test-user-001', async () => {
      const pool = getTestPool();
      const result = await pool.query(
        `SELECT score, tier, factors, model_version
         FROM risk_scores
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        ['test-user-001']
      );

      expect(result.rows.length).toBe(1);

      const score = result.rows[0];
      expect(score.score).toBeGreaterThan(0);
      expect(score.tier).toBeDefined();
      expect(['monitor', 'elevated', 'high', 'critical']).toContain(score.tier);
      expect(score.factors).toBeDefined();
      expect(score.model_version).toBe('5-component');

      console.log(
        `  Risk Score: ${score.score} (${score.tier}), Model: ${score.model_version}`
      );
    });
  });

  describe('6. Synchronous Evaluation', () => {
    it('should evaluate booking.create action with HMAC auth', async () => {
      const evaluateBody = {
        action_type: 'booking.create',
        user_id: 'test-user-001',
        counterparty_id: 'test-provider-002',
        metadata: {
          booking_amount: 200.0,
          service_type: 'cleaning',
        },
      };

      const response = await postEvaluate(evaluateBody, true);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.decision).toBeOneOf(['allow', 'flag', 'block']);
      expect(typeof data.risk_score).toBe('number');
      expect(data.risk_tier).toBeDefined();
      expect(data.evaluation_time_ms).toBeDefined();
      expect(typeof data.evaluation_time_ms).toBe('number');

      // Performance check: should evaluate within 500ms
      expect(data.evaluation_time_ms).toBeLessThan(500);

      console.log(
        `  Decision: ${data.decision}, Score: ${data.risk_score}, Tier: ${data.risk_tier}, Time: ${data.evaluation_time_ms}ms`
      );
    });

    it('should evaluate with JWT auth (admin testing)', async () => {
      const evaluateBody = {
        action_type: 'payment.initiate',
        user_id: 'test-user-001',
        counterparty_id: 'test-provider-002',
        metadata: {
          amount: 100.0,
          payment_method: 'card',
        },
      };

      const response = await postEvaluate(evaluateBody, false);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.decision).toBeOneOf(['allow', 'flag', 'block']);
    });
  });

  describe('7. Webhook — Multiple Suspicious Messages (Escalation)', () => {
    it('should escalate risk after multiple violations', async () => {
      // Send 3 more suspicious messages
      const messages = [
        {
          event_id: 'e2e-message-002',
          content: 'My email is badactor@example.com, contact me there',
        },
        {
          event_id: 'e2e-message-003',
          content: 'Pay me through PayPal instead of the platform',
        },
        {
          event_id: 'e2e-message-004',
          content: "Let's move this conversation to WhatsApp: +1-555-999-8888",
        },
      ];

      for (const msg of messages) {
        const webhookBody = {
          event_id: msg.event_id,
          event_type: 'message-save',
          timestamp: new Date().toISOString(),
          source: 'qwickservices',
          payload: {
            message_id: msg.event_id.replace('e2e-', ''),
            sender_id: 'test-user-001',
            recipient_id: 'test-provider-001',
            content: msg.content,
            conversation_id: 'conv-001',
            sent_at: new Date().toISOString(),
          },
        };

        const response = await postWebhook(webhookBody);
        expect(response.status).toBeOneOf([200, 202]);

        // Small delay between messages
        await sleep(500);
      }

      // Wait for processing
      console.log('  Waiting 3s for escalation processing...');
      await sleep(3000);

      // Verify score increased
      const pool = getTestPool();
      const result = await pool.query(
        `SELECT score, tier FROM risk_scores
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        ['test-user-001']
      );

      expect(result.rows.length).toBe(1);
      const newScore = parseFloat(result.rows[0].score);

      console.log(`  Escalated Risk Score: ${newScore} (${result.rows[0].tier})`);

      // Score should be elevated after multiple violations
      expect(newScore).toBeGreaterThan(20);
    });

    it('should re-evaluate with higher risk score', async () => {
      const evaluateBody = {
        action_type: 'booking.create',
        user_id: 'test-user-001',
        counterparty_id: 'test-provider-003',
        metadata: {
          booking_amount: 300.0,
          service_type: 'cleaning',
        },
      };

      const response = await postEvaluate(evaluateBody, true);
      const data = await response.json();

      expect(response.status).toBe(200);

      console.log(
        `  Re-evaluation: ${data.decision}, Score: ${data.risk_score}`
      );

      // With shadow mode OFF, high-risk users should be flagged or blocked
      if (data.risk_score >= 40) {
        expect(data.decision).toBeOneOf(['flag', 'block']);
      }
    });
  });

  describe('8. Admin Rules CRUD', () => {
    let createdRuleId: string;

    it('should create a new admin rule', async () => {
      const ruleBody = {
        name: 'E2E Test Rule',
        rule_type: 'alert_threshold',
        trigger_event_types: ['message.created'],
        conditions: {
          all: [
            {
              field: 'score',
              operator: 'gte',
              value: 30,
            },
          ],
        },
        actions: [
          {
            type: 'create_alert',
            priority: 'high',
          },
        ],
        priority: 50,
        enabled: true,
        dry_run: false,
      };

      const response = await fetch(`${baseUrl}/api/admin/rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(ruleBody),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBeDefined();
      expect(data.name).toBe('E2E Test Rule');
      expect(data.enabled).toBe(true);
      expect(data.version).toBe(1);

      createdRuleId = data.id;
      console.log(`  Created rule: ${createdRuleId}`);
    });

    it('should retrieve rules list', async () => {
      const response = await fetch(`${baseUrl}/api/admin/rules`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);

      const testRule = data.find((r: { name: string }) => r.name === 'E2E Test Rule');
      expect(testRule).toBeDefined();
    });

    it('should update rule priority and increment version', async () => {
      const updateBody = {
        priority: 25,
      };

      const response = await fetch(`${baseUrl}/api/admin/rules/${createdRuleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(updateBody),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.priority).toBe(25);
      expect(data.version).toBe(2); // Version should increment
    });

    it('should disable rule (soft delete)', async () => {
      const response = await fetch(`${baseUrl}/api/admin/rules/${createdRuleId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(204);

      // Verify rule is disabled
      const getResponse = await fetch(`${baseUrl}/api/admin/rules/${createdRuleId}`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      const data = await getResponse.json();
      expect(data.enabled).toBe(false);
    });
  });

  describe('9. Alerts Generated', () => {
    it('should have generated alerts for test-user-001', async () => {
      const response = await fetch(`${baseUrl}/api/alerts?limit=50`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data.alerts)).toBe(true);

      // Filter alerts for our test user
      const userAlerts = data.alerts.filter(
        (a: { user_id: string }) => a.user_id === 'test-user-001'
      );

      console.log(`  Alerts for test-user-001: ${userAlerts.length}`);

      // We expect at least one alert given the suspicious activity
      expect(userAlerts.length).toBeGreaterThan(0);

      if (userAlerts.length > 0) {
        const alert = userAlerts[0];
        expect(alert.alert_type).toBeDefined();
        expect(alert.severity).toBeDefined();
        expect(alert.title).toBeDefined();
      }
    });

    it('should retrieve alert details', async () => {
      // Get first alert
      const listResponse = await fetch(`${baseUrl}/api/alerts?limit=1`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      const listData = await listResponse.json();

      if (listData.alerts.length > 0) {
        const alertId = listData.alerts[0].id;

        const response = await fetch(`${baseUrl}/api/alerts/${alertId}`, {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        });

        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.id).toBe(alertId);
        expect(data.alert_type).toBeDefined();
      }
    });
  });

  describe('10. Metrics Endpoint', () => {
    it('should expose Prometheus metrics', async () => {
      const response = await fetch(`${baseUrl}/api/metrics`);
      const text = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/plain');

      // Verify key metrics are present
      expect(text).toContain('http_requests_total');
      expect(text).toContain('db_queries_total');
      expect(text).toContain('events_processed_total');

      console.log(`  Metrics response length: ${text.length} bytes`);
    });
  });

  describe('11. Stats Endpoint', () => {
    it('should return dashboard statistics', async () => {
      const response = await fetch(`${baseUrl}/api/stats`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toBeDefined();
      expect(data.risk_scores).toBeDefined();
      expect(data.enforcement_actions).toBeDefined();

      console.log(`  Total users: ${data.users.total}`);
      console.log(`  High risk users: ${data.users.high_risk}`);
    });
  });
});

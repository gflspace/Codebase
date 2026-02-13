// QwickServices CIS — Load Testing Script
// Validates <200ms SLA for /api/evaluate endpoint (TARGET_ARCHITECTURE_v2.md)
// Self-contained: native Node.js fetch (no external dependencies)

import crypto from 'crypto';

// ─── CLI Arguments ───────────────────────────────────────────────

const args = process.argv.slice(2);
const targetRps = parseInt(args.find(a => a.startsWith('--rps='))?.split('=')[1] || '10', 10);
const durationSec = parseInt(args.find(a => a.startsWith('--duration='))?.split('=')[1] || '10', 10);
const baseUrl = args.find(a => a.startsWith('--url='))?.split('=')[1] || 'http://localhost:3001';
const endpoint = args.find(a => a.startsWith('--endpoint='))?.split('=')[1] || 'evaluate';
const authToken = args.find(a => a.startsWith('--token='))?.split('=')[1] || '';

// ─── Types ───────────────────────────────────────────────────────

interface LatencyBucket {
  latencies: number[];
  errors: number;
  successes: number;
  statusCodes: Record<number, number>;
}

// ─── UUID Generator ──────────────────────────────────────────────

function generateUUID(): string {
  return crypto.randomUUID();
}

// ─── Payload Generators ──────────────────────────────────────────

function generateEvaluatePayload(): Record<string, unknown> {
  const actionTypes = ['booking.create', 'payment.initiate', 'provider.register'];
  const serviceTypes = ['cleaning', 'plumbing', 'electrical', 'moving', 'tutoring', 'handyman', 'landscaping'];

  const actionType = actionTypes[Math.floor(Math.random() * actionTypes.length)];

  const payload: Record<string, unknown> = {
    action_type: actionType,
    user_id: generateUUID(),
    counterparty_id: generateUUID(),
    metadata: {},
  };

  if (actionType === 'booking.create') {
    payload.metadata = {
      booking_amount: Math.round(Math.random() * 500 * 100) / 100,
      service_type: serviceTypes[Math.floor(Math.random() * serviceTypes.length)],
      scheduled_at: new Date(Date.now() + 86400000 * Math.floor(Math.random() * 14)).toISOString(),
    };
  } else if (actionType === 'payment.initiate') {
    payload.metadata = {
      amount: Math.round(Math.random() * 1000 * 100) / 100,
      currency: 'USD',
      payment_method: ['credit_card', 'wallet', 'bank_transfer'][Math.floor(Math.random() * 3)],
    };
  } else {
    payload.metadata = {
      service_category: serviceTypes[Math.floor(Math.random() * serviceTypes.length)],
      years_experience: Math.floor(Math.random() * 10) + 1,
    };
  }

  return payload;
}

function generateWebhookPayload(): { payload: Record<string, unknown>; signature: string } {
  const eventTypes = [
    { type: 'booking-create', category: 'booking' },
    { type: 'booking-complete', category: 'booking' },
    { type: 'payment-deposit', category: 'wallet' },
    { type: 'provider-register', category: 'provider' },
  ];

  const selected = eventTypes[Math.floor(Math.random() * eventTypes.length)];

  const webhookPayload: Record<string, unknown> = {
    event_id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    event_type: selected.type,
    timestamp: new Date().toISOString(),
    source: 'qwickservices',
    payload: {},
  };

  if (selected.category === 'booking') {
    webhookPayload.payload = {
      booking_id: generateUUID(),
      customer_id: generateUUID(),
      provider_id: generateUUID(),
      amount: Math.random() * 500,
      status: 'confirmed',
    };
  } else if (selected.category === 'wallet') {
    webhookPayload.payload = {
      transaction_id: generateUUID(),
      user_id: generateUUID(),
      amount: Math.random() * 1000,
      tx_type: 'deposit',
      status: 'completed',
    };
  } else {
    webhookPayload.payload = {
      provider_id: generateUUID(),
      user_id: generateUUID(),
      service_category: 'cleaning',
    };
  }

  const bodyStr = JSON.stringify(webhookPayload);
  const signature = crypto
    .createHmac('sha256', 'test-webhook-secret')
    .update(bodyStr)
    .digest('hex');

  return { payload: webhookPayload, signature };
}

function generateHealthPayload(): Record<string, unknown> {
  return {};
}

// ─── HMAC Signature ──────────────────────────────────────────────

function signPayload(payload: Record<string, unknown>): { signature: string; timestamp: string } {
  const timestamp = String(Date.now());
  const bodyStr = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', 'test-hmac-secret')
    .update(`${timestamp}.${bodyStr}`)
    .digest('hex');

  return { signature, timestamp };
}

// ─── Statistics Helpers ──────────────────────────────────────────

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil(sorted.length * p / 100) - 1;
  return sorted[Math.max(0, idx)];
}

// ─── Load Test Runner ────────────────────────────────────────────

async function runLoadTest(): Promise<void> {
  console.log('═'.repeat(70));
  console.log('  QwickServices CIS — Load Test');
  console.log('═'.repeat(70));
  console.log(`  Target RPS:     ${targetRps}`);
  console.log(`  Duration:       ${durationSec}s`);
  console.log(`  Endpoint:       ${endpoint}`);
  console.log(`  Base URL:       ${baseUrl}`);
  console.log('─'.repeat(70));

  const bucket: LatencyBucket = {
    latencies: [],
    errors: 0,
    successes: 0,
    statusCodes: {},
  };

  const intervalMs = 1000 / targetRps;
  const startTime = Date.now();
  const endTime = startTime + durationSec * 1000;

  let requestCount = 0;

  while (Date.now() < endTime) {
    const reqStart = Date.now();

    try {
      let url: string;
      let method: string;
      let headers: Record<string, string>;
      let body: string | undefined;

      if (endpoint === 'evaluate') {
        const payload = generateEvaluatePayload();
        const { signature, timestamp } = signPayload(payload);

        url = `${baseUrl}/api/evaluate`;
        method = 'POST';
        headers = {
          'Content-Type': 'application/json',
          'x-hmac-signature': signature,
          'x-hmac-timestamp': timestamp,
        };

        // Allow JWT override for testing
        if (authToken) {
          headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          };
        }

        body = JSON.stringify(payload);
      } else if (endpoint === 'webhooks/ingest') {
        const { payload, signature } = generateWebhookPayload();

        url = `${baseUrl}/api/webhooks/ingest`;
        method = 'POST';
        headers = {
          'Content-Type': 'application/json',
          'x-webhook-signature': signature,
        };
        body = JSON.stringify(payload);
      } else if (endpoint === 'health') {
        url = `${baseUrl}/api/health`;
        method = 'GET';
        headers = {};
      } else {
        throw new Error(`Unknown endpoint: ${endpoint}`);
      }

      const res = await fetch(url, {
        method,
        headers,
        body,
      });

      const latency = Date.now() - reqStart;
      bucket.latencies.push(latency);
      bucket.statusCodes[res.status] = (bucket.statusCodes[res.status] || 0) + 1;

      if (res.ok || res.status === 202) {
        bucket.successes++;
      } else {
        bucket.errors++;
      }

      requestCount++;

      // Progress indicator every 10% of duration
      const elapsed = Date.now() - startTime;
      const progress = Math.floor((elapsed / (durationSec * 1000)) * 10) * 10;
      if (requestCount % Math.max(1, Math.floor(targetRps)) === 0) {
        process.stdout.write(`\r  Progress: ${progress}% | Requests: ${requestCount} | Avg latency: ${Math.round(bucket.latencies.reduce((a, b) => a + b, 0) / bucket.latencies.length)}ms`);
      }
    } catch (err) {
      bucket.errors++;
      bucket.latencies.push(Date.now() - reqStart);
      requestCount++;
    }

    // Rate limiting: wait until next slot
    const elapsed = Date.now() - reqStart;
    if (elapsed < intervalMs) {
      await new Promise(r => setTimeout(r, intervalMs - elapsed));
    }
  }

  console.log('\n' + '─'.repeat(70));

  // ─── Print Results ───────────────────────────────────────────────

  const totalTime = (Date.now() - startTime) / 1000;
  const totalReqs = bucket.successes + bucket.errors;

  console.log('\n  RESULTS');
  console.log('═'.repeat(70));
  console.log(`  Total requests:    ${totalReqs.toLocaleString()}`);
  console.log(`  Successful:        ${bucket.successes.toLocaleString()} (${(bucket.successes / totalReqs * 100).toFixed(2)}%)`);
  console.log(`  Failed:            ${bucket.errors.toLocaleString()} (${(bucket.errors / totalReqs * 100).toFixed(2)}%)`);
  console.log(`  Actual RPS:        ${(totalReqs / totalTime).toFixed(1)}`);
  console.log(`  Duration:          ${totalTime.toFixed(2)}s`);

  console.log('\n  STATUS CODE DISTRIBUTION');
  console.log('─'.repeat(70));
  Object.entries(bucket.statusCodes)
    .sort((a, b) => parseInt(b[1].toString()) - parseInt(a[1].toString()))
    .forEach(([code, count]) => {
      const pct = ((count as number) / totalReqs * 100).toFixed(2);
      console.log(`  ${code}:  ${String(count).padStart(6)} (${pct}%)`);
    });

  console.log('\n  LATENCY DISTRIBUTION (ms)');
  console.log('─'.repeat(70));
  console.log(`  Min:  ${Math.min(...bucket.latencies).toFixed(0).padStart(6)}`);
  console.log(`  p50:  ${percentile(bucket.latencies, 50).toFixed(0).padStart(6)}`);
  console.log(`  p75:  ${percentile(bucket.latencies, 75).toFixed(0).padStart(6)}`);
  console.log(`  p90:  ${percentile(bucket.latencies, 90).toFixed(0).padStart(6)}`);
  console.log(`  p95:  ${percentile(bucket.latencies, 95).toFixed(0).padStart(6)}`);
  console.log(`  p99:  ${percentile(bucket.latencies, 99).toFixed(0).padStart(6)}`);
  console.log(`  Max:  ${Math.max(...bucket.latencies).toFixed(0).padStart(6)}`);
  console.log(`  Avg:  ${Math.round(bucket.latencies.reduce((a, b) => a + b, 0) / bucket.latencies.length).toFixed(0).padStart(6)}`);

  // ─── SLA Check ───────────────────────────────────────────────────

  if (endpoint === 'evaluate') {
    const p99 = percentile(bucket.latencies, 99);
    const slaTarget = 200;

    console.log('\n  SLA CHECK');
    console.log('─'.repeat(70));
    console.log(`  Target:    p99 < ${slaTarget}ms`);
    console.log(`  Actual:    p99 = ${p99.toFixed(0)}ms`);
    console.log(`  Status:    ${p99 < slaTarget ? '✓ PASS' : '✗ FAIL'}`);

    if (p99 >= slaTarget) {
      console.log(`  Overage:   +${(p99 - slaTarget).toFixed(0)}ms (${((p99 / slaTarget - 1) * 100).toFixed(1)}%)`);
    }
  }

  console.log('\n' + '═'.repeat(70));
}

// ─── Entry Point ─────────────────────────────────────────────────

runLoadTest().catch((err) => {
  console.error('\n[FATAL] Load test failed:', err);
  process.exit(1);
});

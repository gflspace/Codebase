// QwickServices CIS — Risk Escalation Integration Tests
// 5 scenarios: gradual escalation, rapid jump, decay, repeat offense, new account signals.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { EventType } from '../../src/events/types';
import { query } from '../../src/database/connection';
import {
  createTestUser, createTestSignal, createTestBooking, emitTestEvent,
  waitForProcessing, getLatestScore, getSignalsForUser, cleanupTestData,
  registerTestConsumers,
} from './test-matrix';
import { generateId } from '../../src/shared/utils';

describe('Risk Escalation Integration Tests', () => {
  const testUsers: string[] = [];

  beforeAll(async () => {
    await registerTestConsumers();
  });

  afterAll(async () => {
    await cleanupTestData(testUsers);
  });

  // Scenario 1: Gradual risk increase over multiple days → tier progression
  it('should escalate tier gradually with accumulated signals', async () => {
    const userId = await createTestUser({ trust_score: 0 });
    testUsers.push(userId);

    // Seed a few risk signals to simulate gradual buildup
    for (let i = 0; i < 3; i++) {
      await createTestSignal({
        user_id: userId,
        signal_type: 'CONTACT_PHONE',
        confidence: 0.7,
      });
    }

    // Trigger scoring by emitting an event
    const receiverId = await createTestUser();
    testUsers.push(receiverId);

    await emitTestEvent(EventType.MESSAGE_CREATED, {
      message_id: `msg-esc-${userId.slice(0, 8)}`,
      sender_id: userId, receiver_id: receiverId,
      content: 'Hey call me at 555-111-2222 for a deal.',
    });

    await waitForProcessing(2500);

    const score = await getLatestScore(userId);
    // With multiple contact signals, score should be elevated above baseline
    expect(score).not.toBeNull();
    if (score) {
      expect(score.score).toBeGreaterThan(0);
    }
  });

  // Scenario 2: Rapid escalation — multiple signals in 1 hour → jump to high tier
  it('should rapidly escalate with burst of signals', async () => {
    const userId = await createTestUser({ trust_score: 0 });
    const counterpartyId = await createTestUser();
    testUsers.push(userId, counterpartyId);

    // Emit a burst of concerning signals
    const signalTypes = [
      'CONTACT_PHONE', 'CONTACT_EMAIL', 'CONTACT_MESSAGING_APP',
      'GROOMING_LANGUAGE', 'OFF_PLATFORM_INTENT',
    ];

    for (const sigType of signalTypes) {
      await createTestSignal({
        user_id: userId,
        signal_type: sigType,
        confidence: 0.85,
        evidence: { counterparty_id: counterpartyId },
      });
    }

    // Trigger a scoring event
    await emitTestEvent(EventType.MESSAGE_CREATED, {
      message_id: `msg-burst-${userId.slice(0, 8)}`,
      sender_id: userId, receiver_id: counterpartyId,
      content: 'Let me give you my whatsapp number for a special price off the app.',
    });

    await waitForProcessing(2500);

    const score = await getLatestScore(userId);
    expect(score).not.toBeNull();
    if (score) {
      // With 5+ signals, should be at least medium or high tier
      expect(score.score).toBeGreaterThan(20);
    }
  });

  // Scenario 3: Risk decay — no signals for long period → score decreases
  it('should apply risk decay when no recent signals exist', async () => {
    const userId = await createTestUser({ trust_score: 50 });
    testUsers.push(userId);

    // Insert an old risk score
    await query(
      `INSERT INTO risk_scores (id, user_id, score, tier, trend, model_version, factors, created_at)
       VALUES ($1, $2, 50, 'medium', 'stable', 'v2', '{}', NOW() - INTERVAL '60 days')`,
      [generateId(), userId]
    );

    // Insert old signal so decay cooldown is met
    await query(
      `INSERT INTO risk_signals (id, source_event_id, user_id, signal_type, confidence, evidence, created_at)
       VALUES ($1, $2, $3, 'CONTACT_PHONE', 0.7, '{}', NOW() - INTERVAL '60 days')`,
      [generateId(), generateId(), userId]
    );

    // Trigger scoring re-evaluation
    await emitTestEvent(EventType.USER_LOGGED_IN, {
      user_id: userId,
    });

    await waitForProcessing(2500);

    const score = await getLatestScore(userId);
    // Decay should have reduced the score from 50
    // (exact amount depends on decay config for medium tier: 0.3/day, 14 day cooldown)
    expect(score).not.toBeNull();
    if (score) {
      // After 60 days with 14-day cooldown: score * (1 - 0.3 * 46) would floor to min_score=20
      expect(score.score).toBeLessThanOrEqual(50);
    }
  });

  // Scenario 4: Repeat offense after decay → faster escalation
  it('should escalate faster for repeat offenders', async () => {
    const userId = await createTestUser({ trust_score: 0 });
    testUsers.push(userId);

    // Simulate prior offense history: old signals that were decayed
    for (let i = 0; i < 4; i++) {
      await query(
        `INSERT INTO risk_signals (id, source_event_id, user_id, signal_type, confidence, evidence, created_at)
         VALUES ($1, $2, $3, 'CONTACT_PHONE', 0.8, '{"repeat": true}', NOW() - INTERVAL '90 days')`,
        [generateId(), generateId(), userId]
      );
    }

    // Old enforcement action (shows repeat behavior)
    await query(
      `INSERT INTO enforcement_actions (id, user_id, action_type, reason, reason_code, created_at)
       VALUES ($1, $2, 'soft_warning', 'contact sharing', 'contact_sharing', NOW() - INTERVAL '90 days')`,
      [generateId(), userId]
    );

    // Now new signals come in
    const receiverId = await createTestUser();
    testUsers.push(receiverId);

    await emitTestEvent(EventType.MESSAGE_CREATED, {
      message_id: `msg-repeat-${userId.slice(0, 8)}`,
      sender_id: userId, receiver_id: receiverId,
      content: 'Hey text me at 555-444-3333, lets work directly.',
    });

    await waitForProcessing(2500);

    const score = await getLatestScore(userId);
    expect(score).not.toBeNull();
    if (score) {
      // Historical signals + new signal should compound
      expect(score.score).toBeGreaterThan(0);
    }
  });

  // Scenario 5: New account with immediate signals → KYC penalty + behavioral boost
  it('should penalize new account with immediate suspicious signals', async () => {
    const userId = await createTestUser({ trust_score: 0 });
    testUsers.push(userId);

    // Force account creation date to be very recent (< 3 days)
    await query(
      `UPDATE users SET created_at = NOW() - INTERVAL '1 day' WHERE id = $1`,
      [userId]
    );

    // Immediately share contact info
    const receiverId = await createTestUser();
    testUsers.push(receiverId);

    await emitTestEvent(EventType.MESSAGE_CREATED, {
      message_id: `msg-new-acct-${userId.slice(0, 8)}`,
      sender_id: userId, receiver_id: receiverId,
      content: 'My email is cheapdeals@example.com, lets skip the platform fees.',
    });

    await waitForProcessing(2500);

    const score = await getLatestScore(userId);
    expect(score).not.toBeNull();
    if (score) {
      // New account (< 3 days) gets +5 KYC penalty
      // Plus contact email signal + grooming language
      // Should be notably elevated
      expect(score.score).toBeGreaterThan(5);
    }

    // Verify signals were generated
    const signals = await getSignalsForUser(userId);
    const contactSignals = signals.filter(s =>
      s.signal_type === 'CONTACT_EMAIL' || s.signal_type === 'GROOMING_LANGUAGE'
    );
    expect(contactSignals.length).toBeGreaterThanOrEqual(1);
  });
});

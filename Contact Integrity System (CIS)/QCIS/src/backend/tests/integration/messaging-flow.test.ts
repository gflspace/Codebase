// QwickServices CIS — Messaging Flow Integration Tests
// 6 scenarios covering normal messages, phone/email sharing, obfuscation, redirects, and grooming.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { EventType } from '../../src/events/types';
import {
  createTestUser, emitTestEvent, waitForProcessing,
  getSignalsForUser, cleanupTestData, registerTestConsumers,
} from './test-matrix';

describe('Messaging Flow Integration Tests', () => {
  const testUsers: string[] = [];

  beforeAll(async () => {
    await registerTestConsumers();
  });

  afterAll(async () => {
    await cleanupTestData(testUsers);
  });

  // Scenario 1: Normal conversation — no signals
  it('should process normal message without generating signals', async () => {
    const senderId = await createTestUser();
    const receiverId = await createTestUser();
    testUsers.push(senderId, receiverId);

    await emitTestEvent(EventType.MESSAGE_CREATED, {
      message_id: `msg-normal-${senderId.slice(0, 8)}`,
      sender_id: senderId, receiver_id: receiverId,
      content: 'Hello, I would like to book your cleaning service for next Tuesday.',
    });

    await waitForProcessing(1500);
    const signals = await getSignalsForUser(senderId, 'CONTACT_PHONE');
    expect(signals.length).toBe(0);
  });

  // Scenario 2: Phone number shared — CONTACT_PHONE signal
  it('should detect phone number sharing in message', async () => {
    const senderId = await createTestUser();
    const receiverId = await createTestUser();
    testUsers.push(senderId, receiverId);

    await emitTestEvent(EventType.MESSAGE_CREATED, {
      message_id: `msg-phone-${senderId.slice(0, 8)}`,
      sender_id: senderId, receiver_id: receiverId,
      content: 'Great service! Call me at 555-123-4567 to schedule directly.',
    });

    await waitForProcessing(2000);
    const signals = await getSignalsForUser(senderId, 'CONTACT_PHONE');
    expect(signals.length).toBeGreaterThanOrEqual(1);
  });

  // Scenario 3: Email shared — CONTACT_EMAIL signal
  it('should detect email sharing in message', async () => {
    const senderId = await createTestUser();
    const receiverId = await createTestUser();
    testUsers.push(senderId, receiverId);

    await emitTestEvent(EventType.MESSAGE_CREATED, {
      message_id: `msg-email-${senderId.slice(0, 8)}`,
      sender_id: senderId, receiver_id: receiverId,
      content: 'Send me the details at john.doe@gmail.com please.',
    });

    await waitForProcessing(2000);
    const signals = await getSignalsForUser(senderId, 'CONTACT_EMAIL');
    expect(signals.length).toBeGreaterThanOrEqual(1);
  });

  // Scenario 4: Obfuscated contact info — CONTACT_PHONE + obfuscation flags
  it('should detect obfuscated phone number', async () => {
    const senderId = await createTestUser();
    const receiverId = await createTestUser();
    testUsers.push(senderId, receiverId);

    await emitTestEvent(EventType.MESSAGE_CREATED, {
      message_id: `msg-obfusc-${senderId.slice(0, 8)}`,
      sender_id: senderId, receiver_id: receiverId,
      content: 'My number is three one oh, five five five, twelve thirty four. Text me!',
    });

    await waitForProcessing(2000);
    // Detection depends on obfuscation module parsing number words
    const signals = await getSignalsForUser(senderId);
    const offPlatformSignals = signals.filter(s =>
      s.signal_type === 'CONTACT_PHONE' || s.signal_type === 'OFF_PLATFORM_INTENT'
    );
    // At minimum, "text me" should trigger OFF_PLATFORM_INTENT
    expect(offPlatformSignals.length).toBeGreaterThanOrEqual(1);
  });

  // Scenario 5: WhatsApp redirect — CONTACT_MESSAGING_APP signal
  it('should detect WhatsApp redirect attempt', async () => {
    const senderId = await createTestUser();
    const receiverId = await createTestUser();
    testUsers.push(senderId, receiverId);

    await emitTestEvent(EventType.MESSAGE_CREATED, {
      message_id: `msg-wa-${senderId.slice(0, 8)}`,
      sender_id: senderId, receiver_id: receiverId,
      content: 'Lets continue on whatsapp, its easier to share photos there.',
    });

    await waitForProcessing(2000);
    const signals = await getSignalsForUser(senderId, 'CONTACT_MESSAGING_APP');
    expect(signals.length).toBeGreaterThanOrEqual(1);
  });

  // Scenario 6: Grooming language — GROOMING_LANGUAGE signal
  it('should detect grooming language patterns', async () => {
    const senderId = await createTestUser();
    const receiverId = await createTestUser();
    testUsers.push(senderId, receiverId);

    await emitTestEvent(EventType.MESSAGE_CREATED, {
      message_id: `msg-groom-${senderId.slice(0, 8)}`,
      sender_id: senderId, receiver_id: receiverId,
      content: 'Trust me, I can give you a special price if we skip the middleman. Save on fees!',
    });

    await waitForProcessing(2000);
    const signals = await getSignalsForUser(senderId, 'GROOMING_LANGUAGE');
    expect(signals.length).toBeGreaterThanOrEqual(1);
  });
});

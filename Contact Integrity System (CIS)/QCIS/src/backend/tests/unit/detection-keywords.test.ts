import { describe, it, expect } from 'vitest';
import {
  detectMessagingApps,
  detectPaymentPlatforms,
  detectOffPlatformIntent,
  detectGroomingLanguage,
  detectAllKeywords,
  KeywordCategory,
} from '../../src/detection/keywords';

describe('Detection: Keyword Dictionaries', () => {
  describe('Messaging Apps', () => {
    it('detects WhatsApp references', () => {
      const matches = detectMessagingApps('Hit me up on WhatsApp');
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].category).toBe(KeywordCategory.MESSAGING_APP);
    });

    it('detects Telegram references', () => {
      const matches = detectMessagingApps('Add me on telegram for deals');
      expect(matches.length).toBeGreaterThan(0);
    });

    it('does not false-positive on clean text', () => {
      const matches = detectMessagingApps('The delivery was fast and professional');
      expect(matches.length).toBe(0);
    });
  });

  describe('Payment Platforms', () => {
    it('detects PayPal references', () => {
      const matches = detectPaymentPlatforms('Pay me via paypal instead');
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].category).toBe(KeywordCategory.PAYMENT_PLATFORM);
    });

    it('detects CashApp references', () => {
      const matches = detectPaymentPlatforms('Send me cash app payment');
      expect(matches.length).toBeGreaterThan(0);
    });

    it('detects crypto references', () => {
      const matches = detectPaymentPlatforms('I accept bitcoin payments');
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  describe('Off-Platform Intent', () => {
    it('detects direct messaging intent', () => {
      const matches = detectOffPlatformIntent('Text me directly for the price');
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].category).toBe(KeywordCategory.OFF_PLATFORM_INTENT);
    });

    it('detects platform switching intent', () => {
      const matches = detectOffPlatformIntent("Let's take this off the app");
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  describe('Grooming Language', () => {
    it('detects trust-building phrases', () => {
      const matches = detectGroomingLanguage('Trust me, I can give you a better deal privately');
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].category).toBe(KeywordCategory.GROOMING_LANGUAGE);
    });

    it('detects fee-avoidance language', () => {
      const matches = detectGroomingLanguage('We can save on fees if we go direct');
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  describe('Combined Keywords', () => {
    it('detects multiple categories in one message', () => {
      const matches = detectAllKeywords(
        'Trust me, text me on WhatsApp and pay via Venmo for a discount'
      );
      const categories = new Set(matches.map((m) => m.category));
      expect(categories.size).toBeGreaterThanOrEqual(3);
    });
  });
});

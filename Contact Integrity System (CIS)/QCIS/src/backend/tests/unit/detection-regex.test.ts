import { describe, it, expect } from 'vitest';
import {
  detectPhoneNumbers,
  detectEmails,
  detectURLs,
  detectSocialHandles,
  detectAll,
} from '../../src/detection/regex';

describe('Detection: Regex Patterns', () => {
  describe('Phone Numbers', () => {
    it('detects standard US phone numbers', () => {
      const matches = detectPhoneNumbers('Call me at 555-123-4567');
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].pattern).toBe('phone');
    });

    it('detects phone with parentheses', () => {
      const matches = detectPhoneNumbers('My number is (555) 123-4567');
      expect(matches.length).toBeGreaterThan(0);
    });

    it('detects spaced digit phone numbers', () => {
      const matches = detectPhoneNumbers('Text me at 5 5 5 1 2 3 4 5 6 7');
      expect(matches.length).toBeGreaterThan(0);
    });

    it('does not detect clean text', () => {
      const matches = detectPhoneNumbers('The product looks great, thanks!');
      expect(matches.length).toBe(0);
    });
  });

  describe('Emails', () => {
    it('detects standard email addresses', () => {
      const matches = detectEmails('Email me at john@example.com');
      expect(matches.length).toBe(1);
      expect(matches[0].match).toBe('john@example.com');
    });

    it('detects obfuscated emails with [at] and [dot]', () => {
      const matches = detectEmails('Contact john [at] gmail [dot] com');
      expect(matches.length).toBeGreaterThan(0);
    });

    it('does not false-positive on regular text', () => {
      const matches = detectEmails('I appreciate your help with the order');
      expect(matches.length).toBe(0);
    });
  });

  describe('URLs', () => {
    it('detects http/https URLs', () => {
      const matches = detectURLs('Check out https://example.com/deals');
      expect(matches.length).toBe(1);
    });

    it('detects www URLs', () => {
      const matches = detectURLs('Visit www.example.com for more');
      expect(matches.length).toBe(1);
    });

    it('does not false-positive on clean text', () => {
      const matches = detectURLs('Thank you for the quick delivery');
      expect(matches.length).toBe(0);
    });
  });

  describe('Social Handles', () => {
    it('detects @handles', () => {
      const matches = detectSocialHandles('Follow me @quickdeals ');
      expect(matches.length).toBeGreaterThan(0);
    });

    it('detects platform references', () => {
      const matches = detectSocialHandles('Find me on instagram: quickdealer123');
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  describe('Combined Detection', () => {
    it('detects multiple patterns in one message', () => {
      const matches = detectAll(
        'Text me at 555-123-4567 or email john@example.com, my ig is @dealer'
      );
      const patterns = new Set(matches.map((m) => m.pattern));
      expect(patterns.size).toBeGreaterThanOrEqual(2);
    });

    it('returns empty for clean messages', () => {
      const matches = detectAll('Thank you for the great product! Will order again.');
      expect(matches.length).toBe(0);
    });
  });
});

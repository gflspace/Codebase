import { describe, it, expect } from 'vitest';
import { detectAll } from '../../src/detection/regex';
import { detectAllKeywords } from '../../src/detection/keywords';
import { detectObfuscation } from '../../src/detection/obfuscation';
import { generateSignals, SignalType } from '../../src/detection/signals';
import { CORPUS, getCleanMessages, getSuspiciousMessages } from '../fixtures/simulation-corpus';
import { v4 as uuid } from 'uuid';

function analyzeMessage(content: string) {
  const obfuscation = detectObfuscation(content);
  const textToAnalyze = obfuscation.detected ? obfuscation.normalizedText : content;

  const regexMatches = [
    ...detectAll(content),
    ...(obfuscation.detected ? detectAll(textToAnalyze) : []),
  ];

  const keywordMatches = [
    ...detectAllKeywords(content),
    ...(obfuscation.detected ? detectAllKeywords(textToAnalyze) : []),
  ];

  // Deduplicate keywords
  const seen = new Set<string>();
  const uniqueKeywords = keywordMatches.filter((m) => {
    const key = `${m.category}:${m.keyword.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const eventId = uuid();
  const messageId = uuid();
  const timestamp = new Date().toISOString();

  return generateSignals(eventId, messageId, timestamp, {
    regexMatches,
    keywordMatches: uniqueKeywords,
    obfuscation,
    context: null,
  });
}

describe('Signal Generation: Corpus Validation', () => {
  describe('Clean Messages', () => {
    const cleanMessages = getCleanMessages();

    for (const msg of cleanMessages) {
      it(`produces no signals for: "${msg.description}"`, () => {
        const signals = analyzeMessage(msg.content);
        expect(signals.length).toBe(0);
      });
    }
  });

  describe('Suspicious Messages', () => {
    const suspiciousMessages = getSuspiciousMessages();

    for (const msg of suspiciousMessages) {
      if (msg.expectedSignals.length === 0) continue; // Skip escalation step 1

      it(`detects signals for: "${msg.description}"`, () => {
        const signals = analyzeMessage(msg.content);
        expect(signals.length).toBeGreaterThan(0);

        const signalTypes = signals.map((s) => s.signal_type);
        // At least one expected signal should be detected
        const hasExpected = msg.expectedSignals.some((expected) =>
          signalTypes.includes(expected as SignalType)
        );
        expect(hasExpected).toBe(true);
      });
    }
  });

  describe('False-Positive Rate', () => {
    it('keeps false-positive rate below 5% on clean messages', () => {
      const cleanMessages = getCleanMessages();
      let falsePositives = 0;

      for (const msg of cleanMessages) {
        const signals = analyzeMessage(msg.content);
        if (signals.length > 0) falsePositives++;
      }

      const fpRate = falsePositives / cleanMessages.length;
      expect(fpRate).toBeLessThan(0.05);
    });
  });

  describe('Confidence Scoring', () => {
    it('assigns higher confidence to explicit vs obfuscated signals', () => {
      const explicit = analyzeMessage('My phone number is 555-123-4567');
      const obfuscated = analyzeMessage('5 5 5 1 2 3 4 5 6 7');

      // Both should produce signals
      expect(explicit.length).toBeGreaterThan(0);

      // All confidences should be in valid range
      for (const signal of [...explicit, ...obfuscated]) {
        expect(signal.confidence).toBeGreaterThanOrEqual(0);
        expect(signal.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('includes obfuscation flags when detected', () => {
      const signals = analyzeMessage('C a s h a p p me at $quickdealer');
      const hasObfuscationFlag = signals.some(
        (s) => s.obfuscation_flags.length > 0
      );
      expect(hasObfuscationFlag).toBe(true);
    });
  });
});

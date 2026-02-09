import { describe, it, expect } from 'vitest';
import { detectObfuscation } from '../../src/detection/obfuscation';

describe('Detection: Obfuscation', () => {
  it('detects spaced characters', () => {
    const result = detectObfuscation('My number is 5 5 5 1 2 3 4 5 6 7');
    expect(result.detected).toBe(true);
    expect(result.flags).toContain('spaced_characters');
  });

  it('detects emoji digit substitution', () => {
    const result = detectObfuscation('Call me at 5️⃣5️⃣5️⃣ 1️⃣2️⃣3️⃣ 4️⃣5️⃣6️⃣7️⃣');
    expect(result.detected).toBe(true);
    expect(result.flags).toContain('emoji_substitution');
  });

  it('detects leetspeak', () => {
    const result = detectObfuscation('h1t m3 up 0n wh4t5 4pp');
    expect(result.detected).toBe(true);
    expect(result.flags).toContain('leetspeak');
  });

  it('returns no flags for clean text', () => {
    const result = detectObfuscation('Thank you for the wonderful service!');
    expect(result.detected).toBe(false);
    expect(result.flags.length).toBe(0);
  });

  it('normalizes obfuscated text', () => {
    const result = detectObfuscation('e m a i l me at john');
    expect(result.detected).toBe(true);
    expect(result.normalizedText).toContain('email');
  });

  it('increases confidence with multiple techniques', () => {
    const single = detectObfuscation('5 5 5 1 2 3 4 5 6 7');
    const multi = detectObfuscation('h1t m3 up 5 5 5 1 2 3 4 5 6 7');
    expect(multi.confidence).toBeGreaterThanOrEqual(single.confidence);
  });
});

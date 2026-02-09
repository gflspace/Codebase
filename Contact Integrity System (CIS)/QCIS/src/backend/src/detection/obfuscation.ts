// QwickServices CIS — Detection: Obfuscation / Evasion Detection
// Detects: spaced characters, emoji substitution, leetspeak, partial disclosure

export interface ObfuscationResult {
  detected: boolean;
  flags: string[];
  normalizedText: string;
  confidence: number; // 0.0-1.0 confidence that obfuscation was intentional
}

// ─── Emoji Number Substitution ────────────────────────────────

const EMOJI_DIGIT_MAP: Record<string, string> = {
  '0️⃣': '0', '1️⃣': '1', '2️⃣': '2', '3️⃣': '3', '4️⃣': '4',
  '5️⃣': '5', '6️⃣': '6', '7️⃣': '7', '8️⃣': '8', '9️⃣': '9',
  '🔟': '10',
  '⓪': '0', '①': '1', '②': '2', '③': '3', '④': '4',
  '⑤': '5', '⑥': '6', '⑦': '7', '⑧': '8', '⑨': '9',
};

// ─── Leetspeak Map ────────────────────────────────────────────

const LEET_MAP: Record<string, string> = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's',
  '7': 't', '8': 'b', '@': 'a', '$': 's', '!': 'i',
  '|': 'l', '+': 't',
};

// ─── Detection Functions ──────────────────────────────────────

function detectSpacedCharacters(text: string): { found: boolean; normalized: string } {
  // Pattern: single characters separated by spaces (e.g., "e m a i l" or "c o m")
  // Match sequences of single chars separated by spaces (at least 3 chars)
  const spacedPattern = /(?:^|(?<=\s))([a-zA-Z0-9](?:\s+[a-zA-Z0-9]){2,})(?=\s|$)/g;

  let normalized = text;
  let found = false;

  let match;
  const regex = new RegExp(spacedPattern.source, spacedPattern.flags);
  while ((match = regex.exec(text)) !== null) {
    const collapsed = match[1].replace(/\s+/g, '');
    normalized = normalized.replace(match[1], collapsed);
    found = true;
  }

  return { found, normalized };
}

function detectEmojiSubstitution(text: string): { found: boolean; normalized: string } {
  let normalized = text;
  let found = false;

  for (const [emoji, digit] of Object.entries(EMOJI_DIGIT_MAP)) {
    if (text.includes(emoji)) {
      normalized = normalized.split(emoji).join(digit);
      found = true;
    }
  }

  return { found, normalized };
}

function detectLeetspeak(text: string): { found: boolean; normalized: string } {
  // Only flag if it looks intentional (mixed leet characters in what looks like a word)
  // Must contain at least one letter to avoid decoding pure digit sequences like phone numbers
  const leetPattern = /\b[a-zA-Z]*[0-9@$!|+][a-zA-Z]*[0-9@$!|+]*[a-zA-Z]*\b/g;
  let normalized = text;
  let found = false;

  const matches = text.match(leetPattern);
  if (matches) {
    for (const match of matches) {
      if (match.length < 3) continue;

      // Skip pure digit sequences — they're likely numbers, not leet-encoded text
      if (/^\d+$/.test(match)) continue;

      let decoded = '';
      for (const char of match) {
        decoded += LEET_MAP[char] || char;
      }

      if (decoded !== match) {
        normalized = normalized.replace(match, decoded);
        found = true;
      }
    }
  }

  return { found, normalized };
}

function detectPartialDisclosure(text: string): { found: boolean; segments: string[] } {
  // Detect patterns like "my number starts with 555" or "email: john at g..."
  const partialPatterns = [
    /(?:number|phone|cell)\s+(?:starts?|begins?|is)\s+(?:with\s+)?\d{3,}/gi,
    /(?:first|last)\s+(?:part|half|digits?)\s+(?:is|are)\s+\d{3,}/gi,
    /(?:email|address)\s+(?:starts?|begins?|is)\s+\w+/gi,
  ];

  const segments: string[] = [];
  let found = false;

  for (const pattern of partialPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      segments.push(...matches);
      found = true;
    }
  }

  return { found, segments };
}

function detectCharacterSeparators(text: string): { found: boolean; normalized: string } {
  // Detect patterns like "5.5.5.1.2.3.4.5.6.7" or "5-5-5-1-2-3"
  // or "e.m.a.i.l" or "w|h|a|t|s|a|p|p"
  const separatorPattern = /([a-zA-Z0-9])([.\-|_/\\])\1*(?:\2[a-zA-Z0-9]){3,}/g;
  let normalized = text;
  let found = false;

  const matches = text.match(separatorPattern);
  if (matches) {
    for (const match of matches) {
      const collapsed = match.replace(/[.\-|_/\\]/g, '');
      normalized = normalized.replace(match, collapsed);
      found = true;
    }
  }

  return { found, normalized };
}

// ─── Main Obfuscation Detector ────────────────────────────────

export function detectObfuscation(text: string): ObfuscationResult {
  const flags: string[] = [];
  let normalizedText = text;
  let confidenceBoost = 0;

  // Check each obfuscation technique
  const spaced = detectSpacedCharacters(normalizedText);
  if (spaced.found) {
    flags.push('spaced_characters');
    normalizedText = spaced.normalized;
    confidenceBoost += 0.2;
  }

  const emoji = detectEmojiSubstitution(normalizedText);
  if (emoji.found) {
    flags.push('emoji_substitution');
    normalizedText = emoji.normalized;
    confidenceBoost += 0.25;
  }

  const leet = detectLeetspeak(normalizedText);
  if (leet.found) {
    flags.push('leetspeak');
    normalizedText = leet.normalized;
    confidenceBoost += 0.15;
  }

  const partial = detectPartialDisclosure(normalizedText);
  if (partial.found) {
    flags.push('partial_disclosure');
    confidenceBoost += 0.1;
  }

  const separators = detectCharacterSeparators(normalizedText);
  if (separators.found) {
    flags.push('character_separators');
    normalizedText = separators.normalized;
    confidenceBoost += 0.2;
  }

  // Multiple obfuscation techniques = higher intent confidence
  if (flags.length > 1) {
    confidenceBoost += 0.1 * (flags.length - 1);
  }

  return {
    detected: flags.length > 0,
    flags,
    normalizedText,
    confidence: Math.min(1.0, confidenceBoost),
  };
}

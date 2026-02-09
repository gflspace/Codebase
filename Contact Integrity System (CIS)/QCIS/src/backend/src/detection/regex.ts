// QwickServices CIS — Deterministic Detection: Regex Patterns
// Detects phone numbers, emails, URLs, and social handles

export interface RegexMatch {
  pattern: string;
  match: string;
  index: number;
  length: number;
}

// ─── Phone Number Patterns ────────────────────────────────────

const PHONE_PATTERNS = [
  // Standard formats: (555) 123-4567, 555-123-4567, 555.123.4567
  /(?<!\d)(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}(?!\d)/g,
  // International: +44 20 7946 0958
  /(?<!\d)\+?[1-9]\d{0,2}[-.\s]?\d{2,4}[-.\s]?\d{3,4}[-.\s]?\d{3,4}(?!\d)/g,
  // Spaced digits: 5 5 5 1 2 3 4 5 6 7
  /(?<!\d)\d(?:\s\d){9,14}(?!\d)/g,
  // Written-out numbers: five five five one two three...
  /(?:(?:zero|one|two|three|four|five|six|seven|eight|nine)[\s,.-]+){7,}/gi,
];

// ─── Email Patterns ───────────────────────────────────────────

const EMAIL_PATTERNS = [
  // Standard email
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  // Obfuscated email: user [at] domain [dot] com
  /[a-zA-Z0-9._%+-]+\s*(?:\[at\]|@|\(at\)|{at}|\bat\b)\s*[a-zA-Z0-9.-]+\s*(?:\[dot\]|\(dot\)|{dot}|\bdot\b)\s*[a-zA-Z]{2,}/gi,
  // Spaced email: j o h n @ g m a i l . c o m
  /(?:[a-zA-Z]\s){3,}(?:@|\bat\b)\s*(?:[a-zA-Z]\s){3,}(?:\.|\bdot\b)\s*[a-zA-Z\s]{2,6}/gi,
];

// ─── URL Patterns ─────────────────────────────────────────────

const URL_PATTERNS = [
  // Standard URLs
  /https?:\/\/[^\s<>\"']+/gi,
  // www URLs
  /(?<!\S)www\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s<>\"']*/gi,
  // Shortened URLs
  /(?:bit\.ly|tinyurl\.com|t\.co|goo\.gl|rb\.gy)\/[a-zA-Z0-9]+/gi,
];

// ─── Social Handle Patterns ──────────────────────────────────

const SOCIAL_PATTERNS = [
  // @handle pattern (Instagram, Twitter, Telegram)
  /(?:^|\s)@[a-zA-Z0-9_]{3,30}(?:\s|$)/g,
  // Instagram/Facebook references
  /(?:instagram|insta|ig|facebook|fb|twitter|tiktok|snapchat|snap)\s*[:\-]?\s*@?[a-zA-Z0-9_.]{3,30}/gi,
  // Obfuscated social references
  /(?:i\s*n\s*s\s*t\s*a|f\s*b|t\s*w\s*i\s*t\s*t\s*e\s*r)\s*[:\-]?\s*@?[a-zA-Z0-9_.]{3,30}/gi,
];

// ─── Detection Functions ──────────────────────────────────────

export function detectPhoneNumbers(text: string): RegexMatch[] {
  const matches: RegexMatch[] = [];
  for (const pattern of PHONE_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        pattern: 'phone',
        match: match[0],
        index: match.index,
        length: match[0].length,
      });
    }
  }
  return deduplicateMatches(matches);
}

export function detectEmails(text: string): RegexMatch[] {
  const matches: RegexMatch[] = [];
  for (const pattern of EMAIL_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        pattern: 'email',
        match: match[0],
        index: match.index,
        length: match[0].length,
      });
    }
  }
  return deduplicateMatches(matches);
}

export function detectURLs(text: string): RegexMatch[] {
  const matches: RegexMatch[] = [];
  for (const pattern of URL_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        pattern: 'url',
        match: match[0],
        index: match.index,
        length: match[0].length,
      });
    }
  }
  return deduplicateMatches(matches);
}

export function detectSocialHandles(text: string): RegexMatch[] {
  const matches: RegexMatch[] = [];
  for (const pattern of SOCIAL_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        pattern: 'social',
        match: match[0].trim(),
        index: match.index,
        length: match[0].length,
      });
    }
  }
  return deduplicateMatches(matches);
}

export function detectAll(text: string): RegexMatch[] {
  return [
    ...detectPhoneNumbers(text),
    ...detectEmails(text),
    ...detectURLs(text),
    ...detectSocialHandles(text),
  ];
}

// Remove overlapping matches, keeping the longest
function deduplicateMatches(matches: RegexMatch[]): RegexMatch[] {
  if (matches.length <= 1) return matches;

  matches.sort((a, b) => a.index - b.index || b.length - a.length);

  const result: RegexMatch[] = [matches[0]];
  for (let i = 1; i < matches.length; i++) {
    const prev = result[result.length - 1];
    const curr = matches[i];
    // Skip if current overlaps with previous
    if (curr.index < prev.index + prev.length) continue;
    result.push(curr);
  }

  return result;
}

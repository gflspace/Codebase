// QwickServices CIS — Detection: Keyword Dictionaries
// Categories: messaging apps, payment platforms, intent phrases, grooming language

export interface KeywordMatch {
  category: KeywordCategory;
  keyword: string;
  index: number;
  context: string; // surrounding text for review
}

export enum KeywordCategory {
  MESSAGING_APP = 'messaging_app',
  PAYMENT_PLATFORM = 'payment_platform',
  OFF_PLATFORM_INTENT = 'off_platform_intent',
  GROOMING_LANGUAGE = 'grooming_language',
}

// ─── Keyword Dictionaries ─────────────────────────────────────

const MESSAGING_APP_KEYWORDS = [
  'whatsapp', 'whatapp', 'watsapp', 'wa', 'what\'s app', 'whats app',
  'telegram', 'tg', 'telgram',
  'signal', 'signal app',
  'imessage', 'facetime',
  'discord', 'disc',
  'snapchat', 'snap',
  'wechat', 'line app',
  'viber', 'kik',
  'messenger', 'fb messenger',
];

const PAYMENT_PLATFORM_KEYWORDS = [
  'venmo', 'paypal', 'cashapp', 'cash app', 'ca$happ',
  'zelle', 'apple pay', 'google pay', 'gpay',
  'bitcoin', 'btc', 'ethereum', 'eth', 'crypto',
  'western union', 'moneygram',
  'wire transfer', 'bank transfer', 'direct deposit',
  'cash only', 'pay directly', 'pay me directly',
  'outside the app', 'off platform payment',
];

const OFF_PLATFORM_INTENT_KEYWORDS = [
  'text me', 'call me', 'dm me', 'message me',
  'hit me up', 'hmu', 'reach me at',
  'contact me at', 'contact me on', 'contact me via',
  'off the app', 'off platform', 'outside the platform',
  'take this offline', 'take this conversation offline', 'talk privately', 'talk directly',
  'lets move to', 'lets go to', 'switch to',
  'my number is', 'my email is', 'my handle is',
  'add me on', 'find me on', 'follow me on',
];

const GROOMING_LANGUAGE_KEYWORDS = [
  'trust me', 'i promise', 'between us',
  'just this once', 'special deal', 'exclusive offer',
  'don\'t tell', 'keep this between', 'our secret',
  'no need for the platform', 'skip the middleman',
  'save on fees', 'avoid the fee', 'no commission',
  'i\'ll give you a discount', 'better price privately',
  'we can work something out', 'side deal',
  'privately', 'in private', 'just between us',
];

// ─── Keyword Detection ────────────────────────────────────────

function searchKeywords(
  text: string,
  keywords: string[],
  category: KeywordCategory
): KeywordMatch[] {
  const lowerText = text.toLowerCase();
  const matches: KeywordMatch[] = [];

  for (const keyword of keywords) {
    const lowerKeyword = keyword.toLowerCase();
    let searchStart = 0;

    while (true) {
      const index = lowerText.indexOf(lowerKeyword, searchStart);
      if (index === -1) break;

      // Check word boundaries (avoid matching substrings of larger words)
      const charBefore = index > 0 ? lowerText[index - 1] : ' ';
      const charAfter = index + lowerKeyword.length < lowerText.length
        ? lowerText[index + lowerKeyword.length]
        : ' ';

      const isWordBoundary = /[\s.,!?;:'"()\-/]/.test(charBefore) || index === 0;
      const isWordEnd = /[\s.,!?;:'"()\-/]/.test(charAfter) || index + lowerKeyword.length === lowerText.length;

      if (isWordBoundary && isWordEnd) {
        const contextStart = Math.max(0, index - 30);
        const contextEnd = Math.min(text.length, index + lowerKeyword.length + 30);

        matches.push({
          category,
          keyword: text.substring(index, index + lowerKeyword.length),
          index,
          context: text.substring(contextStart, contextEnd),
        });
      }

      searchStart = index + 1;
    }
  }

  return matches;
}

export function detectMessagingApps(text: string): KeywordMatch[] {
  return searchKeywords(text, MESSAGING_APP_KEYWORDS, KeywordCategory.MESSAGING_APP);
}

export function detectPaymentPlatforms(text: string): KeywordMatch[] {
  return searchKeywords(text, PAYMENT_PLATFORM_KEYWORDS, KeywordCategory.PAYMENT_PLATFORM);
}

export function detectOffPlatformIntent(text: string): KeywordMatch[] {
  return searchKeywords(text, OFF_PLATFORM_INTENT_KEYWORDS, KeywordCategory.OFF_PLATFORM_INTENT);
}

export function detectGroomingLanguage(text: string): KeywordMatch[] {
  return searchKeywords(text, GROOMING_LANGUAGE_KEYWORDS, KeywordCategory.GROOMING_LANGUAGE);
}

export function detectAllKeywords(text: string): KeywordMatch[] {
  return [
    ...detectMessagingApps(text),
    ...detectPaymentPlatforms(text),
    ...detectOffPlatformIntent(text),
    ...detectGroomingLanguage(text),
  ];
}

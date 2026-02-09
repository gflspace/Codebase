// QwickServices CIS — Simulation Corpus
// Test data for false-positive/false-negative evaluation

export interface CorpusMessage {
  content: string;
  expectedSignals: string[];
  category: 'clean' | 'single_signal' | 'obfuscated' | 'escalation' | 'coordinated';
  description: string;
}

export const CORPUS: CorpusMessage[] = [
  // ─── Clean Messages (No Violations) ─────────────────────────

  {
    content: 'Hi! I just placed my order. When can I expect delivery?',
    expectedSignals: [],
    category: 'clean',
    description: 'Normal order inquiry',
  },
  {
    content: 'Thanks for the quick response. The product looks great!',
    expectedSignals: [],
    category: 'clean',
    description: 'Positive feedback',
  },
  {
    content: 'Can you tell me more about the warranty?',
    expectedSignals: [],
    category: 'clean',
    description: 'Product question',
  },
  {
    content: 'I need to update my shipping address before dispatch.',
    expectedSignals: [],
    category: 'clean',
    description: 'Shipping update request',
  },
  {
    content: 'The package arrived in perfect condition. Thank you!',
    expectedSignals: [],
    category: 'clean',
    description: 'Delivery confirmation',
  },
  {
    content: 'Do you have this item in a different color?',
    expectedSignals: [],
    category: 'clean',
    description: 'Product variant inquiry',
  },
  {
    content: 'What are your business hours?',
    expectedSignals: [],
    category: 'clean',
    description: 'Business inquiry',
  },
  {
    content: 'I would like to request a refund for my recent purchase.',
    expectedSignals: [],
    category: 'clean',
    description: 'Refund request',
  },
  {
    content: 'Great experience overall. Five stars!',
    expectedSignals: [],
    category: 'clean',
    description: 'Review',
  },
  {
    content: 'Is international shipping available?',
    expectedSignals: [],
    category: 'clean',
    description: 'Shipping question',
  },

  // ─── Single-Signal Violations ───────────────────────────────

  {
    content: 'My phone number is 555-123-4567, text me there',
    expectedSignals: ['CONTACT_PHONE', 'OFF_PLATFORM_INTENT'],
    category: 'single_signal',
    description: 'Direct phone disclosure',
  },
  {
    content: 'Email me at john@example.com for the details',
    expectedSignals: ['CONTACT_EMAIL'],
    category: 'single_signal',
    description: 'Direct email disclosure',
  },
  {
    content: 'Add me on WhatsApp, we can discuss the price',
    expectedSignals: ['CONTACT_MESSAGING_APP', 'OFF_PLATFORM_INTENT'],
    category: 'single_signal',
    description: 'Messaging app solicitation',
  },
  {
    content: 'I can pay you via PayPal instead',
    expectedSignals: ['PAYMENT_EXTERNAL'],
    category: 'single_signal',
    description: 'External payment reference',
  },
  {
    content: 'Follow me on instagram @sidedeal for more',
    expectedSignals: ['CONTACT_SOCIAL'],
    category: 'single_signal',
    description: 'Social media handle sharing',
  },
  {
    content: 'Lets take this conversation offline',
    expectedSignals: ['OFF_PLATFORM_INTENT'],
    category: 'single_signal',
    description: 'Off-platform intent',
  },
  {
    content: 'Trust me, I can give you a much better deal privately',
    expectedSignals: ['GROOMING_LANGUAGE'],
    category: 'single_signal',
    description: 'Grooming/trust-building language',
  },

  // ─── Obfuscated Messages ────────────────────────────────────

  {
    content: 'My number is 5 5 5 1 2 3 4 5 6 7 text me there',
    expectedSignals: ['CONTACT_PHONE', 'OFF_PLATFORM_INTENT'],
    category: 'obfuscated',
    description: 'Spaced digit phone number',
  },
  {
    content: 'em@il me >> john [at] g m a i l [dot] c o m',
    expectedSignals: ['CONTACT_EMAIL'],
    category: 'obfuscated',
    description: 'Obfuscated email',
  },
  {
    content: 'h1t m3 up 0n wh4t5 4pp',
    expectedSignals: ['CONTACT_MESSAGING_APP'],
    category: 'obfuscated',
    description: 'Leetspeak messaging app reference',
  },
  {
    content: 'C a s h a p p me at $quickdealer',
    expectedSignals: ['PAYMENT_EXTERNAL'],
    category: 'obfuscated',
    description: 'Spaced payment platform reference',
  },
  {
    content: 'Call me at 5️⃣5️⃣5️⃣ 1️⃣2️⃣3️⃣ 4️⃣5️⃣6️⃣7️⃣',
    expectedSignals: ['CONTACT_PHONE'],
    category: 'obfuscated',
    description: 'Emoji digit phone number',
  },
  {
    content: 'p a y p a l dot me slash directpay',
    expectedSignals: ['PAYMENT_EXTERNAL'],
    category: 'obfuscated',
    description: 'Spaced and obfuscated PayPal reference',
  },

  // ─── Escalation Sequences ───────────────────────────────────

  {
    content: 'Hey, just wondering about the price difference',
    expectedSignals: [],
    category: 'escalation',
    description: 'Escalation step 1: innocent inquiry',
  },
  {
    content: 'You know, we could save on fees if we work this out directly',
    expectedSignals: ['GROOMING_LANGUAGE'],
    category: 'escalation',
    description: 'Escalation step 2: fee-avoidance suggestion',
  },
  {
    content: 'My WhatsApp is ready, just add me and we can finalize privately',
    expectedSignals: ['CONTACT_MESSAGING_APP', 'OFF_PLATFORM_INTENT', 'GROOMING_LANGUAGE'],
    category: 'escalation',
    description: 'Escalation step 3: explicit off-platform move',
  },

  // ─── Coordinated/Multi-Signal ───────────────────────────────

  {
    content: 'Text me at 555-123-4567 or WhatsApp, I accept Venmo and CashApp. Trust me, better deal off-platform!',
    expectedSignals: [
      'CONTACT_PHONE', 'CONTACT_MESSAGING_APP', 'PAYMENT_EXTERNAL',
      'OFF_PLATFORM_INTENT', 'GROOMING_LANGUAGE',
    ],
    category: 'coordinated',
    description: 'Multi-signal: phone + messaging + payment + intent + grooming',
  },
  {
    content: 'Find me on instagram @bypasser, pay via crypto, skip the middleman',
    expectedSignals: ['CONTACT_SOCIAL', 'PAYMENT_EXTERNAL', 'GROOMING_LANGUAGE'],
    category: 'coordinated',
    description: 'Multi-signal: social + crypto + grooming',
  },
];

export function getCleanMessages(): CorpusMessage[] {
  return CORPUS.filter((m) => m.category === 'clean');
}

export function getSuspiciousMessages(): CorpusMessage[] {
  return CORPUS.filter((m) => m.category !== 'clean');
}

export function getObfuscatedMessages(): CorpusMessage[] {
  return CORPUS.filter((m) => m.category === 'obfuscated');
}

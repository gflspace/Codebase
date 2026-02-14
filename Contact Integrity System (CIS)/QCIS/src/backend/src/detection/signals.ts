// QwickServices CIS — Detection: Signal Generation
// Produces structured RiskSignal output from detection results

import { RegexMatch } from './regex';
import { KeywordMatch, KeywordCategory } from './keywords';
import { ObfuscationResult } from './obfuscation';
import { ConversationContext } from './context';

// Signal types matching the spec
export enum SignalType {
  CONTACT_PHONE = 'CONTACT_PHONE',
  CONTACT_EMAIL = 'CONTACT_EMAIL',
  CONTACT_SOCIAL = 'CONTACT_SOCIAL',
  CONTACT_MESSAGING_APP = 'CONTACT_MESSAGING_APP',
  PAYMENT_EXTERNAL = 'PAYMENT_EXTERNAL',
  OFF_PLATFORM_INTENT = 'OFF_PLATFORM_INTENT',
  GROOMING_LANGUAGE = 'GROOMING_LANGUAGE',
  TX_REDIRECT_ATTEMPT = 'TX_REDIRECT_ATTEMPT',
  TX_FAILURE_CORRELATED = 'TX_FAILURE_CORRELATED',
  TX_TIMING_ALIGNMENT = 'TX_TIMING_ALIGNMENT',

  // Phase 2A stubs (migration 016)
  BOOKING_CANCEL_PATTERN = 'BOOKING_CANCEL_PATTERN',
  BOOKING_NO_SHOW_PATTERN = 'BOOKING_NO_SHOW_PATTERN',
  WALLET_VELOCITY_SPIKE = 'WALLET_VELOCITY_SPIKE',
  WALLET_SPLIT_PATTERN = 'WALLET_SPLIT_PATTERN',
  PROVIDER_RATING_DROP = 'PROVIDER_RATING_DROP',
  PROVIDER_COMPLAINT_CLUSTER = 'PROVIDER_COMPLAINT_CLUSTER',

  // Phase 2C — Booking anomaly signals
  BOOKING_RAPID_CANCELLATION = 'BOOKING_RAPID_CANCELLATION',
  BOOKING_FAKE_COMPLETION = 'BOOKING_FAKE_COMPLETION',
  BOOKING_SAME_PROVIDER_REPEAT = 'BOOKING_SAME_PROVIDER_REPEAT',
  BOOKING_TIME_CLUSTERING = 'BOOKING_TIME_CLUSTERING',
  BOOKING_VALUE_ANOMALY = 'BOOKING_VALUE_ANOMALY',

  // Phase 2C — Payment anomaly signals
  PAYMENT_CIRCULAR = 'PAYMENT_CIRCULAR',
  PAYMENT_RAPID_TOPUP = 'PAYMENT_RAPID_TOPUP',
  PAYMENT_SPLIT_TRANSACTION = 'PAYMENT_SPLIT_TRANSACTION',
  PAYMENT_METHOD_SWITCHING = 'PAYMENT_METHOD_SWITCHING',
  PAYMENT_WITHDRAWAL_SPIKE = 'PAYMENT_WITHDRAWAL_SPIKE',

  // Phase 2C — Provider behavior signals
  PROVIDER_DUPLICATE_IDENTITY = 'PROVIDER_DUPLICATE_IDENTITY',
  PROVIDER_RESPONSE_DEGRADATION = 'PROVIDER_RESPONSE_DEGRADATION',
  PROVIDER_RATING_MANIPULATION = 'PROVIDER_RATING_MANIPULATION',
  PROVIDER_CANCELLATION_SPIKE = 'PROVIDER_CANCELLATION_SPIKE',

  // Phase 2C — Temporal pattern signals
  TEMPORAL_BURST_ACTIVITY = 'TEMPORAL_BURST_ACTIVITY',
  TEMPORAL_DORMANT_ACTIVATION = 'TEMPORAL_DORMANT_ACTIVATION',

  // Phase 2C — Contact change signals
  CONTACT_PHONE_CHANGED = 'CONTACT_PHONE_CHANGED',
  CONTACT_EMAIL_CHANGED = 'CONTACT_EMAIL_CHANGED',

  // Phase 4 — Cross-signal correlation types
  BOOKING_CANCEL_AFTER_CONTACT = 'BOOKING_CANCEL_AFTER_CONTACT',
  REPEATED_UNPAID_BOOKING = 'REPEATED_UNPAID_BOOKING',
  DISCOUNT_OFFER_DETECTED = 'DISCOUNT_OFFER_DETECTED',
  OFF_PLATFORM_TRANSACTION_CORRELATED = 'OFF_PLATFORM_TRANSACTION_CORRELATED',
}

export interface GeneratedSignal {
  signal_type: SignalType;
  confidence: number;
  evidence: {
    message_ids: string[];
    timestamps: string[];
  };
  obfuscation_flags: string[];
  pattern_flags: string[];
}

interface DetectionResult {
  regexMatches: RegexMatch[];
  keywordMatches: KeywordMatch[];
  obfuscation: ObfuscationResult;
  context: ConversationContext | null;
}

// ─── Confidence Scoring ───────────────────────────────────────

function baseConfidence(matchCount: number): number {
  if (matchCount === 0) return 0;
  if (matchCount === 1) return 0.5;
  if (matchCount === 2) return 0.7;
  return 0.85;
}

function applyObfuscationBoost(confidence: number, obfuscation: ObfuscationResult): number {
  // Obfuscation implies intent — boost confidence
  if (obfuscation.detected) {
    return Math.min(1.0, confidence + obfuscation.confidence * 0.3);
  }
  return confidence;
}

function applyContextBoost(confidence: number, context: ConversationContext | null): number {
  if (!context) return confidence;

  let boost = 0;

  // Transaction proximity increases confidence
  if (context.transactionProximity) {
    if (context.transactionProximity.phase === 'payment_window') {
      boost += 0.15;
    } else if (context.transactionProximity.phase === 'pre_payment') {
      boost += 0.1;
    }
  }

  // Escalation pattern (multiple signal types from same user)
  if (context.conversationPattern.hasEscalation) {
    boost += 0.1;
  }

  // Repeated signals in conversation
  if (context.conversationPattern.uniqueSignalTypes > 3) {
    boost += 0.1;
  }

  return Math.min(1.0, confidence + boost);
}

// ─── Signal Generation ────────────────────────────────────────

export function generateSignals(
  sourceEventId: string,
  messageId: string,
  messageTimestamp: string,
  detection: DetectionResult
): GeneratedSignal[] {
  const signals: GeneratedSignal[] = [];
  const { regexMatches, keywordMatches, obfuscation, context } = detection;

  const evidence = {
    message_ids: [messageId],
    timestamps: [messageTimestamp],
  };

  // Add context message IDs to evidence
  if (context?.messages) {
    for (const msg of context.messages) {
      if (msg.id !== messageId && !evidence.message_ids.includes(msg.id)) {
        evidence.message_ids.push(msg.id);
        evidence.timestamps.push(msg.created_at);
      }
    }
  }

  const patternFlags: string[] = [];
  if (context?.conversationPattern.hasEscalation) {
    patternFlags.push('ESCALATION_PATTERN');
  }
  if ((context?.conversationPattern.messageCount ?? 0) > 10) {
    patternFlags.push('HIGH_VOLUME_CONVERSATION');
  }

  // 1. Phone number signals
  const phoneMatches = regexMatches.filter((m) => m.pattern === 'phone');
  if (phoneMatches.length > 0) {
    let confidence = baseConfidence(phoneMatches.length);
    confidence = applyObfuscationBoost(confidence, obfuscation);
    confidence = applyContextBoost(confidence, context);

    signals.push({
      signal_type: SignalType.CONTACT_PHONE,
      confidence,
      evidence,
      obfuscation_flags: obfuscation.flags,
      pattern_flags: [...patternFlags, ...(phoneMatches.length > 1 ? ['REPEATED_SIGNALS'] : [])],
    });
  }

  // 2. Email signals
  const emailMatches = regexMatches.filter((m) => m.pattern === 'email');
  if (emailMatches.length > 0) {
    let confidence = baseConfidence(emailMatches.length);
    confidence = applyObfuscationBoost(confidence, obfuscation);
    confidence = applyContextBoost(confidence, context);

    signals.push({
      signal_type: SignalType.CONTACT_EMAIL,
      confidence,
      evidence,
      obfuscation_flags: obfuscation.flags,
      pattern_flags: patternFlags,
    });
  }

  // 3. Social handle signals
  const socialMatches = regexMatches.filter((m) => m.pattern === 'social');
  if (socialMatches.length > 0) {
    let confidence = baseConfidence(socialMatches.length);
    confidence = applyObfuscationBoost(confidence, obfuscation);
    confidence = applyContextBoost(confidence, context);

    signals.push({
      signal_type: SignalType.CONTACT_SOCIAL,
      confidence,
      evidence,
      obfuscation_flags: obfuscation.flags,
      pattern_flags: patternFlags,
    });
  }

  // 4. Messaging app signals (from keywords)
  const messagingMatches = keywordMatches.filter((m) => m.category === KeywordCategory.MESSAGING_APP);
  if (messagingMatches.length > 0) {
    let confidence = baseConfidence(messagingMatches.length);
    confidence = applyObfuscationBoost(confidence, obfuscation);
    confidence = applyContextBoost(confidence, context);

    signals.push({
      signal_type: SignalType.CONTACT_MESSAGING_APP,
      confidence,
      evidence,
      obfuscation_flags: obfuscation.flags,
      pattern_flags: patternFlags,
    });
  }

  // 5. External payment signals
  const paymentMatches = keywordMatches.filter((m) => m.category === KeywordCategory.PAYMENT_PLATFORM);
  if (paymentMatches.length > 0) {
    let confidence = baseConfidence(paymentMatches.length);
    confidence = applyObfuscationBoost(confidence, obfuscation);
    confidence = applyContextBoost(confidence, context);

    signals.push({
      signal_type: SignalType.PAYMENT_EXTERNAL,
      confidence,
      evidence,
      obfuscation_flags: obfuscation.flags,
      pattern_flags: patternFlags,
    });
  }

  // 6. Off-platform intent
  const intentMatches = keywordMatches.filter((m) => m.category === KeywordCategory.OFF_PLATFORM_INTENT);
  if (intentMatches.length > 0) {
    let confidence = baseConfidence(intentMatches.length);
    confidence = applyObfuscationBoost(confidence, obfuscation);
    confidence = applyContextBoost(confidence, context);

    signals.push({
      signal_type: SignalType.OFF_PLATFORM_INTENT,
      confidence,
      evidence,
      obfuscation_flags: obfuscation.flags,
      pattern_flags: patternFlags,
    });
  }

  // 7. Grooming language
  const groomingMatches = keywordMatches.filter((m) => m.category === KeywordCategory.GROOMING_LANGUAGE);
  if (groomingMatches.length > 0) {
    let confidence = baseConfidence(groomingMatches.length) * 0.8; // Lower base for grooming
    confidence = applyContextBoost(confidence, context);

    signals.push({
      signal_type: SignalType.GROOMING_LANGUAGE,
      confidence,
      evidence,
      obfuscation_flags: [],
      pattern_flags: patternFlags,
    });
  }

  // 8. Transaction-related signals (from context)
  if (context?.transactionProximity) {
    const tx = context.transactionProximity;

    // TX redirect attempt: external payment keyword + active transaction
    if (paymentMatches.length > 0 && tx.phase !== 'post_payment') {
      signals.push({
        signal_type: SignalType.TX_REDIRECT_ATTEMPT,
        confidence: Math.min(1.0, 0.7 + (obfuscation.detected ? 0.15 : 0)),
        evidence,
        obfuscation_flags: obfuscation.flags,
        pattern_flags: [...patternFlags, 'TRANSACTION_PROXIMATE'],
      });
    }

    // TX failure correlated: message near failed transaction
    if (tx.status === 'failed' && tx.timeDelta < 600000) { // 10 minutes
      signals.push({
        signal_type: SignalType.TX_FAILURE_CORRELATED,
        confidence: 0.6,
        evidence: {
          ...evidence,
          message_ids: [...evidence.message_ids],
          timestamps: [...evidence.timestamps],
        },
        obfuscation_flags: [],
        pattern_flags: [...patternFlags, 'TX_FAILURE_RECENT'],
      });
    }

    // TX timing alignment: message during payment window
    if (tx.phase === 'payment_window') {
      signals.push({
        signal_type: SignalType.TX_TIMING_ALIGNMENT,
        confidence: 0.5,
        evidence,
        obfuscation_flags: [],
        pattern_flags: [...patternFlags, 'PAYMENT_WINDOW'],
      });
    }
  }

  return signals;
}

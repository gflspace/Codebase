// QwickServices CIS — Detection Orchestrator
// Coordinates regex, keyword, obfuscation, and context analysis
// Hard constraint: Detection NEVER enforces or assigns risk tiers

import { detectAll } from './regex';
import { detectAllKeywords } from './keywords';
import { detectObfuscation } from './obfuscation';
import { analyzeContext } from './context';
import { generateSignals, GeneratedSignal } from './signals';
import { DomainEvent, EventType } from '../events/types';
import { persistSignal } from './persist';

export interface DetectionOutput {
  event_id: string;
  signals: GeneratedSignal[];
  processing_time_ms: number;
}

/**
 * Analyze a domain event and produce risk signals.
 * This is the main entry point for the detection pipeline.
 */
export async function analyzeEvent(event: DomainEvent): Promise<DetectionOutput> {
  const startTime = Date.now();

  // Only analyze message events
  if (!isMessageEvent(event.type)) {
    return { event_id: event.id, signals: [], processing_time_ms: Date.now() - startTime };
  }

  const payload = event.payload as {
    message_id?: string;
    sender_id?: string;
    receiver_id?: string;
    content?: string;
  };

  if (!payload.content || !payload.sender_id || !payload.receiver_id) {
    return { event_id: event.id, signals: [], processing_time_ms: Date.now() - startTime };
  }

  const content = payload.content;
  const messageId = payload.message_id || event.id;

  // Step 1: Obfuscation detection + normalization
  const obfuscation = detectObfuscation(content);
  const textToAnalyze = obfuscation.detected ? obfuscation.normalizedText : content;

  // Step 2: Deterministic detection on both original and normalized text
  const regexMatches = [
    ...detectAll(content),
    ...(obfuscation.detected ? detectAll(textToAnalyze) : []),
  ];

  // Step 3: Keyword detection
  const keywordMatches = [
    ...detectAllKeywords(content),
    ...(obfuscation.detected ? detectAllKeywords(textToAnalyze) : []),
  ];

  // Deduplicate keyword matches
  const seenKeywords = new Set<string>();
  const uniqueKeywordMatches = keywordMatches.filter((m) => {
    const key = `${m.category}:${m.keyword.toLowerCase()}`;
    if (seenKeywords.has(key)) return false;
    seenKeywords.add(key);
    return true;
  });

  // Step 4: Contextual analysis (windowed conversation context)
  let context = null;
  try {
    context = await analyzeContext(
      messageId,
      payload.sender_id,
      payload.receiver_id,
      event.timestamp
    );
  } catch {
    // Context analysis failure is non-fatal
  }

  // Step 5: Signal generation
  const signals = generateSignals(
    event.id,
    messageId,
    event.timestamp,
    {
      regexMatches,
      keywordMatches: uniqueKeywordMatches,
      obfuscation,
      context,
    }
  );

  // Step 6: Persist signals to database
  for (const signal of signals) {
    await persistSignal(event.id, payload.sender_id, {
      signal_type: signal.signal_type,
      confidence: signal.confidence,
      evidence: signal.evidence,
      obfuscation_flags: signal.obfuscation_flags,
      pattern_flags: signal.pattern_flags,
    });
  }

  return {
    event_id: event.id,
    signals,
    processing_time_ms: Date.now() - startTime,
  };
}

/**
 * Register the detection orchestrator as an event bus consumer.
 */
export function registerDetectionConsumer(): void {
  const { getEventBus } = require('../events/bus');
  const bus = getEventBus();

  bus.registerConsumer({
    name: 'detection-orchestrator',
    eventTypes: [
      EventType.MESSAGE_CREATED,
      EventType.MESSAGE_EDITED,
    ],
    handler: async (event: DomainEvent) => {
      const result = await analyzeEvent(event);
      if (result.signals.length > 0) {
        console.log(
          `[Detection] Event ${event.id.slice(0, 8)}: ${result.signals.length} signal(s) in ${result.processing_time_ms}ms`
        );
      }
    },
  });
}

function isMessageEvent(type: EventType): boolean {
  return [
    EventType.MESSAGE_CREATED,
    EventType.MESSAGE_EDITED,
  ].includes(type);
}

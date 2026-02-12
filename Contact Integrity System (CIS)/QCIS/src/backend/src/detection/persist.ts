// QwickServices CIS — Shared Signal Persistence Helper
// Used by all detection consumers to INSERT risk_signals rows.

import { query } from '../database/connection';
import { generateId } from '../shared/utils';

export interface PersistableSignal {
  signal_type: string;
  confidence: number;
  evidence: Record<string, unknown>;
  obfuscation_flags?: string[];
  pattern_flags?: string[];
}

export async function persistSignal(
  sourceEventId: string,
  userId: string,
  signal: PersistableSignal
): Promise<void> {
  try {
    await query(
      `INSERT INTO risk_signals (id, source_event_id, user_id, signal_type, confidence, evidence, obfuscation_flags, pattern_flags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        generateId(),
        sourceEventId,
        userId,
        signal.signal_type,
        Math.min(1.0, Math.max(0, signal.confidence)),
        JSON.stringify(signal.evidence),
        signal.obfuscation_flags ?? [],
        signal.pattern_flags ?? [],
      ]
    );
  } catch (err) {
    console.error(`[Detection] Failed to persist signal ${signal.signal_type}:`, err);
  }
}

// QwickServices CIS — Phase 2C: Payment Anomaly Detection Consumer
// Analyzes wallet/transaction events for circular payments, rapid top-ups,
// split transactions, method switching, and withdrawal spikes.

import { DomainEvent, EventType, WalletEventPayload, TransactionEventPayload } from '../../events/types';
import { SignalType } from '../signals';
import { persistSignal } from '../persist';
import { query } from '../../database/connection';

// ─── Payload extraction ─────────────────────────────────────────

function extractUserId(event: DomainEvent): string | null {
  const p = event.payload as Record<string, unknown>;
  return (p.user_id as string) ?? null;
}

function extractCounterpartyId(event: DomainEvent): string | null {
  const p = event.payload as Record<string, unknown>;
  return (p.counterparty_id as string) ?? null;
}

function extractAmount(event: DomainEvent): number {
  const p = event.payload as Record<string, unknown>;
  return typeof p.amount === 'number' ? p.amount : 0;
}

// ─── Detection Logic ────────────────────────────────────────────

async function detectCircularPayment(event: DomainEvent): Promise<void> {
  const userId = extractUserId(event);
  const counterpartyId = extractCounterpartyId(event);
  const amount = extractAmount(event);
  if (!userId || !counterpartyId || amount <= 0) return;

  try {
    // Check if counterparty sent a similar amount back to this user in last 48h
    const result = await query(
      `SELECT COUNT(*) AS reverse_count
       FROM wallet_transactions
       WHERE user_id = $1
         AND counterparty_id = $2
         AND amount BETWEEN $3 * 0.8 AND $3 * 1.2
         AND created_at >= NOW() - INTERVAL '48 hours'`,
      [counterpartyId, userId, amount]
    );
    const count = parseInt(result.rows[0]?.reverse_count ?? '0', 10);
    if (count > 0) {
      await persistSignal(event.id, userId, {
        signal_type: SignalType.PAYMENT_CIRCULAR,
        confidence: 0.75,
        evidence: {
          user_id: userId,
          counterparty_id: counterpartyId,
          amount,
          reverse_count_48h: count,
        },
      });
    }
  } catch (err) {
    console.error('[PaymentAnomaly] detectCircularPayment error:', err);
  }
}

async function detectRapidTopup(event: DomainEvent): Promise<void> {
  const userId = extractUserId(event);
  if (!userId) return;

  try {
    const result = await query(
      `SELECT COUNT(*) AS deposit_count
       FROM wallet_transactions
       WHERE user_id = $1
         AND tx_type = 'deposit'
         AND created_at >= NOW() - INTERVAL '24 hours'`,
      [userId]
    );
    const count = parseInt(result.rows[0]?.deposit_count ?? '0', 10);
    if (count >= 3) {
      const extra = count - 3;
      await persistSignal(event.id, userId, {
        signal_type: SignalType.PAYMENT_RAPID_TOPUP,
        confidence: Math.min(0.85, 0.5 + extra * 0.1),
        evidence: { user_id: userId, deposit_count_24h: count },
      });
    }
  } catch (err) {
    console.error('[PaymentAnomaly] detectRapidTopup error:', err);
  }
}

async function detectSplitTransaction(event: DomainEvent): Promise<void> {
  const userId = extractUserId(event);
  const counterpartyId = extractCounterpartyId(event);
  if (!userId || !counterpartyId) return;

  try {
    // Count transactions to same counterparty in last 1h and their sum
    const result = await query(
      `SELECT COUNT(*) AS tx_count, COALESCE(SUM(amount), 0) AS total
       FROM wallet_transactions
       WHERE user_id = $1
         AND counterparty_id = $2
         AND created_at >= NOW() - INTERVAL '1 hour'`,
      [userId, counterpartyId]
    );
    const txCount = parseInt(result.rows[0]?.tx_count ?? '0', 10);
    const total = parseFloat(result.rows[0]?.total ?? '0');

    if (txCount < 2) return;

    // Compare sum to user's average single transaction
    const avgResult = await query(
      `SELECT AVG(amount) AS avg_amount
       FROM wallet_transactions
       WHERE user_id = $1
         AND amount > 0`,
      [userId]
    );
    const avgAmount = parseFloat(avgResult.rows[0]?.avg_amount ?? '0');
    if (avgAmount > 0 && total > avgAmount) {
      await persistSignal(event.id, userId, {
        signal_type: SignalType.PAYMENT_SPLIT_TRANSACTION,
        confidence: 0.6,
        evidence: {
          user_id: userId,
          counterparty_id: counterpartyId,
          tx_count_1h: txCount,
          total_1h: total,
          avg_single_tx: avgAmount,
        },
      });
    }
  } catch (err) {
    console.error('[PaymentAnomaly] detectSplitTransaction error:', err);
  }
}

async function detectMethodSwitching(event: DomainEvent): Promise<void> {
  const userId = extractUserId(event);
  if (!userId) return;

  try {
    const result = await query(
      `SELECT COUNT(DISTINCT payment_method) AS method_count
       FROM wallet_transactions
       WHERE user_id = $1
         AND payment_method IS NOT NULL
         AND created_at >= NOW() - INTERVAL '7 days'`,
      [userId]
    );
    const count = parseInt(result.rows[0]?.method_count ?? '0', 10);
    if (count >= 3) {
      await persistSignal(event.id, userId, {
        signal_type: SignalType.PAYMENT_METHOD_SWITCHING,
        confidence: 0.5,
        evidence: { user_id: userId, distinct_methods_7d: count },
      });
    }
  } catch (err) {
    console.error('[PaymentAnomaly] detectMethodSwitching error:', err);
  }
}

async function detectWithdrawalSpike(event: DomainEvent): Promise<void> {
  const userId = extractUserId(event);
  const amount = extractAmount(event);
  if (!userId || amount <= 0) return;

  try {
    const result = await query(
      `SELECT AVG(amount) AS avg_deposit
       FROM wallet_transactions
       WHERE user_id = $1
         AND tx_type = 'deposit'`,
      [userId]
    );
    const avgDeposit = parseFloat(result.rows[0]?.avg_deposit ?? '0');
    if (avgDeposit > 0 && amount > avgDeposit * 2) {
      await persistSignal(event.id, userId, {
        signal_type: SignalType.PAYMENT_WITHDRAWAL_SPIKE,
        confidence: 0.6,
        evidence: {
          user_id: userId,
          withdrawal_amount: amount,
          avg_deposit: avgDeposit,
          ratio: Math.round((amount / avgDeposit) * 100) / 100,
        },
      });
    }
  } catch (err) {
    console.error('[PaymentAnomaly] detectWithdrawalSpike error:', err);
  }
}

// ─── Event Handler ──────────────────────────────────────────────

async function handlePaymentEvent(event: DomainEvent): Promise<void> {
  const userId = extractUserId(event);
  if (!userId) return;

  switch (event.type) {
    case EventType.WALLET_TRANSFER:
    case EventType.TRANSACTION_INITIATED:
      await detectCircularPayment(event);
      await detectSplitTransaction(event);
      await detectMethodSwitching(event);
      break;

    case EventType.WALLET_DEPOSIT:
      await detectRapidTopup(event);
      await detectMethodSwitching(event);
      break;

    case EventType.WALLET_WITHDRAWAL:
      await detectWithdrawalSpike(event);
      await detectMethodSwitching(event);
      break;

    case EventType.TRANSACTION_COMPLETED:
      await detectSplitTransaction(event);
      break;

    case EventType.TRANSACTION_FAILED:
      await detectMethodSwitching(event);
      break;
  }
}

// ─── Consumer Registration ──────────────────────────────────────

export function registerPaymentAnomalyConsumer(): void {
  const { getEventBus } = require('../../events/bus');
  const bus = getEventBus();

  bus.registerConsumer({
    name: 'payment-anomaly-detection',
    eventTypes: [
      EventType.WALLET_DEPOSIT,
      EventType.WALLET_WITHDRAWAL,
      EventType.WALLET_TRANSFER,
      EventType.TRANSACTION_INITIATED,
      EventType.TRANSACTION_COMPLETED,
      EventType.TRANSACTION_FAILED,
    ],
    handler: handlePaymentEvent,
  });
}

// Export internals for testing
export {
  detectCircularPayment,
  detectRapidTopup,
  detectSplitTransaction,
  detectMethodSwitching,
  detectWithdrawalSpike,
  handlePaymentEvent,
};

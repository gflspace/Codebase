// QwickServices CIS — Detection: Windowed Context Analyzer
// Analyzes ±2 messages per conversation for contextual risk signals

import { query } from '../database/connection';

export interface ConversationContext {
  messages: ContextMessage[];
  transactionProximity: TransactionProximity | null;
  conversationPattern: ConversationPattern;
}

export interface ContextMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

export interface TransactionProximity {
  transaction_id: string;
  status: string;
  amount: number;
  timeDelta: number; // milliseconds between message and transaction
  phase: 'pre_payment' | 'payment_window' | 'post_payment';
}

export interface ConversationPattern {
  messageCount: number;
  uniqueSignalTypes: number;
  hasEscalation: boolean;
  senderInitiatedCount: number;
  receiverInitiatedCount: number;
}

// ─── Context Window Retrieval ─────────────────────────────────

/**
 * Get ±windowSize messages around a specific message in the same conversation.
 */
export async function getMessageWindow(
  messageId: string,
  senderId: string,
  receiverId: string,
  windowSize = 2
): Promise<ContextMessage[]> {
  try {
    // Get messages between the same two users, ordered by time
    const result = await query(
      `WITH target AS (
        SELECT created_at, conversation_id FROM messages WHERE id = $1
      )
      SELECT m.id, m.sender_id, m.receiver_id, m.content, m.created_at
      FROM messages m, target t
      WHERE (
        (m.sender_id = $2 AND m.receiver_id = $3) OR
        (m.sender_id = $3 AND m.receiver_id = $2)
      )
      AND (m.conversation_id = t.conversation_id OR t.conversation_id IS NULL)
      AND m.created_at BETWEEN t.created_at - INTERVAL '1 hour' AND t.created_at + INTERVAL '1 hour'
      ORDER BY m.created_at ASC
      LIMIT $4`,
      [messageId, senderId, receiverId, windowSize * 2 + 1]
    );

    return result.rows;
  } catch {
    return [];
  }
}

/**
 * Check for transaction proximity — is there a transaction near this message's timestamp?
 */
export async function getTransactionProximity(
  userId: string,
  counterpartyId: string,
  messageTimestamp: string
): Promise<TransactionProximity | null> {
  try {
    const result = await query(
      `SELECT id, status, amount,
        EXTRACT(EPOCH FROM ($3::timestamptz - created_at)) * 1000 as time_delta_ms
      FROM transactions
      WHERE (user_id = $1 AND counterparty_id = $2)
         OR (user_id = $2 AND counterparty_id = $1)
      ORDER BY ABS(EXTRACT(EPOCH FROM ($3::timestamptz - created_at)))
      LIMIT 1`,
      [userId, counterpartyId, messageTimestamp]
    );

    if (result.rows.length === 0) return null;

    const tx = result.rows[0];
    const timeDelta = Math.abs(parseFloat(tx.time_delta_ms));

    // Classify proximity phase
    let phase: TransactionProximity['phase'];
    if (parseFloat(tx.time_delta_ms) > 0) {
      // Message was before transaction
      phase = timeDelta < 300000 ? 'payment_window' : 'pre_payment'; // 5 min window
    } else {
      phase = 'post_payment';
    }

    return {
      transaction_id: tx.id,
      status: tx.status,
      amount: parseFloat(tx.amount),
      timeDelta,
      phase,
    };
  } catch {
    return null;
  }
}

/**
 * Analyze conversation pattern between two users.
 */
export async function analyzeConversationPattern(
  senderId: string,
  receiverId: string
): Promise<ConversationPattern> {
  try {
    const result = await query(
      `SELECT
        COUNT(*) as message_count,
        COUNT(CASE WHEN sender_id = $1 THEN 1 END) as sender_initiated,
        COUNT(CASE WHEN sender_id = $2 THEN 1 END) as receiver_initiated
      FROM messages
      WHERE (sender_id = $1 AND receiver_id = $2)
         OR (sender_id = $2 AND receiver_id = $1)`,
      [senderId, receiverId]
    );

    const signalResult = await query(
      `SELECT COUNT(DISTINCT signal_type) as unique_signals
       FROM risk_signals
       WHERE user_id = $1`,
      [senderId]
    );

    const row = result.rows[0];
    const signalRow = signalResult.rows[0];

    return {
      messageCount: parseInt(row.message_count, 10),
      uniqueSignalTypes: parseInt(signalRow?.unique_signals || '0', 10),
      hasEscalation: parseInt(signalRow?.unique_signals || '0', 10) > 2,
      senderInitiatedCount: parseInt(row.sender_initiated, 10),
      receiverInitiatedCount: parseInt(row.receiver_initiated, 10),
    };
  } catch {
    return {
      messageCount: 0,
      uniqueSignalTypes: 0,
      hasEscalation: false,
      senderInitiatedCount: 0,
      receiverInitiatedCount: 0,
    };
  }
}

/**
 * Full context analysis for a message event.
 */
export async function analyzeContext(
  messageId: string,
  senderId: string,
  receiverId: string,
  messageTimestamp: string
): Promise<ConversationContext> {
  const [messages, transactionProximity, conversationPattern] = await Promise.all([
    getMessageWindow(messageId, senderId, receiverId),
    getTransactionProximity(senderId, receiverId, messageTimestamp),
    analyzeConversationPattern(senderId, receiverId),
  ]);

  return {
    messages,
    transactionProximity,
    conversationPattern,
  };
}

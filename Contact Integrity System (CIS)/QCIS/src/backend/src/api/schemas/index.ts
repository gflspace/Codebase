import { z } from 'zod';

// ─── Common ───────────────────────────────────────────────────

export const uuidParam = z.object({
  id: z.string().uuid(),
});

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
});

// ─── Events ───────────────────────────────────────────────────

export const eventSchema = z.object({
  id: z.string().uuid().optional(),
  type: z.enum([
    'message.created', 'message.edited', 'message.deleted',
    'transaction.initiated', 'transaction.completed', 'transaction.failed', 'transaction.cancelled',
    'user.status_changed',
    'enforcement.action_applied', 'enforcement.action_reversed',
    'appeal.submitted', 'appeal.resolved',
  ]),
  correlation_id: z.string().uuid().optional(),
  timestamp: z.string().datetime().optional(),
  version: z.number().int().default(1),
  payload: z.record(z.unknown()),
});

// ─── Users ────────────────────────────────────────────────────

export const createUserSchema = z.object({
  external_id: z.string().max(255).optional(),
  display_name: z.string().max(255).optional(),
  email: z.string().email().max(255).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateUserSchema = z.object({
  display_name: z.string().max(255).optional(),
  verification_status: z.enum(['unverified', 'pending', 'verified']).optional(),
  status: z.enum(['active', 'restricted', 'suspended', 'banned']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ─── Messages ─────────────────────────────────────────────────

export const createMessageSchema = z.object({
  sender_id: z.string().uuid(),
  receiver_id: z.string().uuid(),
  conversation_id: z.string().uuid().optional(),
  content: z.string().min(1).max(10000),
  metadata: z.record(z.unknown()).optional(),
});

export const messageQuerySchema = paginationQuery.extend({
  sender_id: z.string().uuid().optional(),
  receiver_id: z.string().uuid().optional(),
  conversation_id: z.string().uuid().optional(),
});

// ─── Transactions ─────────────────────────────────────────────

export const createTransactionSchema = z.object({
  user_id: z.string().uuid(),
  counterparty_id: z.string().uuid().optional(),
  amount: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  payment_method: z.string().max(50).optional(),
  external_ref: z.string().max(255).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateTransactionSchema = z.object({
  status: z.enum(['initiated', 'completed', 'failed', 'cancelled']),
});

// ─── Risk Signals ─────────────────────────────────────────────

export const riskSignalSchema = z.object({
  source_event_id: z.string().uuid(),
  user_id: z.string().uuid().optional(),
  signal_type: z.enum([
    'CONTACT_PHONE', 'CONTACT_EMAIL', 'CONTACT_SOCIAL',
    'CONTACT_MESSAGING_APP', 'PAYMENT_EXTERNAL',
    'OFF_PLATFORM_INTENT', 'GROOMING_LANGUAGE',
    'TX_REDIRECT_ATTEMPT', 'TX_FAILURE_CORRELATED', 'TX_TIMING_ALIGNMENT',
  ]),
  confidence: z.number().min(0).max(1),
  evidence: z.object({
    message_ids: z.array(z.string().uuid()).default([]),
    timestamps: z.array(z.string()).default([]),
  }).default({ message_ids: [], timestamps: [] }),
  obfuscation_flags: z.array(z.string()).default([]),
  pattern_flags: z.array(z.string()).default([]),
});

export const signalQuerySchema = paginationQuery.extend({
  user_id: z.string().uuid().optional(),
  signal_type: z.string().optional(),
  min_confidence: z.coerce.number().min(0).max(1).optional(),
});

// ─── Risk Scores ──────────────────────────────────────────────

export const riskScoreQuerySchema = paginationQuery.extend({
  user_id: z.string().uuid().optional(),
  tier: z.enum(['monitor', 'low', 'medium', 'high', 'critical']).optional(),
  min_score: z.coerce.number().min(0).max(100).optional(),
});

// ─── Enforcement Actions ──────────────────────────────────────

export const enforcementQuerySchema = paginationQuery.extend({
  user_id: z.string().uuid().optional(),
  action_type: z.enum([
    'soft_warning', 'hard_warning', 'temporary_restriction',
    'account_suspension', 'permanent_ban',
  ]).optional(),
  active_only: z.coerce.boolean().optional(),
});

// ─── Audit Logs ───────────────────────────────────────────────

export const auditLogQuerySchema = paginationQuery.extend({
  actor: z.string().optional(),
  action: z.string().optional(),
  entity_type: z.string().optional(),
  entity_id: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

// ─── Auth ─────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// ─── Alerts ───────────────────────────────────────────────────

export const alertQuerySchema = paginationQuery.extend({
  status: z.enum(['open', 'assigned', 'in_progress', 'resolved', 'dismissed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  assigned_to: z.string().uuid().optional(),
});

export const updateAlertSchema = z.object({
  status: z.enum(['open', 'assigned', 'in_progress', 'resolved', 'dismissed']).optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

// ─── Cases ────────────────────────────────────────────────────

export const createCaseSchema = z.object({
  user_id: z.string().uuid(),
  title: z.string().max(500),
  description: z.string().optional(),
  alert_ids: z.array(z.string().uuid()).default([]),
});

export const updateCaseSchema = z.object({
  status: z.enum(['open', 'investigating', 'pending_action', 'resolved', 'closed']).optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  title: z.string().max(500).optional(),
  description: z.string().optional(),
});

export const addCaseNoteSchema = z.object({
  content: z.string().min(1),
});

// ─── Appeals ──────────────────────────────────────────────────

export const createAppealSchema = z.object({
  enforcement_action_id: z.string().uuid(),
  user_id: z.string().uuid(),
  reason: z.string().min(1),
});

export const resolveAppealSchema = z.object({
  status: z.enum(['approved', 'denied']),
  resolution_notes: z.string().min(1),
});

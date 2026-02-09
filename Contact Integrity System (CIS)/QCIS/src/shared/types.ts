// QwickServices CIS — Shared Type Definitions

// ─── Enums ────────────────────────────────────────────────────

export enum UserStatus {
  ACTIVE = 'active',
  RESTRICTED = 'restricted',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
}

export enum VerificationStatus {
  UNVERIFIED = 'unverified',
  PENDING = 'pending',
  VERIFIED = 'verified',
}

export enum TransactionStatus {
  INITIATED = 'initiated',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

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
}

export enum RiskTier {
  MONITOR = 'monitor',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum EnforcementActionType {
  SOFT_WARNING = 'soft_warning',
  HARD_WARNING = 'hard_warning',
  TEMPORARY_RESTRICTION = 'temporary_restriction',
  ACCOUNT_SUSPENSION = 'account_suspension',
  PERMANENT_BAN = 'permanent_ban', // Requires Legal approval, NEVER automated
}

export enum AppealStatus {
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  DENIED = 'denied',
}

export enum AlertPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum AlertStatus {
  OPEN = 'open',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

export enum CaseStatus {
  OPEN = 'open',
  INVESTIGATING = 'investigating',
  PENDING_ACTION = 'pending_action',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum AdminRole {
  TRUST_SAFETY = 'trust_safety',
  OPS = 'ops',
  LEGAL_COMPLIANCE = 'legal_compliance',
}

export enum TrendDirection {
  STABLE = 'stable',
  ESCALATING = 'escalating',
  DECAYING = 'decaying',
}

// ─── Event Types ──────────────────────────────────────────────

export enum EventType {
  MESSAGE_CREATED = 'message.created',
  MESSAGE_EDITED = 'message.edited',
  MESSAGE_DELETED = 'message.deleted',
  TRANSACTION_INITIATED = 'transaction.initiated',
  TRANSACTION_COMPLETED = 'transaction.completed',
  TRANSACTION_FAILED = 'transaction.failed',
  TRANSACTION_CANCELLED = 'transaction.cancelled',
  USER_STATUS_CHANGED = 'user.status_changed',
  ENFORCEMENT_ACTION_APPLIED = 'enforcement.action_applied',
  ENFORCEMENT_ACTION_REVERSED = 'enforcement.action_reversed',
  APPEAL_SUBMITTED = 'appeal.submitted',
  APPEAL_RESOLVED = 'appeal.resolved',
}

// ─── Domain Models ────────────────────────────────────────────

export interface User {
  id: string;
  created_at: string;
  updated_at: string;
  verification_status: VerificationStatus;
  trust_score: number;
  status: UserStatus;
  metadata: Record<string, unknown>;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
  edited_at: string | null;
}

export interface Transaction {
  id: string;
  user_id: string;
  counterparty_id: string | null;
  amount: number;
  currency: string;
  status: TransactionStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface RiskSignal {
  id: string;
  source_event_id: string;
  signal_type: SignalType;
  confidence: number; // 0.0 - 1.0
  evidence: {
    message_ids: string[];
    timestamps: string[];
  };
  obfuscation_flags: string[];
  pattern_flags: string[];
  created_at: string;
}

export interface RiskScore {
  id: string;
  user_id: string;
  score: number; // 0 - 100
  tier: RiskTier;
  factors: {
    operational: number;
    behavioral: number;
    network: number;
  };
  trend: TrendDirection;
  created_at: string;
}

export interface EnforcementAction {
  id: string;
  user_id: string;
  action_type: EnforcementActionType;
  reason: string;
  reason_code: string;
  triggering_signal_ids: string[];
  effective_until: string | null;
  reversed_at: string | null;
  reversed_by: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown>;
  timestamp: string;
}

export interface Alert {
  id: string;
  user_id: string;
  priority: AlertPriority;
  status: AlertStatus;
  title: string;
  description: string;
  assigned_to: string | null;
  risk_signal_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface Case {
  id: string;
  user_id: string;
  status: CaseStatus;
  title: string;
  description: string;
  assigned_to: string | null;
  alert_ids: string[];
  notes: CaseNote[];
  created_at: string;
  updated_at: string;
}

export interface CaseNote {
  id: string;
  case_id: string;
  author: string;
  content: string;
  created_at: string;
}

export interface Appeal {
  id: string;
  enforcement_action_id: string;
  user_id: string;
  status: AppealStatus;
  reason: string;
  resolution_notes: string | null;
  resolved_by: string | null;
  submitted_at: string;
  resolved_at: string | null;
}

// ─── Event Payloads ───────────────────────────────────────────

export interface DomainEvent {
  id: string;
  type: EventType;
  correlation_id: string;
  timestamp: string;
  version: number;
  payload: Record<string, unknown>;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  created_at: string;
}

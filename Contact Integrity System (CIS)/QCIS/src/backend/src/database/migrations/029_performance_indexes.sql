-- QwickServices CIS — Phase 3C: Performance Indexes
-- Optimizes the most frequently queried patterns
-- Note: Using regular CREATE INDEX (not CONCURRENTLY) for migration compatibility.

-- Risk scores: latest score per user (used by scoring, evaluate, rules)
CREATE INDEX IF NOT EXISTS idx_risk_scores_user_latest
  ON risk_scores(user_id, created_at DESC);

-- Risk signals: recent signals per user (used by scoring, alerting)
CREATE INDEX IF NOT EXISTS idx_risk_signals_user_recent
  ON risk_signals(user_id, created_at DESC);

-- Enforcement actions: active (not reversed) actions per user (used by evaluate, enforcement)
CREATE INDEX IF NOT EXISTS idx_enforcement_active_user
  ON enforcement_actions(user_id, created_at DESC) WHERE reversed_at IS NULL;

-- Audit logs: recent logs by actor (used by admin dashboard)
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_recent
  ON audit_logs(actor, timestamp DESC);

-- Alerts: open alerts by priority (used by alerts inbox)
CREATE INDEX IF NOT EXISTS idx_alerts_open_priority
  ON alerts(status, priority, created_at DESC) WHERE status IN ('open', 'assigned');

-- Rule match log: recent matches (used by rules dashboard)
CREATE INDEX IF NOT EXISTS idx_rule_match_recent
  ON rule_match_log(created_at DESC);

-- Bookings: user bookings for pattern detection
CREATE INDEX IF NOT EXISTS idx_bookings_user_status
  ON bookings(client_id, status, created_at DESC);

-- Wallet transactions: user wallet activity
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_recent
  ON wallet_transactions(user_id, created_at DESC);

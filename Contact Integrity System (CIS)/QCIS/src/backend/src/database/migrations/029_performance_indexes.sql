-- QwickServices CIS — Phase 3C: Performance Indexes
-- Optimizes the most frequently queried patterns

-- Risk scores: latest score per user (used by scoring, evaluate, rules)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_scores_user_latest
  ON risk_scores(user_id, created_at DESC);

-- Risk signals: recent signals per user (used by scoring, alerting)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_signals_user_recent
  ON risk_signals(user_id, created_at DESC);

-- Enforcement actions: active actions per user (used by evaluate, enforcement)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enforcement_active_user
  ON enforcement_actions(user_id, active, created_at DESC) WHERE active = true;

-- Audit logs: recent logs by actor (used by admin dashboard)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_actor_recent
  ON audit_logs(actor, timestamp DESC);

-- Alerts: open alerts by priority (used by alerts inbox)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_open_priority
  ON alerts(status, priority, created_at DESC) WHERE status IN ('open', 'assigned');

-- Rule match log: recent matches (used by rules dashboard)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rule_match_recent
  ON rule_match_log(created_at DESC);

-- Bookings: user bookings for pattern detection
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_user_status
  ON bookings(client_id, status, created_at DESC);

-- Wallet transactions: user wallet activity
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_tx_user_recent
  ON wallet_transactions(user_id, created_at DESC);

-- Mark migration as applied
INSERT INTO migrations (name, applied_at)
VALUES ('029_performance_indexes', NOW())
ON CONFLICT (name) DO NOTHING;

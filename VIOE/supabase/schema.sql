-- VIOE Database Schema for Supabase
-- PCE Compliance: This schema implements the Coordination Layer
-- Source: planning/risk_model.md, planning/prioritization.md, planning/automation.md

-- =============================================================================
-- EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- =============================================================================
-- ENUMS (Type Safety from Planning Documents)
-- =============================================================================

-- Severity levels from planning/risk_model.md Section 2
CREATE TYPE severity_level AS ENUM ('critical', 'high', 'medium', 'low', 'info');

-- Confidence levels from planning/prioritization.md Section 2.1
CREATE TYPE confidence_level AS ENUM ('high', 'medium', 'low', 'very_low', 'unassigned');

-- Asset criticality from planning/risk_model.md Section 4.2
CREATE TYPE asset_criticality AS ENUM ('critical', 'high', 'medium', 'low');

-- Environment types from planning/risk_model.md Section 5.2
CREATE TYPE environment_type AS ENUM ('production', 'staging', 'development');

-- Vulnerability status
CREATE TYPE vulnerability_status AS ENUM ('open', 'in_progress', 'resolved', 'suppressed', 'false_positive');

-- Task status
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'blocked', 'cancelled');

-- Incident status
CREATE TYPE incident_status AS ENUM ('detected', 'investigating', 'contained', 'eradicated', 'recovered', 'closed');

-- Automation levels from planning/automation.md Section 2.2
CREATE TYPE automation_level AS ENUM ('L0', 'L1', 'L2', 'L3');

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Teams table
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    lead_email VARCHAR(255),
    slack_channel VARCHAR(255),
    jira_project_key VARCHAR(50),
    description TEXT,
    technology_stack JSONB DEFAULT '[]',
    owned_patterns JSONB DEFAULT '[]', -- file/path patterns this team owns
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assets table
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100), -- 'application', 'service', 'infrastructure', 'database'
    criticality asset_criticality DEFAULT 'medium',
    environment environment_type DEFAULT 'staging',
    owner_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    repository_url TEXT,
    tech_stack JSONB DEFAULT '[]',
    data_classification VARCHAR(50), -- 'public', 'internal', 'confidential', 'restricted'
    compliance_scope JSONB DEFAULT '[]', -- ['SOC2', 'PCI-DSS', 'HIPAA']
    risk_score INTEGER DEFAULT 0,
    last_scan_date TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vulnerabilities table (core entity)
CREATE TABLE vulnerabilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- CVE/Vulnerability identification
    cve_id VARCHAR(50),
    title VARCHAR(500) NOT NULL,
    description TEXT,

    -- Severity and scoring (from planning/risk_model.md)
    severity severity_level NOT NULL,
    cvss_score DECIMAL(3,1),
    epss_score DECIMAL(5,4), -- Exploit Prediction Scoring System

    -- Status tracking
    status vulnerability_status DEFAULT 'open',
    first_detected TIMESTAMPTZ DEFAULT NOW(),
    resolved_date TIMESTAMPTZ,

    -- Ownership (from planning/prioritization.md)
    assigned_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    ownership_confidence INTEGER, -- 0-100
    needs_review BOOLEAN DEFAULT TRUE,
    assignment_reason TEXT, -- Why this team was assigned

    -- Asset relationship
    asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    affected_component VARCHAR(255),
    file_path TEXT,

    -- SLA tracking (from planning/prioritization.md Section 4.1)
    sla_due_date TIMESTAMPTZ,
    sla_breached BOOLEAN DEFAULT FALSE,

    -- Risk scoring (from planning/risk_model.md Section 6.1)
    calculated_risk_score INTEGER,
    priority_override VARCHAR(50), -- Manual override

    -- Source information
    scanner_source VARCHAR(100), -- 'snyk', 'sonarqube', 'dependabot', etc.
    scanner_id VARCHAR(255), -- ID in source system
    raw_finding JSONB, -- Original scanner output

    -- Remediation
    remediation_guidance TEXT,
    fix_available BOOLEAN DEFAULT FALSE,
    fix_version VARCHAR(100),

    -- Compliance mapping (from planning/compliance.md)
    compliance_controls JSONB DEFAULT '[]', -- Mapped control IDs

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ownership logs (audit trail for assignments)
CREATE TABLE ownership_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vulnerability_id UUID NOT NULL REFERENCES vulnerabilities(id) ON DELETE CASCADE,
    previous_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    new_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    previous_confidence INTEGER,
    new_confidence INTEGER,
    reason TEXT,
    changed_by VARCHAR(255), -- user email or 'system'
    automation_level automation_level DEFAULT 'L0',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Remediation tasks
CREATE TABLE remediation_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vulnerability_id UUID REFERENCES vulnerabilities(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status task_status DEFAULT 'pending',
    priority severity_level DEFAULT 'medium',
    assigned_to VARCHAR(255), -- email
    assigned_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,

    -- External tracking
    jira_key VARCHAR(50),
    jira_url TEXT,
    github_pr_url TEXT,

    -- Time tracking
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    due_date TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Automation (from planning/automation.md)
    auto_fix_available BOOLEAN DEFAULT FALSE,
    auto_fix_applied BOOLEAN DEFAULT FALSE,
    auto_fix_confidence DECIMAL(5,2),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Incident Response
CREATE TABLE incident_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status incident_status DEFAULT 'detected',
    severity severity_level NOT NULL,

    -- Related vulnerabilities
    related_vulnerabilities UUID[] DEFAULT '{}',

    -- Response tracking
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    contained_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,

    -- Team and ownership
    lead_responder VARCHAR(255),
    response_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,

    -- Playbook
    playbook_id UUID,

    -- Impact assessment
    affected_assets UUID[] DEFAULT '{}',
    business_impact TEXT,
    data_breach_confirmed BOOLEAN DEFAULT FALSE,

    -- Timeline and notes
    timeline JSONB DEFAULT '[]', -- [{time, event, actor}]

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Suppression rules
CREATE TABLE suppression_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,

    -- Match criteria
    cve_pattern VARCHAR(100),
    path_pattern TEXT,
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    severity_levels severity_level[] DEFAULT '{}',

    -- Validity
    valid_until TIMESTAMPTZ,
    reason TEXT NOT NULL,
    approved_by VARCHAR(255),

    -- Audit
    matched_count INTEGER DEFAULT 0,
    last_matched_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compliance reports
CREATE TABLE compliance_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    framework VARCHAR(100) NOT NULL, -- 'SOC2', 'ISO27001', 'PCI-DSS', 'HIPAA', 'GDPR'
    report_date DATE DEFAULT CURRENT_DATE,

    -- Scores (from planning/compliance.md Section 7.2)
    overall_score DECIMAL(5,2),
    control_coverage DECIMAL(5,2),

    -- Control details
    controls_assessed INTEGER DEFAULT 0,
    controls_compliant INTEGER DEFAULT 0,
    controls_partial INTEGER DEFAULT 0,
    controls_non_compliant INTEGER DEFAULT 0,

    -- Findings
    findings JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',

    -- Report content
    executive_summary TEXT,
    detailed_findings JSONB DEFAULT '{}',
    evidence_links JSONB DEFAULT '[]',

    generated_by VARCHAR(255),
    approved_by VARCHAR(255),
    approved_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Threat hunting sessions
CREATE TABLE threat_hunting_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    hypothesis TEXT,
    scope TEXT,
    status VARCHAR(50) DEFAULT 'planned', -- 'planned', 'in_progress', 'completed', 'abandoned'

    -- Findings
    findings_count INTEGER DEFAULT 0,
    findings JSONB DEFAULT '[]',

    -- Time tracking
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Ownership
    lead_hunter VARCHAR(255),
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,

    -- Results
    outcome_summary TEXT,
    new_detections_created INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vulnerability snapshots (for trend analysis)
CREATE TABLE vulnerability_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_date DATE NOT NULL,

    -- Counts by severity
    critical_count INTEGER DEFAULT 0,
    high_count INTEGER DEFAULT 0,
    medium_count INTEGER DEFAULT 0,
    low_count INTEGER DEFAULT 0,
    info_count INTEGER DEFAULT 0,

    -- By status
    open_count INTEGER DEFAULT 0,
    in_progress_count INTEGER DEFAULT 0,
    resolved_count INTEGER DEFAULT 0,

    -- Metrics
    mean_time_to_remediate_days DECIMAL(10,2),
    sla_compliance_rate DECIMAL(5,2),

    -- Detailed breakdown
    by_team JSONB DEFAULT '{}',
    by_asset JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Predictive analysis results
CREATE TABLE predictive_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_date TIMESTAMPTZ DEFAULT NOW(),

    -- Predictions
    predicted_vulns_next_month INTEGER,
    predicted_critical_vulns INTEGER,
    risk_trend VARCHAR(50), -- 'increasing', 'stable', 'decreasing'

    -- Factors
    contributing_factors JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',

    -- Model info
    model_version VARCHAR(50),
    confidence_score DECIMAL(5,2),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compliance evidence
CREATE TABLE compliance_evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    framework VARCHAR(100) NOT NULL,
    control_id VARCHAR(100) NOT NULL,

    -- Evidence details
    evidence_type VARCHAR(100), -- 'screenshot', 'log', 'config', 'report'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_url TEXT,

    -- Validity
    collected_at TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,

    -- Approval
    collected_by VARCHAR(255),
    approved_by VARCHAR(255),
    approved_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- PCE CONFIGURATION TABLES (Planning Layer in Database)
-- =============================================================================

-- Store planning configuration in database for easy updates
CREATE TABLE pce_configuration (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(255) NOT NULL UNIQUE,
    config_value JSONB NOT NULL,
    source_document VARCHAR(255), -- Reference to planning doc
    source_section VARCHAR(255),
    description TEXT,
    updated_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert PCE configuration from planning documents
INSERT INTO pce_configuration (config_key, config_value, source_document, source_section, description) VALUES
-- Confidence thresholds (from planning/prioritization.md Section 2.1)
('confidence_thresholds', '{"high": 90, "medium": 70, "low": 50}',
 'planning/prioritization.md', 'Section 2.1', 'AI Assignment Confidence Levels'),

-- SLA by severity (from planning/prioritization.md Section 4.1)
('sla_by_severity', '{
    "critical": {"target_days": 7, "warning_hours": 48, "grace_period_hours": 0},
    "high": {"target_days": 30, "warning_hours": 72, "grace_period_hours": 24},
    "medium": {"target_days": 60, "warning_days": 7, "grace_period_hours": 48},
    "low": {"target_days": 90, "warning_days": 14, "grace_period_days": 7},
    "info": {"target_days": null, "warning_days": null, "grace_period_days": null}
}', 'planning/prioritization.md', 'Section 4.1', 'Remediation SLA by Severity'),

-- CVSS to severity mapping (from planning/risk_model.md Section 2)
('cvss_severity_mapping', '{
    "critical": {"min": 9.0, "max": 10.0},
    "high": {"min": 7.0, "max": 8.9},
    "medium": {"min": 4.0, "max": 6.9},
    "low": {"min": 0.1, "max": 3.9},
    "info": {"min": 0.0, "max": 0.0}
}', 'planning/risk_model.md', 'Section 2', 'CVSS to Severity Mapping'),

-- EPSS thresholds (from planning/risk_model.md Section 3.1)
('epss_thresholds', '{
    "immediate_triage": 0.9,
    "expedited": 0.7,
    "standard": 0.4
}', 'planning/risk_model.md', 'Section 3.1', 'EPSS Priority Modifiers'),

-- Asset criticality multipliers (from planning/risk_model.md Section 4.2)
('asset_criticality_multipliers', '{
    "critical": 2.0,
    "high": 1.5,
    "medium": 1.0,
    "low": 0.5
}', 'planning/risk_model.md', 'Section 4.2', 'Asset Criticality Multipliers'),

-- Environment multipliers (from planning/risk_model.md Section 5.2)
('environment_multipliers', '{
    "production": 1.5,
    "staging": 1.0,
    "development": 0.5
}', 'planning/risk_model.md', 'Section 5.2', 'Environment Multipliers'),

-- Bulk operation limits (from planning/automation.md Section 3.2)
('bulk_operation_limits', '{
    "max_items_per_batch": 100,
    "rate_limit_seconds": 60,
    "failure_threshold_percent": 10,
    "auto_pause_consecutive_failures": 5
}', 'planning/automation.md', 'Section 3.2', 'Bulk Triage Limits'),

-- Auto-fix confidence requirements (from planning/automation.md Section 4.1)
('auto_fix_confidence', '{
    "dependency_upgrade": 80,
    "security_header": 90,
    "hardcoded_secret": 90,
    "sql_injection": 95,
    "xss": 95
}', 'planning/automation.md', 'Section 4.1', 'Auto-Fix Eligibility'),

-- Compliance score thresholds (from planning/compliance.md Section 7.2)
('compliance_score_thresholds', '{
    "compliant": 90,
    "mostly_compliant": 75,
    "partially_compliant": 60,
    "non_compliant": 40
}', 'planning/compliance.md', 'Section 7.2', 'Compliance Score Interpretation');

-- =============================================================================
-- FUNCTIONS (PCE Coordination Layer Logic)
-- =============================================================================

-- Function to get PCE configuration
CREATE OR REPLACE FUNCTION get_pce_config(p_key VARCHAR)
RETURNS JSONB AS $$
    SELECT config_value FROM pce_configuration WHERE config_key = p_key;
$$ LANGUAGE SQL STABLE;

-- Function to calculate SLA due date based on severity
CREATE OR REPLACE FUNCTION calculate_sla_due_date(
    p_severity severity_level,
    p_detected_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
    v_sla_config JSONB;
    v_target_days INTEGER;
BEGIN
    v_sla_config := get_pce_config('sla_by_severity');
    v_target_days := (v_sla_config -> p_severity::TEXT ->> 'target_days')::INTEGER;

    IF v_target_days IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN p_detected_at + (v_target_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to determine confidence level
CREATE OR REPLACE FUNCTION get_confidence_level(p_confidence INTEGER)
RETURNS confidence_level AS $$
DECLARE
    v_thresholds JSONB;
BEGIN
    IF p_confidence IS NULL THEN
        RETURN 'unassigned';
    END IF;

    v_thresholds := get_pce_config('confidence_thresholds');

    IF p_confidence >= (v_thresholds ->> 'high')::INTEGER THEN
        RETURN 'high';
    ELSIF p_confidence >= (v_thresholds ->> 'medium')::INTEGER THEN
        RETURN 'medium';
    ELSIF p_confidence >= (v_thresholds ->> 'low')::INTEGER THEN
        RETURN 'low';
    ELSE
        RETURN 'very_low';
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if vulnerability needs review
CREATE OR REPLACE FUNCTION check_needs_review(
    p_assigned_team_id UUID,
    p_ownership_confidence INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    v_thresholds JSONB;
BEGIN
    -- Unassigned always needs review
    IF p_assigned_team_id IS NULL THEN
        RETURN TRUE;
    END IF;

    -- Below high confidence needs review
    v_thresholds := get_pce_config('confidence_thresholds');
    IF p_ownership_confidence < (v_thresholds ->> 'high')::INTEGER THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to calculate risk score
CREATE OR REPLACE FUNCTION calculate_risk_score(
    p_critical_count INTEGER DEFAULT 0,
    p_high_count INTEGER DEFAULT 0,
    p_medium_count INTEGER DEFAULT 0,
    p_low_count INTEGER DEFAULT 0,
    p_asset_criticality asset_criticality DEFAULT 'medium',
    p_environment environment_type DEFAULT 'staging'
)
RETURNS INTEGER AS $$
DECLARE
    v_base_score DECIMAL;
    v_asset_multiplier DECIMAL;
    v_env_multiplier DECIMAL;
    v_asset_config JSONB;
    v_env_config JSONB;
BEGIN
    -- Base score from severity weights
    v_base_score := (p_critical_count * 25) + (p_high_count * 15) +
                    (p_medium_count * 5) + (p_low_count * 1);

    -- Get multipliers from config
    v_asset_config := get_pce_config('asset_criticality_multipliers');
    v_env_config := get_pce_config('environment_multipliers');

    v_asset_multiplier := COALESCE((v_asset_config ->> p_asset_criticality::TEXT)::DECIMAL, 1.0);
    v_env_multiplier := COALESCE((v_env_config ->> p_environment::TEXT)::DECIMAL, 1.0);

    -- Calculate final score, capped at 100
    RETURN LEAST(100, ROUND(v_base_score * v_asset_multiplier * v_env_multiplier));
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_vulnerabilities_updated_at BEFORE UPDATE ON vulnerabilities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_remediation_tasks_updated_at BEFORE UPDATE ON remediation_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_incident_responses_updated_at BEFORE UPDATE ON incident_responses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_suppression_rules_updated_at BEFORE UPDATE ON suppression_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_threat_hunting_sessions_updated_at BEFORE UPDATE ON threat_hunting_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_pce_configuration_updated_at BEFORE UPDATE ON pce_configuration
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger to auto-calculate SLA due date on vulnerability insert
CREATE OR REPLACE FUNCTION auto_set_sla_due_date()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sla_due_date IS NULL AND NEW.severity IS NOT NULL THEN
        NEW.sla_due_date := calculate_sla_due_date(NEW.severity, COALESCE(NEW.first_detected, NOW()));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_vulnerability_sla BEFORE INSERT ON vulnerabilities
    FOR EACH ROW EXECUTE FUNCTION auto_set_sla_due_date();

-- Trigger to auto-set needs_review on vulnerability
CREATE OR REPLACE FUNCTION auto_set_needs_review()
RETURNS TRIGGER AS $$
BEGIN
    NEW.needs_review := check_needs_review(NEW.assigned_team_id, NEW.ownership_confidence);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_vulnerability_needs_review BEFORE INSERT OR UPDATE ON vulnerabilities
    FOR EACH ROW EXECUTE FUNCTION auto_set_needs_review();

-- Trigger to log ownership changes
CREATE OR REPLACE FUNCTION log_ownership_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.assigned_team_id IS DISTINCT FROM NEW.assigned_team_id
       OR OLD.ownership_confidence IS DISTINCT FROM NEW.ownership_confidence THEN
        INSERT INTO ownership_logs (
            vulnerability_id,
            previous_team_id,
            new_team_id,
            previous_confidence,
            new_confidence,
            changed_by
        ) VALUES (
            NEW.id,
            OLD.assigned_team_id,
            NEW.assigned_team_id,
            OLD.ownership_confidence,
            NEW.ownership_confidence,
            COALESCE(current_setting('app.current_user', TRUE), 'system')
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_vulnerability_ownership_change AFTER UPDATE ON vulnerabilities
    FOR EACH ROW EXECUTE FUNCTION log_ownership_change();

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Vulnerabilities indexes
CREATE INDEX idx_vulnerabilities_severity ON vulnerabilities(severity);
CREATE INDEX idx_vulnerabilities_status ON vulnerabilities(status);
CREATE INDEX idx_vulnerabilities_team ON vulnerabilities(assigned_team_id);
CREATE INDEX idx_vulnerabilities_asset ON vulnerabilities(asset_id);
CREATE INDEX idx_vulnerabilities_cve ON vulnerabilities(cve_id);
CREATE INDEX idx_vulnerabilities_sla ON vulnerabilities(sla_due_date) WHERE sla_breached = FALSE;
CREATE INDEX idx_vulnerabilities_needs_review ON vulnerabilities(needs_review) WHERE needs_review = TRUE;
CREATE INDEX idx_vulnerabilities_created ON vulnerabilities(created_at DESC);

-- Assets indexes
CREATE INDEX idx_assets_team ON assets(owner_team_id);
CREATE INDEX idx_assets_criticality ON assets(criticality);
CREATE INDEX idx_assets_environment ON assets(environment);

-- Remediation tasks indexes
CREATE INDEX idx_tasks_vulnerability ON remediation_tasks(vulnerability_id);
CREATE INDEX idx_tasks_status ON remediation_tasks(status);
CREATE INDEX idx_tasks_team ON remediation_tasks(assigned_team_id);
CREATE INDEX idx_tasks_due ON remediation_tasks(due_date) WHERE status != 'completed';

-- Ownership logs indexes
CREATE INDEX idx_ownership_logs_vuln ON ownership_logs(vulnerability_id);
CREATE INDEX idx_ownership_logs_created ON ownership_logs(created_at DESC);

-- Compliance indexes
CREATE INDEX idx_compliance_reports_framework ON compliance_reports(framework);
CREATE INDEX idx_compliance_evidence_framework ON compliance_evidence(framework, control_id);

-- Snapshots index
CREATE INDEX idx_snapshots_date ON vulnerability_snapshots(snapshot_date DESC);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE ownership_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE remediation_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppression_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE threat_hunting_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vulnerability_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictive_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE pce_configuration ENABLE ROW LEVEL SECURITY;

-- Default policy: Authenticated users can read everything
-- (Customize per organization needs)
CREATE POLICY "Allow authenticated read access" ON teams
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON assets
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON vulnerabilities
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON ownership_logs
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON remediation_tasks
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON incident_responses
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON suppression_rules
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON compliance_reports
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON threat_hunting_sessions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON vulnerability_snapshots
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON predictive_analyses
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON compliance_evidence
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON pce_configuration
    FOR SELECT TO authenticated USING (true);

-- Allow service role full access (for Edge Functions)
CREATE POLICY "Service role full access" ON teams
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON assets
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON vulnerabilities
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON ownership_logs
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON remediation_tasks
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON incident_responses
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON suppression_rules
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON compliance_reports
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON threat_hunting_sessions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON vulnerability_snapshots
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON predictive_analyses
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON compliance_evidence
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON pce_configuration
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- VIEWS
-- =============================================================================

-- Dashboard summary view
CREATE OR REPLACE VIEW dashboard_summary AS
SELECT
    COUNT(*) FILTER (WHERE status = 'open') as open_vulnerabilities,
    COUNT(*) FILTER (WHERE status = 'open' AND severity = 'critical') as critical_open,
    COUNT(*) FILTER (WHERE status = 'open' AND severity = 'high') as high_open,
    COUNT(*) FILTER (WHERE status = 'open' AND severity = 'medium') as medium_open,
    COUNT(*) FILTER (WHERE status = 'open' AND severity = 'low') as low_open,
    COUNT(*) FILTER (WHERE status = 'open' AND needs_review = TRUE) as needs_review,
    COUNT(*) FILTER (WHERE status = 'open' AND sla_breached = TRUE) as sla_breached,
    COUNT(*) FILTER (WHERE status = 'resolved' AND resolved_date > NOW() - INTERVAL '30 days') as resolved_30d,
    AVG(EXTRACT(EPOCH FROM (resolved_date - first_detected)) / 86400)
        FILTER (WHERE status = 'resolved' AND resolved_date > NOW() - INTERVAL '90 days') as avg_mttr_days
FROM vulnerabilities;

-- Team workload view
CREATE OR REPLACE VIEW team_workload AS
SELECT
    t.id as team_id,
    t.name as team_name,
    COUNT(v.id) FILTER (WHERE v.status = 'open') as open_vulnerabilities,
    COUNT(v.id) FILTER (WHERE v.status = 'open' AND v.severity = 'critical') as critical_open,
    COUNT(v.id) FILTER (WHERE v.status = 'open' AND v.severity = 'high') as high_open,
    COUNT(v.id) FILTER (WHERE v.needs_review = TRUE) as needs_review,
    COUNT(v.id) FILTER (WHERE v.sla_breached = TRUE) as sla_breached
FROM teams t
LEFT JOIN vulnerabilities v ON v.assigned_team_id = t.id
GROUP BY t.id, t.name;

-- SLA compliance view
CREATE OR REPLACE VIEW sla_compliance AS
SELECT
    severity,
    COUNT(*) as total_resolved,
    COUNT(*) FILTER (WHERE sla_breached = FALSE) as within_sla,
    COUNT(*) FILTER (WHERE sla_breached = TRUE) as breached_sla,
    ROUND(100.0 * COUNT(*) FILTER (WHERE sla_breached = FALSE) / NULLIF(COUNT(*), 0), 2) as compliance_rate
FROM vulnerabilities
WHERE status = 'resolved' AND resolved_date > NOW() - INTERVAL '90 days'
GROUP BY severity;

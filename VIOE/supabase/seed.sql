-- VIOE Seed Data for Supabase
-- Run this after schema.sql to populate with sample data

-- =============================================================================
-- TEAMS
-- =============================================================================

INSERT INTO teams (id, name, lead_email, slack_channel, jira_project_key, description, technology_stack, owned_patterns) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Backend Team', 'backend-lead@company.com', '#backend-team', 'BACK',
   'Responsible for API services and backend infrastructure',
   '["Node.js", "Python", "PostgreSQL", "Redis"]'::jsonb,
   '["src/api/**", "services/**", "backend/**"]'::jsonb),

  ('22222222-2222-2222-2222-222222222222', 'Frontend Team', 'frontend-lead@company.com', '#frontend-team', 'FRONT',
   'Responsible for web and mobile UI',
   '["React", "TypeScript", "Next.js", "React Native"]'::jsonb,
   '["src/components/**", "src/pages/**", "frontend/**", "web/**"]'::jsonb),

  ('33333333-3333-3333-3333-333333333333', 'Infrastructure Team', 'infra-lead@company.com', '#infra-team', 'INFRA',
   'Responsible for cloud infrastructure and DevOps',
   '["AWS", "Kubernetes", "Terraform", "Docker"]'::jsonb,
   '["infrastructure/**", "terraform/**", "k8s/**", "docker/**"]'::jsonb),

  ('44444444-4444-4444-4444-444444444444', 'Security Team', 'security-lead@company.com', '#security-team', 'SEC',
   'Responsible for security operations and incident response',
   '["SIEM", "WAF", "Vault", "Falco"]'::jsonb,
   '["security/**", "certs/**", ".github/workflows/**"]'::jsonb),

  ('55555555-5555-5555-5555-555555555555', 'Data Team', 'data-lead@company.com', '#data-team', 'DATA',
   'Responsible for data pipelines and analytics',
   '["Spark", "Airflow", "BigQuery", "dbt"]'::jsonb,
   '["data/**", "etl/**", "analytics/**", "pipelines/**"]'::jsonb);

-- =============================================================================
-- ASSETS
-- =============================================================================

INSERT INTO assets (id, name, type, criticality, environment, owner_team_id, repository_url, tech_stack, data_classification, compliance_scope, risk_score) VALUES
  ('aaaa1111-1111-1111-1111-111111111111', 'auth-service', 'service', 'critical', 'production',
   '11111111-1111-1111-1111-111111111111', 'https://github.com/company/auth-service',
   '["Node.js", "JWT", "PostgreSQL"]'::jsonb, 'confidential',
   '["SOC2", "PCI-DSS"]'::jsonb, 85),

  ('aaaa2222-2222-2222-2222-222222222222', 'payment-service', 'service', 'critical', 'production',
   '11111111-1111-1111-1111-111111111111', 'https://github.com/company/payment-service',
   '["Python", "Stripe", "PostgreSQL"]'::jsonb, 'restricted',
   '["SOC2", "PCI-DSS", "GDPR"]'::jsonb, 90),

  ('aaaa3333-3333-3333-3333-333333333333', 'user-dashboard', 'application', 'high', 'production',
   '22222222-2222-2222-2222-222222222222', 'https://github.com/company/user-dashboard',
   '["React", "TypeScript", "GraphQL"]'::jsonb, 'internal',
   '["SOC2"]'::jsonb, 60),

  ('aaaa4444-4444-4444-4444-444444444444', 'admin-portal', 'application', 'high', 'production',
   '22222222-2222-2222-2222-222222222222', 'https://github.com/company/admin-portal',
   '["React", "TypeScript", "REST API"]'::jsonb, 'internal',
   '["SOC2"]'::jsonb, 55),

  ('aaaa5555-5555-5555-5555-555555555555', 'notification-service', 'service', 'medium', 'production',
   '11111111-1111-1111-1111-111111111111', 'https://github.com/company/notification-service',
   '["Node.js", "RabbitMQ", "SendGrid"]'::jsonb, 'internal',
   '["SOC2"]'::jsonb, 40),

  ('aaaa6666-6666-6666-6666-666666666666', 'data-pipeline', 'infrastructure', 'high', 'production',
   '55555555-5555-5555-5555-555555555555', 'https://github.com/company/data-pipeline',
   '["Spark", "Airflow", "S3"]'::jsonb, 'confidential',
   '["SOC2", "GDPR"]'::jsonb, 70),

  ('aaaa7777-7777-7777-7777-777777777777', 'kubernetes-cluster', 'infrastructure', 'critical', 'production',
   '33333333-3333-3333-3333-333333333333', NULL,
   '["Kubernetes", "EKS", "Istio"]'::jsonb, 'internal',
   '["SOC2"]'::jsonb, 75),

  ('aaaa8888-8888-8888-8888-888888888888', 'staging-api', 'service', 'low', 'staging',
   '11111111-1111-1111-1111-111111111111', 'https://github.com/company/api',
   '["Node.js", "Express", "MongoDB"]'::jsonb, 'internal',
   '[]'::jsonb, 25);

-- =============================================================================
-- VULNERABILITIES
-- =============================================================================

INSERT INTO vulnerabilities (id, cve_id, title, description, severity, cvss_score, epss_score, status, assigned_team_id, ownership_confidence, asset_id, affected_component, scanner_source, fix_available, fix_version, remediation_guidance) VALUES
  -- Critical vulnerabilities
  ('vvvv1111-1111-1111-1111-111111111111', 'CVE-2024-1234', 'SQL Injection in auth-service login endpoint',
   'The login endpoint in auth-service is vulnerable to SQL injection attacks due to improper input sanitization.',
   'critical', 9.8, 0.92, 'open',
   '11111111-1111-1111-1111-111111111111', 95,
   'aaaa1111-1111-1111-1111-111111111111', 'src/auth/login.js',
   'snyk', true, '2.4.1',
   'Upgrade to version 2.4.1 or apply parameterized queries'),

  ('vvvv2222-2222-2222-2222-222222222222', 'CVE-2024-5678', 'Remote Code Execution in payment processor',
   'A deserialization vulnerability allows remote code execution in the payment processing module.',
   'critical', 9.5, 0.88, 'in_progress',
   '11111111-1111-1111-1111-111111111111', 92,
   'aaaa2222-2222-2222-2222-222222222222', 'src/payments/processor.py',
   'sonarqube', true, '3.2.0',
   'Update payment processor library to version 3.2.0'),

  -- High vulnerabilities
  ('vvvv3333-3333-3333-3333-333333333333', 'CVE-2024-3456', 'OpenSSL Buffer Overflow',
   'Buffer overflow vulnerability in OpenSSL affecting TLS handshake.',
   'high', 8.1, 0.75, 'open',
   '33333333-3333-3333-3333-333333333333', 88,
   'aaaa7777-7777-7777-7777-777777777777', 'openssl',
   'trivy', true, '3.1.4',
   'Update OpenSSL to version 3.1.4'),

  ('vvvv4444-4444-4444-4444-444444444444', 'CVE-2024-7890', 'XSS in user dashboard search',
   'Reflected XSS vulnerability in the search functionality of the user dashboard.',
   'high', 7.4, 0.62, 'open',
   '22222222-2222-2222-2222-222222222222', 85,
   'aaaa3333-3333-3333-3333-333333333333', 'src/components/Search.tsx',
   'burp', true, NULL,
   'Implement proper output encoding and Content-Security-Policy headers'),

  ('vvvv5555-5555-5555-5555-555555555555', 'CVE-2024-4321', 'JWT Secret Exposure',
   'JWT signing secret is hardcoded in configuration file.',
   'high', 8.0, 0.55, 'open',
   '44444444-4444-4444-4444-444444444444', 78,
   'aaaa1111-1111-1111-1111-111111111111', 'config/auth.js',
   'gitleaks', false, NULL,
   'Move JWT secret to environment variables or secrets manager'),

  -- Medium vulnerabilities
  ('vvvv6666-6666-6666-6666-666666666666', 'CVE-2024-2468', 'Insecure Direct Object Reference',
   'IDOR vulnerability allows unauthorized access to user resources.',
   'medium', 6.5, 0.42, 'open',
   '22222222-2222-2222-2222-222222222222', 72,
   'aaaa4444-4444-4444-4444-444444444444', 'src/api/users.ts',
   'owasp-zap', false, NULL,
   'Implement proper authorization checks on resource access'),

  ('vvvv7777-7777-7777-7777-777777777777', NULL, 'Outdated npm dependencies',
   'Multiple npm packages have known vulnerabilities.',
   'medium', 5.5, 0.35, 'open',
   '22222222-2222-2222-2222-222222222222', 90,
   'aaaa3333-3333-3333-3333-333333333333', 'package.json',
   'npm-audit', true, NULL,
   'Run npm update and address breaking changes'),

  ('vvvv8888-8888-8888-8888-888888888888', 'CVE-2024-9012', 'CSRF Token Bypass',
   'CSRF protection can be bypassed on certain endpoints.',
   'medium', 6.0, 0.38, 'open',
   NULL, NULL,
   'aaaa4444-4444-4444-4444-444444444444', 'src/middleware/csrf.ts',
   'burp', false, NULL,
   'Implement stricter CSRF token validation'),

  -- Low vulnerabilities
  ('vvvv9999-9999-9999-9999-999999999999', NULL, 'Missing security headers',
   'Several recommended security headers are not set.',
   'low', 3.5, 0.15, 'open',
   '33333333-3333-3333-3333-333333333333', 65,
   'aaaa7777-7777-7777-7777-777777777777', 'nginx.conf',
   'mozilla-observatory', true, NULL,
   'Add X-Frame-Options, X-Content-Type-Options, and other security headers'),

  ('vvvvaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL, 'Verbose error messages',
   'Error messages expose internal system details.',
   'low', 3.0, 0.08, 'open',
   '11111111-1111-1111-1111-111111111111', 70,
   'aaaa1111-1111-1111-1111-111111111111', 'src/middleware/error.js',
   'manual', false, NULL,
   'Implement generic error messages for production'),

  -- Resolved vulnerabilities (for trend data)
  ('vvvvbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'CVE-2024-0001', 'Log4j vulnerability (resolved)',
   'Critical Log4j RCE vulnerability.',
   'critical', 10.0, 0.98, 'resolved',
   '11111111-1111-1111-1111-111111111111', 95,
   'aaaa1111-1111-1111-1111-111111111111', 'pom.xml',
   'snyk', true, '2.17.0',
   'Upgraded Log4j to 2.17.0'),

  ('vvvvcccc-cccc-cccc-cccc-cccccccccccc', 'CVE-2024-0002', 'SSRF vulnerability (resolved)',
   'Server-side request forgery in webhook handler.',
   'high', 8.5, 0.72, 'resolved',
   '11111111-1111-1111-1111-111111111111', 88,
   'aaaa5555-5555-5555-5555-555555555555', 'src/webhooks/handler.js',
   'burp', true, NULL,
   'Implemented URL validation and allowlist');

-- Update resolved dates for resolved vulnerabilities
UPDATE vulnerabilities SET resolved_date = NOW() - INTERVAL '5 days' WHERE id = 'vvvvbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
UPDATE vulnerabilities SET resolved_date = NOW() - INTERVAL '10 days' WHERE id = 'vvvvcccc-cccc-cccc-cccc-cccccccccccc';

-- =============================================================================
-- REMEDIATION TASKS
-- =============================================================================

INSERT INTO remediation_tasks (id, vulnerability_id, title, description, status, priority, assigned_to, assigned_team_id, jira_key, estimated_hours, due_date) VALUES
  ('tttt1111-1111-1111-1111-111111111111',
   'vvvv1111-1111-1111-1111-111111111111',
   'Fix SQL Injection in login endpoint',
   'Implement parameterized queries in the login endpoint to prevent SQL injection.',
   'in_progress', 'critical', 'dev@company.com',
   '11111111-1111-1111-1111-111111111111', 'SEC-1234', 4,
   NOW() + INTERVAL '3 days'),

  ('tttt2222-2222-2222-2222-222222222222',
   'vvvv2222-2222-2222-2222-222222222222',
   'Upgrade payment processor library',
   'Update the payment processor library to version 3.2.0 to fix RCE vulnerability.',
   'in_progress', 'critical', 'senior-dev@company.com',
   '11111111-1111-1111-1111-111111111111', 'SEC-1235', 8,
   NOW() + INTERVAL '5 days'),

  ('tttt3333-3333-3333-3333-333333333333',
   'vvvv3333-3333-3333-3333-333333333333',
   'Update OpenSSL across all services',
   'Coordinate OpenSSL update across all production services.',
   'pending', 'high', NULL,
   '33333333-3333-3333-3333-333333333333', 'SEC-1236', 16,
   NOW() + INTERVAL '14 days'),

  ('tttt4444-4444-4444-4444-444444444444',
   'vvvv4444-4444-4444-4444-444444444444',
   'Fix XSS in search component',
   'Implement proper output encoding in the search component.',
   'pending', 'high', NULL,
   '22222222-2222-2222-2222-222222222222', 'SEC-1237', 3,
   NOW() + INTERVAL '21 days');

-- =============================================================================
-- INCIDENT RESPONSES
-- =============================================================================

INSERT INTO incident_responses (id, title, description, status, severity, lead_responder, response_team_id, timeline) VALUES
  ('iiii1111-1111-1111-1111-111111111111',
   'Attempted SQL Injection Attack',
   'Multiple SQL injection attempts detected on auth-service from suspicious IPs.',
   'contained', 'high', 'security-analyst@company.com',
   '44444444-4444-4444-4444-444444444444',
   '[{"time": "2026-01-30T14:00:00Z", "event": "Attack detected by WAF"}, {"time": "2026-01-30T14:15:00Z", "event": "IPs blocked"}, {"time": "2026-01-30T14:30:00Z", "event": "Incident contained"}]'::jsonb),

  ('iiii2222-2222-2222-2222-222222222222',
   'Unauthorized API Access Attempt',
   'Detected attempts to access admin API endpoints with forged tokens.',
   'investigating', 'medium', 'security-analyst@company.com',
   '44444444-4444-4444-4444-444444444444',
   '[{"time": "2026-01-31T09:00:00Z", "event": "Anomaly detected in API logs"}, {"time": "2026-01-31T09:30:00Z", "event": "Investigation started"}]'::jsonb);

-- =============================================================================
-- SUPPRESSION RULES
-- =============================================================================

INSERT INTO suppression_rules (id, name, description, is_active, cve_pattern, reason, approved_by, valid_until) VALUES
  ('ssss1111-1111-1111-1111-111111111111',
   'Suppress test environment vulns',
   'Suppress all vulnerabilities in staging/test environments',
   true, NULL, 'Test environments do not contain production data',
   'security-lead@company.com', NOW() + INTERVAL '90 days'),

  ('ssss2222-2222-2222-2222-222222222222',
   'Known false positive - CVE-2024-9999',
   'This CVE does not apply to our version',
   true, 'CVE-2024-9999', 'Verified false positive - library version not affected',
   'security-lead@company.com', NOW() + INTERVAL '30 days');

-- =============================================================================
-- COMPLIANCE REPORTS
-- =============================================================================

INSERT INTO compliance_reports (id, framework, report_date, overall_score, control_coverage, controls_assessed, controls_compliant, controls_partial, controls_non_compliant, executive_summary) VALUES
  ('rrrr1111-1111-1111-1111-111111111111',
   'SOC 2 Type II', '2026-01-15', 92.5, 95.0,
   120, 111, 7, 2,
   'The organization demonstrates strong compliance with SOC 2 Type II requirements. Minor gaps identified in access review processes and vulnerability management documentation.'),

  ('rrrr2222-2222-2222-2222-222222222222',
   'ISO 27001', '2026-01-10', 88.0, 92.0,
   114, 100, 12, 2,
   'ISO 27001 compliance is strong with opportunities for improvement in incident response procedures and third-party risk management.'),

  ('rrrr3333-3333-3333-3333-333333333333',
   'PCI-DSS v4.0', '2026-01-20', 95.0, 98.0,
   80, 76, 3, 1,
   'Payment card data handling meets PCI-DSS v4.0 requirements. One gap identified in encryption key rotation procedures.');

-- =============================================================================
-- VULNERABILITY SNAPSHOTS (for trend analysis)
-- =============================================================================

INSERT INTO vulnerability_snapshots (snapshot_date, critical_count, high_count, medium_count, low_count, info_count, open_count, in_progress_count, resolved_count, mean_time_to_remediate_days, sla_compliance_rate) VALUES
  (CURRENT_DATE - INTERVAL '7 days', 3, 6, 8, 5, 2, 20, 3, 5, 12.5, 85.0),
  (CURRENT_DATE - INTERVAL '6 days', 3, 5, 8, 5, 2, 19, 4, 6, 11.8, 86.0),
  (CURRENT_DATE - INTERVAL '5 days', 2, 5, 8, 4, 2, 18, 3, 8, 11.2, 87.0),
  (CURRENT_DATE - INTERVAL '4 days', 2, 5, 7, 4, 2, 17, 3, 10, 10.5, 88.0),
  (CURRENT_DATE - INTERVAL '3 days', 2, 5, 6, 4, 2, 16, 3, 12, 10.0, 89.0),
  (CURRENT_DATE - INTERVAL '2 days', 2, 4, 5, 3, 2, 14, 2, 14, 9.5, 90.0),
  (CURRENT_DATE - INTERVAL '1 day', 2, 4, 4, 3, 2, 13, 2, 16, 9.0, 91.0),
  (CURRENT_DATE, 2, 5, 4, 2, 0, 10, 3, 18, 8.5, 92.0);

-- =============================================================================
-- THREAT HUNTING SESSIONS
-- =============================================================================

INSERT INTO threat_hunting_sessions (id, name, hypothesis, scope, status, lead_hunter, team_id, findings_count, started_at) VALUES
  ('hhhh1111-1111-1111-1111-111111111111',
   'Q1 2026 APT Hunt',
   'Advanced persistent threat actors may have established persistence in the network',
   'All production systems and network traffic',
   'in_progress', 'threat-hunter@company.com',
   '44444444-4444-4444-4444-444444444444', 2,
   NOW() - INTERVAL '3 days'),

  ('hhhh2222-2222-2222-2222-222222222222',
   'Credential Stuffing Detection',
   'Attackers may be using stolen credentials from data breaches',
   'Authentication systems and logs',
   'completed', 'threat-hunter@company.com',
   '44444444-4444-4444-4444-444444444444', 5,
   NOW() - INTERVAL '14 days');

-- =============================================================================
-- PREDICTIVE ANALYSIS
-- =============================================================================

INSERT INTO predictive_analyses (analysis_date, predicted_vulns_next_month, predicted_critical_vulns, risk_trend, contributing_factors, recommendations, model_version, confidence_score) VALUES
  (NOW(), 25, 3, 'stable',
   '["Increased dependency usage", "New feature deployments", "Third-party integrations"]'::jsonb,
   '["Implement automated dependency scanning in CI/CD", "Conduct pre-release security reviews", "Establish vendor security requirements"]'::jsonb,
   '1.0.0', 0.82);

-- =============================================================================
-- COMPLIANCE EVIDENCE
-- =============================================================================

INSERT INTO compliance_evidence (id, framework, control_id, evidence_type, title, description, collected_by, valid_until) VALUES
  ('eeee1111-1111-1111-1111-111111111111',
   'SOC2', 'CC6.1', 'screenshot',
   'Access Control Configuration',
   'Screenshot of IAM policy configuration showing least privilege access controls',
   'compliance-analyst@company.com', NOW() + INTERVAL '90 days'),

  ('eeee2222-2222-2222-2222-222222222222',
   'SOC2', 'CC7.2', 'log',
   'Vulnerability Scan Report',
   'Monthly vulnerability scan report from security scanning tools',
   'security-analyst@company.com', NOW() + INTERVAL '30 days'),

  ('eeee3333-3333-3333-3333-333333333333',
   'PCI-DSS', '6.5.1', 'report',
   'Secure Development Training Records',
   'Completion records for secure coding training for all developers',
   'hr@company.com', NOW() + INTERVAL '365 days');

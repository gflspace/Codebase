// Mock data for VIOE demo mode

export const mockTeams = [
  { id: "team-1", name: "Platform Engineering", lead_email: "platform-lead@company.com", slack_channel: "#platform-team" },
  { id: "team-2", name: "Frontend Team", lead_email: "frontend-lead@company.com", slack_channel: "#frontend-team" },
  { id: "team-3", name: "Backend Team", lead_email: "backend-lead@company.com", slack_channel: "#backend-team" },
  { id: "team-4", name: "Infrastructure Team", lead_email: "infra-lead@company.com", slack_channel: "#infra-team" },
  { id: "team-5", name: "Security Team", lead_email: "security-lead@company.com", slack_channel: "#security-team" },
];

export const mockVulnerabilities = [
  {
    id: "vuln-1",
    title: "SQL Injection in User Authentication Module",
    cve_id: "CVE-2024-1234",
    severity: "critical",
    status: "open",
    environment: "production",
    asset: "auth-service",
    assigned_team: "team-3",
    ownership_confidence: 95,
    is_suppressed: false,
    created_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    description: "A SQL injection vulnerability exists in the user authentication module that could allow attackers to bypass authentication.",
    remediation_guidance: "Use parameterized queries and input validation.",
    cvss_score: 9.8,
    affected_component: "src/auth/login.js",
    scanner_source: "Snyk"
  },
  {
    id: "vuln-2",
    title: "Cross-Site Scripting (XSS) in Dashboard",
    cve_id: "CVE-2024-2345",
    severity: "high",
    status: "in_progress",
    environment: "production",
    asset: "web-frontend",
    assigned_team: "team-2",
    ownership_confidence: 88,
    is_suppressed: false,
    created_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    description: "Reflected XSS vulnerability in the dashboard search functionality.",
    remediation_guidance: "Sanitize user input and implement Content Security Policy.",
    cvss_score: 7.5,
    affected_component: "src/components/Search.jsx",
    scanner_source: "SonarQube"
  },
  {
    id: "vuln-3",
    title: "Outdated OpenSSL Library with Known Vulnerabilities",
    cve_id: "CVE-2024-3456",
    severity: "critical",
    status: "open",
    environment: "production",
    asset: "api-gateway",
    assigned_team: "team-4",
    ownership_confidence: 92,
    is_suppressed: false,
    created_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    description: "The API gateway is using an outdated version of OpenSSL with multiple known vulnerabilities.",
    remediation_guidance: "Upgrade OpenSSL to version 3.0.12 or later.",
    cvss_score: 9.1,
    affected_component: "infrastructure/api-gateway",
    scanner_source: "Qualys"
  },
  {
    id: "vuln-4",
    title: "Insecure Direct Object Reference in API",
    cve_id: "CVE-2024-4567",
    severity: "high",
    status: "open",
    environment: "production",
    asset: "user-api",
    assigned_team: "team-3",
    ownership_confidence: 78,
    is_suppressed: false,
    created_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    description: "IDOR vulnerability allows unauthorized access to other users' data.",
    remediation_guidance: "Implement proper authorization checks for all API endpoints.",
    cvss_score: 7.8,
    affected_component: "src/api/users/controller.js",
    scanner_source: "Checkmarx"
  },
  {
    id: "vuln-5",
    title: "Hardcoded API Keys in Source Code",
    cve_id: null,
    severity: "high",
    status: "open",
    environment: "production",
    asset: "payment-service",
    assigned_team: "team-3",
    ownership_confidence: 85,
    is_suppressed: false,
    created_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    description: "API keys for third-party services are hardcoded in the source code.",
    remediation_guidance: "Move secrets to environment variables or a secrets manager.",
    cvss_score: 7.2,
    affected_component: "src/services/payment.js",
    scanner_source: "Snyk"
  },
  {
    id: "vuln-6",
    title: "Missing Rate Limiting on Login Endpoint",
    cve_id: null,
    severity: "medium",
    status: "open",
    environment: "production",
    asset: "auth-service",
    assigned_team: "team-3",
    ownership_confidence: 91,
    is_suppressed: false,
    created_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    description: "The login endpoint lacks rate limiting, making it vulnerable to brute force attacks.",
    remediation_guidance: "Implement rate limiting with exponential backoff.",
    cvss_score: 5.5,
    affected_component: "src/auth/routes.js",
    scanner_source: "SonarQube"
  },
  {
    id: "vuln-7",
    title: "Unvalidated Redirect in OAuth Flow",
    cve_id: "CVE-2024-5678",
    severity: "medium",
    status: "resolved",
    environment: "production",
    asset: "auth-service",
    assigned_team: "team-3",
    ownership_confidence: 96,
    is_suppressed: false,
    created_date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    description: "Open redirect vulnerability in the OAuth callback handler.",
    remediation_guidance: "Validate redirect URLs against a whitelist.",
    cvss_score: 5.3,
    affected_component: "src/auth/oauth.js",
    scanner_source: "Checkmarx"
  },
  {
    id: "vuln-8",
    title: "Verbose Error Messages Exposing Stack Traces",
    cve_id: null,
    severity: "low",
    status: "open",
    environment: "staging",
    asset: "api-gateway",
    assigned_team: "team-4",
    ownership_confidence: 72,
    is_suppressed: true,
    created_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    description: "Error responses include detailed stack traces that could aid attackers.",
    remediation_guidance: "Configure error handling to return generic messages in production.",
    cvss_score: 3.5,
    affected_component: "src/middleware/errorHandler.js",
    scanner_source: "SonarQube"
  },
  {
    id: "vuln-9",
    title: "Insufficient Logging of Security Events",
    cve_id: null,
    severity: "low",
    status: "open",
    environment: "production",
    asset: "auth-service",
    assigned_team: "team-5",
    ownership_confidence: 65,
    is_suppressed: false,
    created_date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    description: "Security-relevant events are not being logged adequately.",
    remediation_guidance: "Implement comprehensive security event logging.",
    cvss_score: 4.0,
    affected_component: "src/logging/security.js",
    scanner_source: "Manual Review"
  },
  {
    id: "vuln-10",
    title: "Vulnerable npm Dependencies",
    cve_id: "CVE-2024-6789",
    severity: "high",
    status: "open",
    environment: "production",
    asset: "web-frontend",
    assigned_team: "team-2",
    ownership_confidence: 89,
    is_suppressed: false,
    created_date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    description: "Multiple npm packages have known security vulnerabilities.",
    remediation_guidance: "Run npm audit fix and update vulnerable packages.",
    cvss_score: 7.0,
    affected_component: "package.json",
    scanner_source: "Snyk"
  },
  {
    id: "vuln-11",
    title: "Kubernetes Secrets Not Encrypted at Rest",
    cve_id: null,
    severity: "high",
    status: "in_progress",
    environment: "production",
    asset: "k8s-cluster",
    assigned_team: "team-4",
    ownership_confidence: 94,
    is_suppressed: false,
    created_date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    description: "Kubernetes secrets are stored unencrypted in etcd.",
    remediation_guidance: "Enable encryption at rest for Kubernetes secrets.",
    cvss_score: 7.5,
    affected_component: "infrastructure/k8s",
    scanner_source: "Qualys"
  },
  {
    id: "vuln-12",
    title: "Misconfigured CORS Policy",
    cve_id: null,
    severity: "medium",
    status: "open",
    environment: "production",
    asset: "api-gateway",
    assigned_team: "team-4",
    ownership_confidence: 82,
    is_suppressed: false,
    created_date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    description: "CORS policy allows requests from any origin.",
    remediation_guidance: "Configure CORS to only allow trusted domains.",
    cvss_score: 5.8,
    affected_component: "infrastructure/api-gateway/cors.config",
    scanner_source: "Manual Review"
  },
];

export const mockAssets = [
  { id: "asset-1", name: "auth-service", type: "service", criticality: "critical", environment: "production", owner_team: "team-3", risk_score: 85 },
  { id: "asset-2", name: "web-frontend", type: "application", criticality: "high", environment: "production", owner_team: "team-2", risk_score: 72 },
  { id: "asset-3", name: "api-gateway", type: "infrastructure", criticality: "critical", environment: "production", owner_team: "team-4", risk_score: 78 },
  { id: "asset-4", name: "user-api", type: "service", criticality: "high", environment: "production", owner_team: "team-3", risk_score: 65 },
  { id: "asset-5", name: "payment-service", type: "service", criticality: "critical", environment: "production", owner_team: "team-3", risk_score: 70 },
  { id: "asset-6", name: "k8s-cluster", type: "infrastructure", criticality: "critical", environment: "production", owner_team: "team-4", risk_score: 75 },
  { id: "asset-7", name: "database-primary", type: "database", criticality: "critical", environment: "production", owner_team: "team-4", risk_score: 60 },
  { id: "asset-8", name: "cdn-edge", type: "infrastructure", criticality: "medium", environment: "production", owner_team: "team-4", risk_score: 35 },
];

export const mockRemediationTasks = [
  {
    id: "task-1",
    title: "Patch SQL Injection Vulnerability",
    vulnerability_id: "vuln-1",
    assigned_to: "john.doe@company.com",
    assigned_team: "team-3",
    status: "in_progress",
    priority: "critical",
    due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    created_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    estimated_effort: "4 hours",
    jira_key: "SEC-1234"
  },
  {
    id: "task-2",
    title: "Fix XSS in Dashboard Search",
    vulnerability_id: "vuln-2",
    assigned_to: "jane.smith@company.com",
    assigned_team: "team-2",
    status: "in_progress",
    priority: "high",
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    estimated_effort: "2 hours",
    jira_key: "SEC-1235"
  },
  {
    id: "task-3",
    title: "Upgrade OpenSSL",
    vulnerability_id: "vuln-3",
    assigned_to: "bob.wilson@company.com",
    assigned_team: "team-4",
    status: "pending",
    priority: "critical",
    due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    created_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    estimated_effort: "8 hours",
    jira_key: "SEC-1236"
  },
];

export const mockIncidents = [
  {
    id: "incident-1",
    title: "Potential Data Breach Attempt",
    severity: "critical",
    status: "investigating",
    detected_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    affected_assets: ["auth-service", "user-api"],
    assigned_team: "team-5",
    description: "Multiple failed login attempts detected from unusual IP ranges.",
    containment_status: "in_progress"
  },
  {
    id: "incident-2",
    title: "Unusual API Traffic Pattern",
    severity: "high",
    status: "monitoring",
    detected_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    affected_assets: ["api-gateway"],
    assigned_team: "team-5",
    description: "Spike in API requests to user endpoints from single IP.",
    containment_status: "contained"
  },
];

export const mockSuppressionRules = [
  { id: "rule-1", name: "Non-Production Environment Filter", type: "environment", condition: "environment != 'production'", active: true, suppressed_count: 45 },
  { id: "rule-2", name: "Legacy Systems Exclusion", type: "asset_pattern", condition: "asset LIKE 'legacy-%'", active: true, suppressed_count: 23 },
  { id: "rule-3", name: "Low Severity in Dev", type: "severity_environment", condition: "severity = 'low' AND environment = 'development'", active: true, suppressed_count: 67 },
];

export const mockComplianceReports = [
  {
    id: "report-1",
    framework: "SOC 2 Type II",
    status: "compliant",
    score: 94,
    last_assessed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    controls_passed: 85,
    controls_total: 90,
    gaps: ["Encryption key rotation needs improvement", "Incident response documentation incomplete"]
  },
  {
    id: "report-2",
    framework: "ISO 27001",
    status: "partial",
    score: 87,
    last_assessed: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    controls_passed: 78,
    controls_total: 93,
    gaps: ["Asset inventory needs updating", "Third-party risk assessments pending"]
  },
  {
    id: "report-3",
    framework: "NIST CSF",
    status: "compliant",
    score: 91,
    last_assessed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    controls_passed: 105,
    controls_total: 115,
    gaps: ["Recovery testing frequency below target"]
  },
];

export const mockThreatHuntingSessions = [
  {
    id: "hunt-1",
    session_name: "Q1 2024 APT Detection",
    name: "Q1 2024 APT Detection",
    status: "completed",
    start_time: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    created_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    hunting_hypothesis: "Advanced persistent threat actors may have established foothold in development environment",
    investigation_steps: [
      { id: 1, name: "Analyze network logs", status: "completed" },
      { id: 2, name: "Review authentication patterns", status: "completed" },
      { id: 3, name: "Check for lateral movement", status: "completed" }
    ],
    findings: [
      { id: 1, description: "Suspicious outbound connection to unknown IP", severity: "high" },
      { id: 2, description: "Unusual login pattern from service account", severity: "medium" },
      { id: 3, description: "Encrypted traffic to non-standard port", severity: "medium" }
    ],
    severity_breakdown: { critical: 0, high: 1, medium: 2, low: 0 }
  },
  {
    id: "hunt-2",
    session_name: "Lateral Movement Detection",
    name: "Lateral Movement Detection",
    status: "active",
    start_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    created_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    hunting_hypothesis: "Compromised credentials may be used for lateral movement between production servers",
    investigation_steps: [
      { id: 1, name: "Map service account usage", status: "completed" },
      { id: 2, name: "Analyze RDP/SSH connections", status: "in_progress" },
      { id: 3, name: "Review privilege escalation", status: "pending" }
    ],
    findings: [
      { id: 1, description: "Service account accessed unusual resources", severity: "medium" }
    ],
    severity_breakdown: { critical: 0, high: 0, medium: 1, low: 0 }
  },
];

export const mockThreatAlerts = [
  {
    id: "alert-1",
    alert_name: "Potential SQL Injection Attack Detected",
    alert_type: "Intrusion Attempt",
    severity: "critical",
    status: "new",
    detection_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    threat_description: "Multiple SQL injection attempts detected from IP 192.168.1.105 targeting the authentication endpoint. Pattern matches known attack signatures.",
    confidence_score: 92,
    attack_chain_phase: "Initial Access",
    affected_assets: ["auth-service", "api-gateway"],
    behavioral_patterns: [
      "Repeated malformed SQL queries in login requests",
      "User agent string matches known attack tool",
      "Request rate exceeds normal threshold"
    ]
  },
  {
    id: "alert-2",
    alert_name: "Suspicious Data Exfiltration Pattern",
    alert_type: "Data Exfiltration",
    severity: "high",
    status: "investigating",
    detection_time: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    threat_description: "Unusual outbound data transfer detected from database server to external IP. Volume and timing suggest potential data exfiltration.",
    confidence_score: 78,
    attack_chain_phase: "Exfiltration",
    affected_assets: ["database-primary"],
    behavioral_patterns: [
      "Large data transfer outside business hours",
      "Connection to previously unseen external IP",
      "Data compressed before transfer"
    ]
  },
  {
    id: "alert-3",
    alert_name: "Brute Force Authentication Attempt",
    alert_type: "Credential Attack",
    severity: "medium",
    status: "new",
    detection_time: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    threat_description: "High volume of failed authentication attempts detected targeting multiple user accounts from distributed IP addresses.",
    confidence_score: 85,
    attack_chain_phase: "Credential Access",
    affected_assets: ["auth-service"],
    behavioral_patterns: [
      "500+ failed login attempts in 10 minutes",
      "Attempts distributed across multiple IPs",
      "Common password patterns detected"
    ]
  }
];

export const mockPredictiveAnalysis = {
  risk_forecast: [
    { date: "2024-02", predicted_vulns: 15, confidence: 0.85 },
    { date: "2024-03", predicted_vulns: 18, confidence: 0.78 },
    { date: "2024-04", predicted_vulns: 12, confidence: 0.72 },
  ],
  high_risk_assets: ["auth-service", "api-gateway", "payment-service"],
  recommended_actions: [
    "Schedule security review for auth-service",
    "Update WAF rules for api-gateway",
    "Implement additional monitoring for payment flows"
  ]
};

// Generate trend data
export function generateTrendData(period) {
  const now = new Date();
  const data = [];
  const points = period === 'daily' ? 7 : period === 'weekly' ? 4 : 6;

  for (let i = points - 1; i >= 0; i--) {
    const date = new Date(now);
    if (period === 'daily') date.setDate(date.getDate() - i);
    else if (period === 'weekly') date.setDate(date.getDate() - i * 7);
    else date.setMonth(date.getMonth() - i);

    data.push({
      date: date.toISOString().split('T')[0],
      total: Math.floor(Math.random() * 20) + 30,
      critical: Math.floor(Math.random() * 5) + 2,
      high: Math.floor(Math.random() * 8) + 5,
      medium: Math.floor(Math.random() * 10) + 8,
      low: Math.floor(Math.random() * 8) + 5,
      resolved: Math.floor(Math.random() * 15) + 10,
    });
  }

  return {
    success: true,
    time_series: data,
    anomaly: null,
    current_metrics: {
      total: 45,
      critical: 3,
      high: 8,
      medium: 12,
      low: 6,
      mttr_days: 4.5
    },
    team_trends: mockTeams.map(team => ({
      team_name: team.name,
      open_count: Math.floor(Math.random() * 15) + 5,
      resolved_count: Math.floor(Math.random() * 10) + 3,
      avg_resolution_time: Math.floor(Math.random() * 5) + 2
    })),
    asset_trends: mockAssets.slice(0, 5).map(asset => ({
      asset_name: asset.name,
      vuln_count: Math.floor(Math.random() * 8) + 2,
      risk_score: asset.risk_score
    }))
  };
}

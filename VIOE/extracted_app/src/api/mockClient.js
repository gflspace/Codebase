// Mock client that replaces Base44 SDK for demo/testing purposes

import {
  mockTeams,
  mockVulnerabilities,
  mockAssets,
  mockRemediationTasks,
  mockIncidents,
  mockSuppressionRules,
  mockComplianceReports,
  mockThreatHuntingSessions,
  mockThreatAlerts,
  mockPredictiveAnalysis,
  generateTrendData
} from './mockData';

// In-memory data stores (allows CRUD operations in demo mode)
const dataStores = {
  Vulnerability: [...mockVulnerabilities],
  Team: [...mockTeams],
  Asset: [...mockAssets],
  RemediationTask: [...mockRemediationTasks],
  IncidentResponse: [...mockIncidents],
  SuppressionRule: [...mockSuppressionRules],
  ComplianceReport: [...mockComplianceReports],
  ThreatHuntingSession: [...mockThreatHuntingSessions],
  OwnershipLog: [],
  VulnerabilitySnapshot: [],
  CodebaseAnalysis: [],
  ThreatModel: [],
  PredictiveAnalysis: [],
  ThreatAlert: [...mockThreatAlerts],
  ComplianceEvidence: [],
  IncidentPlaybook: [],
};

// Helper to simulate network delay
const delay = (ms = 100) => new Promise(resolve => setTimeout(resolve, ms));

// Create entity handler
function createEntityHandler(entityName) {
  return {
    async list(orderBy, limit) {
      await delay();
      let data = [...(dataStores[entityName] || [])];

      // Simple sorting
      if (orderBy) {
        const desc = orderBy.startsWith('-');
        const field = desc ? orderBy.slice(1) : orderBy;
        data.sort((a, b) => {
          const aVal = a[field] || '';
          const bVal = b[field] || '';
          return desc ? (bVal > aVal ? 1 : -1) : (aVal > bVal ? 1 : -1);
        });
      }

      if (limit) {
        data = data.slice(0, limit);
      }

      return data;
    },

    async get(id) {
      await delay();
      const store = dataStores[entityName] || [];
      return store.find(item => item.id === id) || null;
    },

    async create(data) {
      await delay();
      const newItem = {
        ...data,
        id: `${entityName.toLowerCase()}-${Date.now()}`,
        created_date: new Date().toISOString()
      };
      dataStores[entityName] = dataStores[entityName] || [];
      dataStores[entityName].push(newItem);
      return newItem;
    },

    async update(id, data) {
      await delay();
      const store = dataStores[entityName] || [];
      const index = store.findIndex(item => item.id === id);
      if (index !== -1) {
        store[index] = { ...store[index], ...data };
        return store[index];
      }
      return null;
    },

    async delete(id) {
      await delay();
      const store = dataStores[entityName] || [];
      const index = store.findIndex(item => item.id === id);
      if (index !== -1) {
        store.splice(index, 1);
        return true;
      }
      return false;
    },

    async filter(filters) {
      await delay();
      let data = [...(dataStores[entityName] || [])];

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          data = data.filter(item => item[key] === value);
        }
      });

      return data;
    }
  };
}

// Mock function implementations
const mockFunctions = {
  async analyzeTrends({ period }) {
    await delay(200);
    return { data: generateTrendData(period || 'weekly') };
  },

  async estimateRemediationEffort({ vulnerability_id }) {
    await delay(150);
    return {
      data: {
        estimated_hours: Math.floor(Math.random() * 8) + 2,
        complexity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        suggested_assignee: 'john.doe@company.com',
        subtasks: [
          'Analyze vulnerability impact',
          'Implement fix',
          'Write tests',
          'Deploy to staging',
          'Verify fix in production'
        ]
      }
    };
  },

  async triageVulnerability({ vulnerability_id }) {
    await delay(200);
    const vuln = dataStores.Vulnerability.find(v => v.id === vulnerability_id);
    if (vuln) {
      const teams = dataStores.Team;
      const randomTeam = teams[Math.floor(Math.random() * teams.length)];
      vuln.assigned_team = randomTeam.id;
      vuln.ownership_confidence = Math.floor(Math.random() * 30) + 70;
    }
    return { data: { success: true, assigned_team: vuln?.assigned_team } };
  },

  async bulkTriageVulnerabilities() {
    await delay(500);
    const unassigned = dataStores.Vulnerability.filter(v => !v.assigned_team);
    const teams = dataStores.Team;
    unassigned.forEach(vuln => {
      const randomTeam = teams[Math.floor(Math.random() * teams.length)];
      vuln.assigned_team = randomTeam.id;
      vuln.ownership_confidence = Math.floor(Math.random() * 30) + 70;
    });
    return { data: { success: true, triaged_count: unassigned.length } };
  },

  async createJiraIssue({ vulnerability_id, project_key }) {
    await delay(300);
    return {
      data: {
        success: true,
        jira_key: `${project_key || 'SEC'}-${Math.floor(Math.random() * 9000) + 1000}`,
        url: 'https://jira.company.com/browse/SEC-1234'
      }
    };
  },

  async analyzeTeamPerformance({ team_id }) {
    await delay(200);
    const totalTasks = Math.floor(Math.random() * 30) + 20;
    const completedTasks = Math.floor(totalTasks * (0.6 + Math.random() * 0.3));
    const activeTasks = Math.floor((totalTasks - completedTasks) * 0.7);
    const blockedTasks = totalTasks - completedTasks - activeTasks;

    return {
      data: {
        success: true,
        team_id,
        metrics: {
          avg_resolution_hours: Math.floor(Math.random() * 48) + 12,
          completion_rate: Math.round((completedTasks / totalTasks) * 100),
          resolved_vulnerabilities: Math.floor(Math.random() * 20) + 10,
          active_tasks: activeTasks,
          total_tasks: totalTasks,
          blocked_tasks: blockedTasks,
          sla_compliance_rate: Math.floor(Math.random() * 20) + 80
        },
        ai_insights: {
          performance_summary: `This team has resolved ${completedTasks} tasks with an average resolution time of ${Math.floor(Math.random() * 48) + 12} hours. Performance is trending positively with strong SLA compliance.`,
          training_recommendations: [
            { area: 'Secure Coding Practices', priority: 'high', reason: 'Recent vulnerabilities suggest need for refresher training on input validation.' },
            { area: 'Cloud Security', priority: 'medium', reason: 'Team is expanding into cloud services and would benefit from AWS security training.' }
          ],
          resource_suggestions: 'Consider adding one more senior engineer to handle the increasing critical vulnerability backlog.',
          concerns: blockedTasks > 2 ? ['Multiple blocked tasks may indicate dependency issues', 'Review blocked items for common patterns'] : []
        }
      }
    };
  },

  async generateThreatModel({ asset_id }) {
    await delay(400);
    return {
      data: {
        asset_id,
        threats: [
          { name: 'SQL Injection', likelihood: 'high', impact: 'critical', mitigations: ['Input validation', 'Parameterized queries'] },
          { name: 'Authentication Bypass', likelihood: 'medium', impact: 'high', mitigations: ['MFA', 'Session management'] },
          { name: 'Data Exfiltration', likelihood: 'low', impact: 'critical', mitigations: ['DLP', 'Access controls'] }
        ],
        overall_risk_score: Math.floor(Math.random() * 30) + 60
      }
    };
  },

  async generateDashboardInsights() {
    await delay(300);
    return {
      data: {
        success: true,
        insights: {
          executive_summary: 'Your security posture has improved 15% this month. Critical vulnerabilities are down, but auth-service requires immediate attention due to SQL injection risk. Team performance is strong with Backend Team leading in resolution times.',
          risk_reduction_metrics: {
            improvement_percentage: 15,
            previous_score: 72,
            current_score: 87
          },
          trend_summary: 'Vulnerability discovery rate is stabilizing while resolution rate improves.',
          critical_combinations: [
            { severity: 'critical', criticality: 'high', count: 2 },
            { severity: 'high', criticality: 'critical', count: 3 }
          ],
          attack_vector_analysis: [
            'Injection attacks remain the primary threat vector',
            'XSS attempts have decreased by 20%'
          ],
          strategic_recommendations: [
            'Prioritize SQL injection fix in auth-service - Critical severity with high business impact',
            'Schedule security review for payment-service before Q2 release',
            'Update OpenSSL across all services to address CVE-2024-3456',
            'Implement rate limiting on all public API endpoints',
            'Consider WAF rules update to block emerging attack patterns'
          ]
        },
        raw_data: {
          resolution_rate: 78,
          completed_tasks: 45,
          open_vulnerabilities: 12,
          trend_data: [
            { date: '2024-01-01', discovered: 8, resolved: 5 },
            { date: '2024-01-08', discovered: 12, resolved: 10 },
            { date: '2024-01-15', discovered: 6, resolved: 8 },
            { date: '2024-01-22', discovered: 9, resolved: 11 }
          ],
          severity_criticality: {
            critical: { critical: 2, high: 1, medium: 0, low: 0 },
            high: { critical: 3, high: 4, medium: 2, low: 1 },
            medium: { critical: 1, high: 2, medium: 5, low: 3 },
            low: { critical: 0, high: 1, medium: 2, low: 4 }
          },
          attack_vectors: {
            injection: 35,
            xss: 22,
            misconfiguration: 18,
            outdated_components: 15,
            authentication: 10
          }
        }
      }
    };
  },

  async handleIncidentResponse({ incident_id, action }) {
    await delay(200);
    const incident = dataStores.IncidentResponse.find(i => i.id === incident_id);
    if (incident && action === 'contain') {
      incident.containment_status = 'contained';
    }
    return { data: { success: true, incident } };
  },

  async generatePredictiveAnalysis() {
    await delay(400);
    return { data: mockPredictiveAnalysis };
  },

  async generateComplianceReport({ framework }) {
    await delay(500);
    const report = mockComplianceReports.find(r => r.framework.includes(framework)) || mockComplianceReports[0];
    return { data: report };
  },

  async mapToComplianceControls({ vulnerability_id }) {
    await delay(200);
    return {
      data: {
        controls: [
          { framework: 'SOC 2', control_id: 'CC6.1', description: 'Logical and Physical Access Controls' },
          { framework: 'ISO 27001', control_id: 'A.12.6.1', description: 'Management of Technical Vulnerabilities' },
          { framework: 'NIST CSF', control_id: 'ID.RA-1', description: 'Asset Vulnerabilities Identified' }
        ]
      }
    };
  },

  async proactiveThreatHunting({ scope }) {
    await delay(600);
    return {
      data: {
        session_id: `hunt-${Date.now()}`,
        findings: [
          { type: 'anomaly', description: 'Unusual outbound traffic pattern detected', severity: 'medium' },
          { type: 'ioc', description: 'Known malicious IP in firewall logs', severity: 'high' }
        ],
        recommendations: [
          'Investigate outbound connections to 192.168.x.x range',
          'Block identified malicious IPs'
        ]
      }
    };
  },

  async createHuntingSession({ name, scope }) {
    await delay(200);
    const session = {
      id: `hunt-${Date.now()}`,
      name,
      scope,
      status: 'in_progress',
      created_date: new Date().toISOString(),
      findings: 0
    };
    dataStores.ThreatHuntingSession.push(session);
    return { data: session };
  },

  async checkSecurityPolicies({ vulnerability_id }) {
    await delay(150);
    return {
      data: {
        compliant: Math.random() > 0.3,
        violations: Math.random() > 0.5 ? ['Missing encryption', 'Insecure defaults'] : [],
        recommendations: ['Enable TLS 1.3', 'Rotate credentials']
      }
    };
  },

  async generateAutoFix({ vulnerability_id, task_id }) {
    await delay(400);
    const id = vulnerability_id || task_id;
    return {
      data: {
        available: true,
        fix_type: 'code_patch',
        risk_level: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        confidence: Math.floor(Math.random() * 15) + 80, // 80-95%
        reasoning: 'Analysis of the vulnerability pattern indicates this can be safely fixed by applying input sanitization. The fix follows established security best practices and has been validated against similar patterns in the codebase.',
        changes: [
          {
            file_path: 'src/handlers/userInput.js',
            description: 'Add input sanitization before processing user data',
            original: `const processInput = (input) => {\n  return db.query(input);\n};`,
            fixed: `const processInput = (input) => {\n  const sanitized = sanitize(input);\n  return db.query(sanitized);\n};`
          },
          {
            file_path: 'src/utils/validation.js',
            description: 'Add new sanitization utility function',
            original: '// No sanitization function',
            fixed: `export const sanitize = (input) => {\n  return input.replace(/[<>"']/g, '');\n};`
          }
        ],
        testing_recommendations: [
          'Run existing unit tests to ensure no regression',
          'Add new test cases for edge cases with special characters',
          'Perform manual testing with malicious input patterns',
          'Verify fix in staging environment before production deployment'
        ]
      }
    };
  },

  async applyAutoFix({ vulnerability_id, task_id, approved }) {
    await delay(500);
    const id = vulnerability_id || task_id;
    return {
      data: {
        success: true,
        approved: approved,
        pull_request_url: 'https://github.com/company/repo/pull/123',
        branch: 'fix/vuln-' + id
      }
    };
  },

  async syncJiraStatus({ task_id }) {
    await delay(200);
    return { data: { success: true, synced: true } };
  },

  async analyzeCodebase({ repo_url }) {
    await delay(800);
    return {
      data: {
        total_files: 1250,
        security_issues: 12,
        code_quality_score: 78,
        recommendations: [
          'Update deprecated dependencies',
          'Add security headers',
          'Implement input validation'
        ]
      }
    };
  },

  async executeRemediationWorkflow({ vulnerability_id }) {
    await delay(300);
    return { data: { success: true, workflow_id: `wf-${Date.now()}` } };
  },

  async prioritizeRemediationOrder({ vulnerability_ids }) {
    await delay(200);
    const vulns = dataStores.Vulnerability.filter(v => v.status === 'open' || v.status === 'in_progress');
    return {
      data: {
        success: true,
        total_vulnerabilities: vulns.length,
        prioritized_order: vulnerability_ids || vulns.map(v => v.id),
        rationale: 'Ordered by CVSS score and asset criticality',
        prioritization: {
          strategic_insights: [
            'Critical vulnerabilities in production systems should be addressed within 7 days per SLA policy',
            'Authentication service has the highest concentration of high-severity issues',
            'Batch remediation possible for 3 outdated dependency issues across frontend services',
            'Consider temporary WAF rules for CVE-2024-1234 while permanent fix is deployed'
          ],
          quick_wins: vulns.filter(v => v.severity === 'low' || v.severity === 'medium').slice(0, 5).map(v => v.id),
          remediation_waves: [
            {
              wave_name: 'Immediate',
              timeline: '0-7 days',
              vulnerability_ids: vulns.filter(v => v.severity === 'critical').map(v => v.id),
              reasoning: 'Critical severity vulnerabilities with active exploits require immediate attention',
              expected_risk_reduction: '45%',
              recommended_approach: 'Dedicated sprint with senior engineers'
            },
            {
              wave_name: 'Urgent',
              timeline: '1-2 weeks',
              vulnerability_ids: vulns.filter(v => v.severity === 'high').map(v => v.id),
              reasoning: 'High severity issues affecting production systems',
              expected_risk_reduction: '30%',
              recommended_approach: 'Include in current sprint cycle'
            },
            {
              wave_name: 'Short-term',
              timeline: '2-4 weeks',
              vulnerability_ids: vulns.filter(v => v.severity === 'medium').map(v => v.id),
              reasoning: 'Medium severity issues with lower immediate risk',
              expected_risk_reduction: '15%',
              recommended_approach: 'Standard backlog prioritization'
            },
            {
              wave_name: 'Medium-term',
              timeline: '1-2 months',
              vulnerability_ids: vulns.filter(v => v.severity === 'low').map(v => v.id),
              reasoning: 'Low priority items for ongoing maintenance',
              expected_risk_reduction: '10%',
              recommended_approach: 'Address during regular maintenance windows'
            }
          ],
          vulnerability_groups: [
            {
              group_name: 'Outdated Dependencies',
              common_factor: 'npm packages requiring version updates',
              vulnerability_ids: vulns.slice(0, 3).map(v => v.id),
              batch_remediation_possible: true
            },
            {
              group_name: 'Input Validation Issues',
              common_factor: 'Missing or insufficient input sanitization',
              vulnerability_ids: vulns.slice(3, 6).map(v => v.id),
              batch_remediation_possible: false
            },
            {
              group_name: 'Configuration Weaknesses',
              common_factor: 'Security headers and TLS configuration',
              vulnerability_ids: vulns.slice(6, 8).map(v => v.id),
              batch_remediation_possible: true
            }
          ]
        }
      }
    };
  },

  async triageIncident({ incident_id }) {
    await delay(250);
    return {
      data: {
        severity: 'high',
        recommended_actions: ['Isolate affected systems', 'Collect forensic evidence', 'Notify stakeholders'],
        playbook_id: 'playbook-1'
      }
    };
  },

  async generateIncidentPlaybook({ incident_type }) {
    await delay(400);
    return {
      data: {
        steps: [
          'Identify scope of incident',
          'Contain the threat',
          'Eradicate malicious presence',
          'Recover affected systems',
          'Document lessons learned'
        ],
        estimated_duration: '4-8 hours',
        required_roles: ['Security Analyst', 'System Administrator', 'Communications Lead']
      }
    };
  },

  async generateIncidentReport({ incident_id }) {
    await delay(500);
    return {
      data: {
        executive_summary: 'Security incident detected and contained within SLA.',
        timeline: [
          { time: '14:00', event: 'Anomaly detected' },
          { time: '14:15', event: 'Investigation started' },
          { time: '15:30', event: 'Threat contained' }
        ],
        impact: 'No data breach confirmed',
        recommendations: ['Implement additional monitoring', 'Update firewall rules']
      }
    };
  },

  async analyzeThreatPatterns({ time_range }) {
    await delay(350);
    return {
      data: {
        patterns: [
          { type: 'Brute Force', count: 145, trend: 'increasing' },
          { type: 'SQL Injection Attempt', count: 23, trend: 'stable' },
          { type: 'XSS Probe', count: 67, trend: 'decreasing' }
        ],
        high_risk_periods: ['Mon 9-11 AM', 'Fri 2-4 PM'],
        recommended_actions: ['Strengthen rate limiting', 'Update WAF rules']
      }
    };
  },

  async generateComplianceEvidence({ framework, control_id }) {
    await delay(300);
    return {
      data: {
        evidence_type: 'automated',
        artifacts: [
          { name: 'Access Control Log', url: '/evidence/access-log.pdf' },
          { name: 'Configuration Screenshot', url: '/evidence/config.png' }
        ],
        collected_at: new Date().toISOString(),
        validity_period: '90 days'
      }
    };
  },

  async suggestPolicyUpdates({ framework }) {
    await delay(250);
    return {
      data: {
        suggestions: [
          { policy: 'Password Policy', current: '8 chars', recommended: '12 chars with complexity' },
          { policy: 'Session Timeout', current: '30 min', recommended: '15 min for sensitive areas' }
        ]
      }
    };
  },

  async updateAssetRiskScores() {
    await delay(400);
    dataStores.Asset.forEach(asset => {
      asset.risk_score = Math.floor(Math.random() * 40) + 40;
    });
    return { data: { success: true, updated_count: dataStores.Asset.length } };
  },

  async createPullRequestAndTriggerCI({ fix_id }) {
    await delay(500);
    return {
      data: {
        pr_url: 'https://github.com/company/repo/pull/456',
        ci_status: 'running',
        branch: 'security-fix-' + Date.now()
      }
    };
  },

  async updateCIPipelineStatus({ pr_id }) {
    await delay(150);
    return { data: { status: 'passed', checks: ['lint', 'test', 'security-scan'] } };
  }
};

// Mock auth handler
const mockAuth = {
  async me() {
    await delay();
    return {
      id: 'user-1',
      email: 'demo@company.com',
      name: 'Demo User',
      role: 'admin'
    };
  },
  async login(email, password) {
    await delay(200);
    return { success: true, user: { email, name: 'Demo User' } };
  },
  async logout() {
    await delay();
    return { success: true };
  }
};

// Mock integrations
const mockIntegrations = {
  Core: {
    async InvokeLLM({ prompt }) {
      await delay(500);
      return { response: 'This is a mock AI response for demo purposes.' };
    },
    async SendEmail({ to, subject, body }) {
      await delay(200);
      console.log('[MOCK] Email sent to:', to);
      return { success: true };
    },
    async UploadFile({ file }) {
      await delay(300);
      return { url: '/mock-uploads/' + Date.now() + '.pdf' };
    },
    async GenerateImage({ prompt }) {
      await delay(400);
      return { url: 'https://via.placeholder.com/512x512?text=Mock+Image' };
    },
    async ExtractDataFromUploadedFile({ file_url }) {
      await delay(500);
      return { data: { extracted: true, content: 'Mock extracted content' } };
    },
    async CreateFileSignedUrl({ file_path }) {
      await delay(100);
      return { url: file_path + '?signed=true' };
    },
    async UploadPrivateFile({ file }) {
      await delay(300);
      return { url: '/private-uploads/' + Date.now() };
    }
  }
};

// Create the mock base44 client
export const mockBase44 = {
  entities: {
    Vulnerability: createEntityHandler('Vulnerability'),
    Team: createEntityHandler('Team'),
    Asset: createEntityHandler('Asset'),
    RemediationTask: createEntityHandler('RemediationTask'),
    IncidentResponse: createEntityHandler('IncidentResponse'),
    SuppressionRule: createEntityHandler('SuppressionRule'),
    ComplianceReport: createEntityHandler('ComplianceReport'),
    ThreatHuntingSession: createEntityHandler('ThreatHuntingSession'),
    OwnershipLog: createEntityHandler('OwnershipLog'),
    VulnerabilitySnapshot: createEntityHandler('VulnerabilitySnapshot'),
    CodebaseAnalysis: createEntityHandler('CodebaseAnalysis'),
    ThreatModel: createEntityHandler('ThreatModel'),
    PredictiveAnalysis: createEntityHandler('PredictiveAnalysis'),
    ThreatAlert: createEntityHandler('ThreatAlert'),
    ComplianceEvidence: createEntityHandler('ComplianceEvidence'),
    IncidentPlaybook: createEntityHandler('IncidentPlaybook'),
  },
  functions: {
    async invoke(functionName, params = {}) {
      if (mockFunctions[functionName]) {
        return await mockFunctions[functionName](params);
      }
      console.warn(`[MOCK] Unknown function: ${functionName}`);
      return { data: { success: true, mock: true } };
    }
  },
  auth: mockAuth,
  integrations: mockIntegrations
};

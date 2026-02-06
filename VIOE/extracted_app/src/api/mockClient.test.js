/**
 * Mock Client Tests
 * Tests for the mock API client
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { mockBase44 } from './mockClient';

describe('mockBase44', () => {
  describe('entities', () => {
    describe('Vulnerability', () => {
      it('lists vulnerabilities', async () => {
        const vulns = await mockBase44.entities.Vulnerability.list();
        expect(Array.isArray(vulns)).toBe(true);
        expect(vulns.length).toBeGreaterThan(0);
      });

      it('lists vulnerabilities with ordering', async () => {
        const vulns = await mockBase44.entities.Vulnerability.list('-created_date', 5);
        expect(vulns.length).toBeLessThanOrEqual(5);
      });

      it('gets a vulnerability by id', async () => {
        const vulns = await mockBase44.entities.Vulnerability.list();
        const firstVuln = vulns[0];

        const retrieved = await mockBase44.entities.Vulnerability.get(firstVuln.id);
        expect(retrieved).toBeDefined();
        expect(retrieved.id).toBe(firstVuln.id);
      });

      it('creates a new vulnerability', async () => {
        const newVuln = await mockBase44.entities.Vulnerability.create({
          title: 'Test Vulnerability',
          severity: 'high',
          status: 'open',
        });

        expect(newVuln).toBeDefined();
        expect(newVuln.id).toBeDefined();
        expect(newVuln.title).toBe('Test Vulnerability');
      });

      it('updates a vulnerability', async () => {
        const vulns = await mockBase44.entities.Vulnerability.list();
        const firstVuln = vulns[0];

        const updated = await mockBase44.entities.Vulnerability.update(firstVuln.id, {
          status: 'resolved',
        });

        expect(updated.status).toBe('resolved');
      });
    });

    describe('Team', () => {
      it('lists teams', async () => {
        const teams = await mockBase44.entities.Team.list();
        expect(Array.isArray(teams)).toBe(true);
        expect(teams.length).toBeGreaterThan(0);
      });

      it('gets a team by id', async () => {
        const teams = await mockBase44.entities.Team.list();
        const firstTeam = teams[0];

        const retrieved = await mockBase44.entities.Team.get(firstTeam.id);
        expect(retrieved).toBeDefined();
        expect(retrieved.id).toBe(firstTeam.id);
      });
    });

    describe('Asset', () => {
      it('lists assets', async () => {
        const assets = await mockBase44.entities.Asset.list();
        expect(Array.isArray(assets)).toBe(true);
        expect(assets.length).toBeGreaterThan(0);
      });
    });
  });

  describe('functions', () => {
    it('invokes analyzeTrends', async () => {
      const result = await mockBase44.functions.invoke('analyzeTrends', { period: 'weekly' });

      expect(result.data).toBeDefined();
      expect(result.data.success).toBe(true);
      expect(result.data.time_series).toBeDefined();
    });

    it('invokes generateDashboardInsights', async () => {
      const result = await mockBase44.functions.invoke('generateDashboardInsights', {});

      expect(result.data).toBeDefined();
      expect(result.data.success).toBe(true);
      expect(result.data.insights).toBeDefined();
    });

    it('invokes triageVulnerability', async () => {
      const result = await mockBase44.functions.invoke('triageVulnerability', {
        vulnerability_id: 'vuln-1',
      });

      expect(result.data).toBeDefined();
      expect(result.data.success).toBe(true);
    });

    it('invokes estimateRemediationEffort', async () => {
      const result = await mockBase44.functions.invoke('estimateRemediationEffort', {
        vulnerability_id: 'vuln-1',
      });

      expect(result.data).toBeDefined();
      expect(result.data.estimated_hours).toBeDefined();
      expect(result.data.complexity).toBeDefined();
    });

    it('handles unknown functions gracefully', async () => {
      const result = await mockBase44.functions.invoke('unknownFunction', {});

      expect(result.data).toBeDefined();
      expect(result.data.mock).toBe(true);
    });
  });

  describe('auth', () => {
    it('returns current user', async () => {
      const user = await mockBase44.auth.me();

      expect(user).toBeDefined();
      expect(user.email).toBe('demo@company.com');
      expect(user.role).toBe('admin');
    });

    it('handles login', async () => {
      const result = await mockBase44.auth.login('test@test.com', 'password');

      expect(result.success).toBe(true);
    });

    it('handles logout', async () => {
      const result = await mockBase44.auth.logout();

      expect(result.success).toBe(true);
    });
  });

  describe('integrations', () => {
    it('invokes LLM', async () => {
      const result = await mockBase44.integrations.Core.InvokeLLM({
        prompt: 'Test prompt',
      });

      expect(result.response).toBeDefined();
    });

    it('sends email', async () => {
      const result = await mockBase44.integrations.Core.SendEmail({
        to: 'test@test.com',
        subject: 'Test',
        body: 'Test body',
      });

      expect(result.success).toBe(true);
    });
  });
});

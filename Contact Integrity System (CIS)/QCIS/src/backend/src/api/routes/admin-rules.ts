// QwickServices CIS — Layer 9: Admin Rules API
// CRUD + test/history/matches for detection rules.
// All endpoints require JWT auth and appropriate permissions.

import { Router, Request, Response } from 'express';
import { query } from '../../database/connection';
import { authenticateJWT, requirePermission } from '../middleware/auth';
import { validate, validateParams, validateQuery } from '../middleware/validation';
import { createRuleSchema, updateRuleSchema, ruleQuerySchema, uuidParam } from '../schemas';
import { generateId } from '../../shared/utils';
import { evaluateConditions } from '../../rules/conditions';
import { buildRuleContext } from '../../rules';

const router = Router();

// ─── GET /api/admin/rules — List all rules (latest version only) ────

router.get(
  '/',
  authenticateJWT,
  requirePermission('rules.view'),
  validateQuery(ruleQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE 1=1';
      const params: unknown[] = [];
      let paramIdx = 1;

      if (req.query.rule_type) {
        whereClause += ` AND rule_type = $${paramIdx++}`;
        params.push(req.query.rule_type);
      }

      if (req.query.enabled !== undefined) {
        whereClause += ` AND enabled = $${paramIdx++}`;
        params.push(req.query.enabled === 'true');
      }

      // Only show latest versions (exclude rules that have been superseded)
      whereClause += ` AND id NOT IN (SELECT previous_version_id FROM detection_rules WHERE previous_version_id IS NOT NULL)`;

      const [dataResult, countResult] = await Promise.all([
        query(
          `SELECT id, name, description, rule_type, trigger_event_types, conditions, actions,
                  priority, enabled, dry_run, created_by, version, previous_version_id,
                  created_at, updated_at
           FROM detection_rules ${whereClause}
           ORDER BY priority ASC, created_at DESC
           LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
          [...params, limit, offset]
        ),
        query(
          `SELECT COUNT(*) FROM detection_rules ${whereClause}`,
          params
        ),
      ]);

      const total = parseInt(countResult.rows[0].count, 10);

      res.json({
        data: dataResult.rows,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error('List admin rules error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── GET /api/admin/rules/:id — Get single rule ────────────────

router.get(
  '/:id',
  authenticateJWT,
  requirePermission('rules.view'),
  validateParams(uuidParam),
  async (req: Request, res: Response) => {
    try {
      const result = await query(
        `SELECT id, name, description, rule_type, trigger_event_types, conditions, actions,
                priority, enabled, dry_run, created_by, version, previous_version_id,
                created_at, updated_at
         FROM detection_rules WHERE id = $1`,
        [req.params.id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Rule not found' });
        return;
      }

      res.json({ data: result.rows[0] });
    } catch (error) {
      console.error('Get admin rule error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── POST /api/admin/rules — Create new rule ────────────────────

router.post(
  '/',
  authenticateJWT,
  requirePermission('rules.manage'),
  validate(createRuleSchema),
  async (req: Request, res: Response) => {
    try {
      const id = generateId();
      const {
        name, description, rule_type, trigger_event_types,
        conditions, actions, priority, enabled, dry_run,
      } = req.body;

      const result = await query(
        `INSERT INTO detection_rules (id, name, description, rule_type, trigger_event_types, conditions, actions, priority, enabled, dry_run, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id, name, description, rule_type, trigger_event_types, conditions, actions,
                   priority, enabled, dry_run, created_by, version, previous_version_id,
                   created_at, updated_at`,
        [
          id, name, description || null, rule_type, trigger_event_types,
          JSON.stringify(conditions), JSON.stringify(actions),
          priority ?? 100, enabled ?? true, dry_run ?? false,
          req.adminUser!.id,
        ]
      );

      // Audit log
      await query(
        `INSERT INTO audit_logs (id, actor, actor_type, action, entity_type, entity_id, details, ip_address)
         VALUES ($1, $2, 'admin', 'rule.created', 'detection_rule', $3, $4, $5)`,
        [
          generateId(), req.adminUser!.id, id,
          JSON.stringify({ name, rule_type, created_by: req.adminUser!.email }),
          req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
        ]
      );

      res.status(201).json({ data: result.rows[0] });
    } catch (error) {
      console.error('Create admin rule error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── PUT /api/admin/rules/:id — Update (creates new version) ────

router.put(
  '/:id',
  authenticateJWT,
  requirePermission('rules.manage'),
  validateParams(uuidParam),
  validate(updateRuleSchema),
  async (req: Request, res: Response) => {
    try {
      // Fetch existing rule
      const existing = await query(
        'SELECT id, name, description, rule_type, trigger_event_types, conditions, actions, priority, enabled, dry_run, version FROM detection_rules WHERE id = $1',
        [req.params.id]
      );

      if (existing.rows.length === 0) {
        res.status(404).json({ error: 'Rule not found' });
        return;
      }

      const old = existing.rows[0];

      if (!old.enabled) {
        res.status(400).json({ error: 'Cannot update a disabled (superseded) rule. Update the latest version instead.' });
        return;
      }

      // Disable old version
      await query(
        'UPDATE detection_rules SET enabled = false, updated_at = NOW() WHERE id = $1',
        [req.params.id]
      );

      // Create new version
      const newId = generateId();
      const merged = {
        name: req.body.name ?? old.name,
        description: req.body.description ?? old.description,
        rule_type: req.body.rule_type ?? old.rule_type,
        trigger_event_types: req.body.trigger_event_types ?? old.trigger_event_types,
        conditions: req.body.conditions ?? old.conditions,
        actions: req.body.actions ?? old.actions,
        priority: req.body.priority ?? old.priority,
        enabled: req.body.enabled ?? true,
        dry_run: req.body.dry_run ?? old.dry_run,
      };

      const result = await query(
        `INSERT INTO detection_rules (id, name, description, rule_type, trigger_event_types, conditions, actions, priority, enabled, dry_run, created_by, version, previous_version_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING id, name, description, rule_type, trigger_event_types, conditions, actions,
                   priority, enabled, dry_run, created_by, version, previous_version_id,
                   created_at, updated_at`,
        [
          newId, merged.name, merged.description, merged.rule_type,
          merged.trigger_event_types,
          JSON.stringify(merged.conditions), JSON.stringify(merged.actions),
          merged.priority, merged.enabled, merged.dry_run,
          req.adminUser!.id, old.version + 1, req.params.id,
        ]
      );

      // Audit log
      await query(
        `INSERT INTO audit_logs (id, actor, actor_type, action, entity_type, entity_id, details, ip_address)
         VALUES ($1, $2, 'admin', 'rule.updated', 'detection_rule', $3, $4, $5)`,
        [
          generateId(), req.adminUser!.id, newId,
          JSON.stringify({ previous_id: req.params.id, new_version: old.version + 1, updated_by: req.adminUser!.email }),
          req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
        ]
      );

      res.json({ data: result.rows[0] });
    } catch (error) {
      console.error('Update admin rule error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── DELETE /api/admin/rules/:id — Soft-disable rule ────────────

router.delete(
  '/:id',
  authenticateJWT,
  requirePermission('rules.manage'),
  validateParams(uuidParam),
  async (req: Request, res: Response) => {
    try {
      const result = await query(
        'UPDATE detection_rules SET enabled = false, updated_at = NOW() WHERE id = $1 RETURNING id',
        [req.params.id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Rule not found' });
        return;
      }

      // Audit log
      await query(
        `INSERT INTO audit_logs (id, actor, actor_type, action, entity_type, entity_id, details, ip_address)
         VALUES ($1, $2, 'admin', 'rule.disabled', 'detection_rule', $3, $4, $5)`,
        [
          generateId(), req.adminUser!.id, req.params.id,
          JSON.stringify({ disabled_by: req.adminUser!.email }),
          req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
        ]
      );

      res.json({ data: { deleted: true, id: req.params.id } });
    } catch (error) {
      console.error('Delete admin rule error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── POST /api/admin/rules/:id/test — Dry-run against recent data ──

router.post(
  '/:id/test',
  authenticateJWT,
  requirePermission('rules.manage'),
  validateParams(uuidParam),
  async (req: Request, res: Response) => {
    try {
      // Load the rule
      const ruleResult = await query(
        'SELECT * FROM detection_rules WHERE id = $1',
        [req.params.id]
      );

      if (ruleResult.rows.length === 0) {
        res.status(404).json({ error: 'Rule not found' });
        return;
      }

      const rule = ruleResult.rows[0];

      // Get recent scored users (last 100 unique users with scores)
      const recentUsers = await query(
        `SELECT DISTINCT ON (user_id) user_id, score, tier
         FROM risk_scores
         ORDER BY user_id, created_at DESC
         LIMIT 100`
      );

      let matches = 0;
      const sampleMatches: Array<{ user_id: string; score: number; tier: string }> = [];

      for (const row of recentUsers.rows) {
        const ctx = await buildRuleContext(
          row.user_id, parseFloat(row.score), row.tier,
          { totalActions: 0, recentActions: 0, lastActionType: null, sameTypeViolations: 0, hasActiveRestriction: false },
          [], rule.trigger_event_types[0] || 'general.event',
        );

        const matched = evaluateConditions(rule.conditions, ctx);
        if (matched) {
          matches++;
          if (sampleMatches.length < 10) {
            sampleMatches.push({ user_id: row.user_id, score: parseFloat(row.score), tier: row.tier });
          }
        }
      }

      res.json({
        data: {
          matches,
          total: recentUsers.rows.length,
          sample_matches: sampleMatches,
        },
      });
    } catch (error) {
      console.error('Test admin rule error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── GET /api/admin/rules/:id/history — Version history chain ────

router.get(
  '/:id/history',
  authenticateJWT,
  requirePermission('rules.view'),
  validateParams(uuidParam),
  async (req: Request, res: Response) => {
    try {
      // Walk the version chain backwards
      const versions: unknown[] = [];
      let currentId: string | null = req.params.id;

      while (currentId) {
        const result = await query(
          `SELECT id, name, version, enabled, dry_run, priority, created_by, previous_version_id, created_at, updated_at
           FROM detection_rules WHERE id = $1`,
          [currentId]
        );

        if (result.rows.length === 0) break;
        versions.push(result.rows[0]);
        currentId = result.rows[0].previous_version_id;
      }

      res.json({ data: versions });
    } catch (error) {
      console.error('Get rule history error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── GET /api/admin/rules/:id/matches — Recent match log entries ─

router.get(
  '/:id/matches',
  authenticateJWT,
  requirePermission('rules.view'),
  validateParams(uuidParam),
  async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await query(
        `SELECT id, rule_id, user_id, event_type, matched, dry_run, context_snapshot, actions_executed, created_at
         FROM rule_match_log
         WHERE rule_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [req.params.id, limit]
      );

      res.json({ data: result.rows });
    } catch (error) {
      console.error('Get rule matches error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;

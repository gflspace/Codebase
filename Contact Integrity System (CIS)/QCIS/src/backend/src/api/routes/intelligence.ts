// QwickServices CIS — Phase 3A: Intelligence API Routes
// Leakage funnel, network graph, and device endpoints

import { Router, Request, Response } from 'express';
import { ZodError } from 'zod';
import { query } from '../../database/connection';
import { authenticateJWT, requirePermission } from '../middleware/auth';
import { leakageQuerySchema, networkQuerySchema, deviceQuerySchema, clusterQuerySchema, pathRequestSchema } from '../schemas';

const router = Router();

// ─── GET /leakage — List leakage events ─────────────────────────

router.get(
  '/leakage',
  authenticateJWT,
  requirePermission('intelligence.view'),
  async (req: Request, res: Response) => {
    try {
      const filters = leakageQuerySchema.parse(req.query);
      const page = filters.page ?? 1;
      const limit = filters.limit ?? 20;
      const offset = (page - 1) * limit;

      const conditions: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      if (filters.user_id) {
        conditions.push(`user_id = $${idx++}`);
        values.push(filters.user_id);
      }
      if (filters.stage) {
        conditions.push(`stage = $${idx++}`);
        values.push(filters.stage);
      }
      if (filters.platform_destination) {
        conditions.push(`platform_destination = $${idx++}`);
        values.push(filters.platform_destination);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const [dataResult, countResult] = await Promise.all([
        query(
          `SELECT * FROM leakage_events ${where}
           ORDER BY created_at DESC
           LIMIT $${idx++} OFFSET $${idx++}`,
          [...values, limit, offset]
        ),
        query(
          `SELECT COUNT(*) AS total FROM leakage_events ${where}`,
          values
        ),
      ]);

      const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

      res.json({
        data: dataResult.rows,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error('Intelligence leakage list error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── GET /leakage/funnel — Aggregate funnel counts ───────────────

router.get(
  '/leakage/funnel',
  authenticateJWT,
  requirePermission('intelligence.view'),
  async (req: Request, res: Response) => {
    try {
      const range = (req.query.range as string) || 'last_30d';
      const intervalMap: Record<string, string> = {
        last_24h: '24 hours',
        last_7d: '7 days',
        last_30d: '30 days',
      };
      const interval = intervalMap[range] || '30 days';

      const result = await query(
        `SELECT stage, COUNT(*) AS count
         FROM leakage_events
         WHERE created_at > NOW() - INTERVAL '${interval}'
         GROUP BY stage`
      );

      const funnel: Record<string, number> = { signal: 0, attempt: 0, confirmation: 0, leakage: 0 };
      for (const row of result.rows) {
        funnel[row.stage] = parseInt(row.count, 10);
      }

      res.json({ data: funnel });
    } catch (error) {
      console.error('Intelligence leakage funnel error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── GET /leakage/destinations — Top platform destinations ───────

router.get(
  '/leakage/destinations',
  authenticateJWT,
  requirePermission('intelligence.view'),
  async (req: Request, res: Response) => {
    try {
      const result = await query(
        `SELECT platform_destination AS platform, COUNT(*) AS count
         FROM leakage_events
         WHERE platform_destination IS NOT NULL
         GROUP BY platform_destination
         ORDER BY count DESC
         LIMIT 20`
      );

      res.json({ data: result.rows.map((r) => ({ platform: r.platform, count: parseInt(r.count, 10) })) });
    } catch (error) {
      console.error('Intelligence leakage destinations error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── GET /network/:userId — User relationship graph ──────────────

router.get(
  '/network/:userId',
  authenticateJWT,
  requirePermission('intelligence.view'),
  async (req: Request, res: Response) => {
    try {
      const userId = req.params.userId;
      // Validate UUID format
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
        return res.status(400).json({ error: 'Invalid user ID format' });
      }

      const depth = Math.min(3, Math.max(1, parseInt(req.query.depth as string, 10) || 1));
      const minStrength = parseFloat(req.query.min_strength as string) || 0;

      // BFS to collect nodes up to `depth` hops
      const visitedNodes = new Set<string>();
      const edges: Array<{
        id: string;
        user_a_id: string;
        user_b_id: string;
        relationship_type: string;
        interaction_count: number;
        total_value: number;
        strength_score: number;
      }> = [];
      let frontier = [userId];
      visitedNodes.add(userId);

      for (let d = 0; d < depth && frontier.length > 0; d++) {
        const result = await query(
          `SELECT id, user_a_id, user_b_id, relationship_type, interaction_count,
                  total_value, strength_score
           FROM user_relationships
           WHERE (user_a_id = ANY($1) OR user_b_id = ANY($1))
             AND strength_score >= $2`,
          [frontier, minStrength]
        );

        const nextFrontier: string[] = [];
        for (const row of result.rows) {
          const edgeKey = row.id;
          if (!edges.find((e) => e.id === edgeKey)) {
            edges.push({
              id: row.id,
              user_a_id: row.user_a_id,
              user_b_id: row.user_b_id,
              relationship_type: row.relationship_type,
              interaction_count: parseInt(row.interaction_count, 10),
              total_value: parseFloat(row.total_value),
              strength_score: parseFloat(row.strength_score),
            });
          }

          for (const nodeId of [row.user_a_id, row.user_b_id]) {
            if (!visitedNodes.has(nodeId)) {
              visitedNodes.add(nodeId);
              nextFrontier.push(nodeId);
            }
          }
        }
        frontier = nextFrontier;
      }

      // Fetch node details
      const nodeIds = [...visitedNodes];
      let nodes: Array<{ id: string; display_name: string; user_type: string; status: string; trust_score: number | null }> = [];
      if (nodeIds.length > 0) {
        const nodeResult = await query(
          `SELECT u.id, u.display_name, u.user_type, u.status,
                  rs.score AS trust_score
           FROM users u
           LEFT JOIN LATERAL (
             SELECT score FROM risk_scores WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1
           ) rs ON true
           WHERE u.id = ANY($1)`,
          [nodeIds]
        );
        nodes = nodeResult.rows.map((r) => ({
          id: r.id,
          display_name: r.display_name || 'Unknown',
          user_type: r.user_type || 'unknown',
          status: r.status || 'active',
          trust_score: r.trust_score ? parseFloat(r.trust_score) : null,
        }));
      }

      res.json({ data: { nodes, edges } });
    } catch (error) {
      console.error('Intelligence network error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── GET /network/:userId/clusters — Connected components ────────

router.get(
  '/network/:userId/clusters',
  authenticateJWT,
  requirePermission('intelligence.view'),
  async (req: Request, res: Response) => {
    try {
      const userId = req.params.userId;
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
        return res.status(400).json({ error: 'Invalid user ID format' });
      }

      // BFS: follow all edges from user to find connected component
      const visited = new Set<string>();
      let frontier = [userId];
      visited.add(userId);

      while (frontier.length > 0) {
        const result = await query(
          `SELECT DISTINCT user_a_id, user_b_id
           FROM user_relationships
           WHERE user_a_id = ANY($1) OR user_b_id = ANY($1)`,
          [frontier]
        );

        const nextFrontier: string[] = [];
        for (const row of result.rows) {
          for (const nodeId of [row.user_a_id, row.user_b_id]) {
            if (!visited.has(nodeId)) {
              visited.add(nodeId);
              nextFrontier.push(nodeId);
            }
          }
        }
        frontier = nextFrontier;
      }

      const members = [...visited];

      // Get trust scores and risk status for cluster members
      let avgTrustScore = 0;
      let riskRatio = 0;

      if (members.length > 0) {
        const scoreResult = await query(
          `SELECT rs.user_id, rs.score, rs.tier
           FROM risk_scores rs
           INNER JOIN (
             SELECT user_id, MAX(created_at) AS max_created
             FROM risk_scores
             WHERE user_id = ANY($1)
             GROUP BY user_id
           ) latest ON rs.user_id = latest.user_id AND rs.created_at = latest.max_created`,
          [members]
        );

        if (scoreResult.rows.length > 0) {
          const scores = scoreResult.rows.map((r) => parseFloat(r.score));
          avgTrustScore = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
          const highRiskCount = scoreResult.rows.filter(
            (r) => r.tier === 'high' || r.tier === 'critical'
          ).length;
          riskRatio = Math.round((highRiskCount / members.length) * 1000) / 1000;
        }
      }

      res.json({
        data: {
          cluster_size: members.length,
          members,
          avg_trust_score: avgTrustScore,
          risk_ratio: riskRatio,
        },
      });
    } catch (error) {
      console.error('Intelligence cluster error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── Union-Find data structure for cluster detection ─────────────

class UnionFind {
  parent: Map<string, string> = new Map();
  rank: Map<string, number> = new Map();

  find(x: string): string {
    if (!this.parent.has(x)) {
      this.parent.set(x, x);
      this.rank.set(x, 0);
    }
    if (this.parent.get(x) !== x) {
      this.parent.set(x, this.find(this.parent.get(x)!));
    }
    return this.parent.get(x)!;
  }

  union(x: string, y: string): void {
    const rx = this.find(x);
    const ry = this.find(y);
    if (rx === ry) return;
    const rankX = this.rank.get(rx)!;
    const rankY = this.rank.get(ry)!;
    if (rankX < rankY) {
      this.parent.set(rx, ry);
    } else if (rankX > rankY) {
      this.parent.set(ry, rx);
    } else {
      this.parent.set(ry, rx);
      this.rank.set(rx, rankX + 1);
    }
  }

  getClusters(): Map<string, string[]> {
    const clusters = new Map<string, string[]>();
    for (const node of this.parent.keys()) {
      const root = this.find(node);
      if (!clusters.has(root)) {
        clusters.set(root, []);
      }
      clusters.get(root)!.push(node);
    }
    return clusters;
  }
}

// ─── GET /clusters — All suspicious fraud ring clusters ──────────

router.get(
  '/clusters',
  authenticateJWT,
  requirePermission('intelligence.view'),
  async (req: Request, res: Response) => {
    try {
      const filters = clusterQuerySchema.parse(req.query);
      const minSize = filters.min_size;

      // Fetch all relationship edges
      const edgesResult = await query(
        `SELECT user_a_id, user_b_id, relationship_type
         FROM user_relationships`
      );

      if (edgesResult.rows.length === 0) {
        return res.json({ data: [] });
      }

      // Build connected components using Union-Find
      const uf = new UnionFind();
      const relationshipTypes = new Map<string, Set<string>>();

      for (const row of edgesResult.rows) {
        const a = row.user_a_id;
        const b = row.user_b_id;
        uf.union(a, b);

        // Track relationship types per component
        const root = uf.find(a);
        if (!relationshipTypes.has(root)) {
          relationshipTypes.set(root, new Set());
        }
        relationshipTypes.get(root)!.add(row.relationship_type);
      }

      // Extract clusters with size >= min_size
      const clusters = uf.getClusters();
      const qualifyingClusters: Array<{
        cluster_id: string;
        members: string[];
        cluster_size: number;
      }> = [];

      for (const [root, members] of clusters) {
        if (members.length >= minSize) {
          // Sort members alphabetically to get consistent cluster_id
          const sortedMembers = [...members].sort();
          qualifyingClusters.push({
            cluster_id: sortedMembers[0],
            members: sortedMembers,
            cluster_size: members.length,
          });
        }
      }

      if (qualifyingClusters.length === 0) {
        return res.json({ data: [] });
      }

      // Fetch risk scores for all qualifying cluster members
      const allMembers = qualifyingClusters.flatMap((c) => c.members);
      const scoresResult = await query(
        `SELECT rs.user_id, rs.score, rs.tier
         FROM risk_scores rs
         INNER JOIN (
           SELECT user_id, MAX(created_at) AS max_created
           FROM risk_scores
           WHERE user_id = ANY($1)
           GROUP BY user_id
         ) latest ON rs.user_id = latest.user_id AND rs.created_at = latest.max_created`,
        [allMembers]
      );

      const userScores = new Map<string, { score: number; tier: string }>();
      for (const row of scoresResult.rows) {
        userScores.set(row.user_id, {
          score: parseFloat(row.score),
          tier: row.tier,
        });
      }

      // Compute metrics for each cluster
      const enrichedClusters = qualifyingClusters.map((cluster) => {
        const scores = cluster.members
          .map((uid) => userScores.get(uid)?.score ?? 0)
          .filter((s) => s > 0);

        const avgTrustScore = scores.length > 0
          ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
          : 0;

        const highRiskCount = cluster.members.filter(
          (uid) => {
            const tier = userScores.get(uid)?.tier;
            return tier === 'high' || tier === 'critical';
          }
        ).length;

        const riskRatio = cluster.members.length > 0
          ? Math.round((highRiskCount / cluster.members.length) * 1000) / 1000
          : 0;

        // Risk score formula: avg_trust_score * log2(cluster_size)
        const riskScore = cluster.cluster_size > 1
          ? Math.round(avgTrustScore * Math.log2(cluster.cluster_size) * 10) / 10
          : avgTrustScore;

        // Get relationship types for this cluster
        const root = uf.find(cluster.members[0]);
        const types = relationshipTypes.get(root) || new Set();

        return {
          cluster_id: cluster.cluster_id,
          members: cluster.members,
          cluster_size: cluster.cluster_size,
          avg_trust_score: avgTrustScore,
          risk_ratio: riskRatio,
          risk_score: riskScore,
          relationship_types: [...types],
        };
      });

      // Sort by risk_score DESC and limit to top 50
      enrichedClusters.sort((a, b) => b.risk_score - a.risk_score);
      const topClusters = enrichedClusters.slice(0, 50);

      res.json({ data: topClusters });
    } catch (error) {
      console.error('Intelligence clusters error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── POST /path — Shortest path between two users ────────────────

router.post(
  '/path',
  authenticateJWT,
  requirePermission('intelligence.view'),
  async (req: Request, res: Response) => {
    try {
      const body = pathRequestSchema.parse(req.body);
      const { source_user_id, target_user_id, max_depth } = body;

      // BFS to find shortest path
      const visited = new Set<string>();
      const predecessors = new Map<string, { from: string; edge_id: string; type: string }>();
      let frontier = [source_user_id];
      visited.add(source_user_id);
      let found = false;
      let depth = 0;

      while (frontier.length > 0 && depth < max_depth && !found) {
        const edgesResult = await query(
          `SELECT id, user_a_id, user_b_id, relationship_type
           FROM user_relationships
           WHERE user_a_id = ANY($1) OR user_b_id = ANY($1)`,
          [frontier]
        );

        const nextFrontier: string[] = [];

        for (const row of edgesResult.rows) {
          const { id, user_a_id, user_b_id, relationship_type } = row;

          // Check both directions
          for (const [from, to] of [
            [user_a_id, user_b_id],
            [user_b_id, user_a_id],
          ]) {
            if (frontier.includes(from) && !visited.has(to)) {
              visited.add(to);
              predecessors.set(to, { from, edge_id: id, type: relationship_type });
              nextFrontier.push(to);

              if (to === target_user_id) {
                found = true;
                break;
              }
            }
          }

          if (found) break;
        }

        frontier = nextFrontier;
        depth++;
      }

      if (!found) {
        return res.json({
          data: {
            found: false,
            path: [],
            edges: [],
            path_length: 0,
          },
        });
      }

      // Reconstruct path from target to source
      const path: string[] = [];
      const edges: Array<{ edge_id: string; from: string; to: string; relationship_type: string }> = [];
      let current = target_user_id;

      while (current !== source_user_id) {
        path.unshift(current);
        const pred = predecessors.get(current);
        if (!pred) break; // Should not happen if found=true

        edges.unshift({
          edge_id: pred.edge_id,
          from: pred.from,
          to: current,
          relationship_type: pred.type,
        });
        current = pred.from;
      }
      path.unshift(source_user_id);

      res.json({
        data: {
          found: true,
          path,
          edges,
          path_length: edges.length,
        },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Validation failed', details: error.errors });
      }
      console.error('Intelligence path error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── GET /devices — List user devices ────────────────────────────

router.get(
  '/devices',
  authenticateJWT,
  requirePermission('intelligence.view'),
  async (req: Request, res: Response) => {
    try {
      const filters = deviceQuerySchema.parse(req.query);
      const page = filters.page ?? 1;
      const limit = filters.limit ?? 20;
      const offset = (page - 1) * limit;

      const conditions: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      if (filters.user_id) {
        conditions.push(`d.user_id = $${idx++}`);
        values.push(filters.user_id);
      }
      if (filters.device_hash) {
        conditions.push(`d.device_hash = $${idx++}`);
        values.push(filters.device_hash);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const [dataResult, countResult] = await Promise.all([
        query(
          `SELECT d.*,
                  (SELECT COUNT(DISTINCT user_id) FROM user_devices WHERE device_hash = d.device_hash) AS shared_user_count
           FROM user_devices d
           ${where}
           ORDER BY d.last_seen_at DESC
           LIMIT $${idx++} OFFSET $${idx++}`,
          [...values, limit, offset]
        ),
        query(
          `SELECT COUNT(*) AS total FROM user_devices d ${where}`,
          values
        ),
      ]);

      const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

      res.json({
        data: dataResult.rows.map((r) => ({
          ...r,
          shared_device: parseInt(r.shared_user_count, 10) > 1,
          shared_user_count: parseInt(r.shared_user_count, 10),
        })),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error('Intelligence devices error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── GET /device-clusters — Groups of users sharing devices ─────

router.get(
  '/device-clusters',
  authenticateJWT,
  requirePermission('intelligence.view'),
  async (_req: Request, res: Response) => {
    try {
      const result = await query(
        `SELECT d.device_hash,
                array_agg(DISTINCT d.user_id) AS user_ids,
                COUNT(DISTINCT d.user_id) AS user_count,
                MAX(d.last_seen_at) AS last_seen,
                MAX(d.os) AS os,
                MAX(d.browser) AS browser
         FROM user_devices d
         GROUP BY d.device_hash
         HAVING COUNT(DISTINCT d.user_id) > 1
         ORDER BY user_count DESC
         LIMIT 50`
      );

      res.json({
        data: result.rows.map((r) => ({
          device_hash: r.device_hash,
          user_ids: r.user_ids,
          user_count: parseInt(r.user_count, 10),
          last_seen: r.last_seen,
          os: r.os,
          browser: r.browser,
        })),
      });
    } catch (error) {
      console.error('Intelligence device-clusters error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;

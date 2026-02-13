// QwickServices CIS — Cluster Alert Consumer (Layer 8)
// Fires alerts when a new fraud cluster is detected with >3 high-risk members.

import { DomainEvent, EventType } from '../../events/types';
import { query } from '../../database/connection';
import { createAlert } from '../index';
import { createHash } from 'crypto';

/**
 * Extract user IDs from an event payload.
 * Returns array of [userId] for single-user events or [userA, userB] for relationship events.
 */
function extractUserIds(event: DomainEvent): string[] {
  const payload = event.payload;

  // RELATIONSHIP_UPDATED event
  if (event.type === EventType.RELATIONSHIP_UPDATED) {
    const userA = payload.user_a_id as string;
    const userB = payload.user_b_id as string;
    return [userA, userB].filter(Boolean);
  }

  // USER_REGISTERED or PROVIDER_REGISTERED events
  const userId = (payload.user_id as string) || (payload.provider_id as string);
  return userId ? [userId] : [];
}

/**
 * Check if a cluster alert already exists for this set of members within 48h.
 * Uses a hash of sorted member IDs for deduplication.
 */
async function hasRecentClusterAlert(memberIds: string[]): Promise<boolean> {
  try {
    const sortedIds = [...memberIds].sort();
    const clusterHash = createHash('sha256').update(sortedIds.join(',')).digest('hex').slice(0, 16);

    const result = await query(
      `SELECT id FROM alerts
       WHERE source = 'cluster'
         AND status IN ('open', 'assigned', 'in_progress')
         AND metadata->>'cluster_hash' = $1
         AND created_at >= NOW() - INTERVAL '48 hours'
       LIMIT 1`,
      [clusterHash]
    );
    return result.rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * Find all users in the connected component containing the given userId.
 * Uses BFS to traverse user_relationships graph.
 */
export async function findConnectedComponent(userId: string): Promise<string[]> {
  try {
    const visited = new Set<string>();
    const queue: string[] = [userId];
    visited.add(userId);

    while (queue.length > 0) {
      const current = queue.shift()!;

      // Find all neighbors (both directions due to user_a_id < user_b_id constraint)
      const result = await query(
        `SELECT user_a_id, user_b_id FROM user_relationships
         WHERE user_a_id = $1 OR user_b_id = $1`,
        [current]
      );

      for (const row of result.rows) {
        const neighbor = row.user_a_id === current ? row.user_b_id : row.user_a_id;
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    return Array.from(visited);
  } catch {
    return [userId]; // Fallback to single user on error
  }
}

/**
 * Get the risk tier and score for a user (latest risk_scores record).
 */
async function getUserRiskInfo(userId: string): Promise<{ tier: string; score: number } | null> {
  try {
    const result = await query(
      `SELECT tier, score FROM risk_scores
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) return null;

    return {
      tier: result.rows[0].tier,
      score: parseFloat(result.rows[0].score),
    };
  } catch {
    return null;
  }
}

/**
 * Handle a cluster-forming event by checking for high-risk clusters.
 */
export async function handleClusterCheck(event: DomainEvent): Promise<void> {
  const userIds = extractUserIds(event);
  if (userIds.length === 0) return;

  // Delay to let relationship updates complete
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Find connected components for each user involved
  const components = await Promise.all(
    userIds.map((id) => findConnectedComponent(id))
  );

  // Process the largest unique component
  const componentsBySize = components.sort((a, b) => b.length - a.length);
  const clusterMembers = componentsBySize[0];

  // Ignore small clusters (<=3)
  if (clusterMembers.length <= 3) return;

  // Get risk info for all cluster members
  const riskInfos = await Promise.all(
    clusterMembers.map((id) => getUserRiskInfo(id))
  );

  const validInfos = riskInfos.filter((info) => info !== null) as Array<{ tier: string; score: number }>;
  if (validInfos.length === 0) return;

  // Count high-risk members (high or critical tier)
  const highRiskCount = validInfos.filter(
    (info) => info.tier === 'high' || info.tier === 'critical'
  ).length;

  const riskRatio = highRiskCount / validInfos.length;

  // Only alert if risk ratio > 0.5 (>50% high-risk members)
  if (riskRatio <= 0.5) return;

  // Check for dedup
  const exists = await hasRecentClusterAlert(clusterMembers);
  if (exists) return;

  // Calculate average score
  const avgScore = validInfos.reduce((sum, info) => sum + info.score, 0) / validInfos.length;

  // Create cluster hash for dedup
  const sortedIds = [...clusterMembers].sort();
  const clusterHash = createHash('sha256').update(sortedIds.join(',')).digest('hex').slice(0, 16);

  // Pick a representative user for the alert (highest score)
  const representativeUserId = clusterMembers[0];

  await createAlert({
    user_id: representativeUserId,
    priority: 'critical',
    title: `Suspicious Cluster Detected: ${clusterMembers.length} members, ${Math.round(riskRatio * 100)}% high-risk`,
    description: `A fraud cluster with ${clusterMembers.length} members has been detected. ${highRiskCount} members (${Math.round(riskRatio * 100)}%) are high or critical risk. Average risk score: ${avgScore.toFixed(2)}.`,
    source: 'cluster',
    metadata: {
      cluster_size: clusterMembers.length,
      members: clusterMembers.slice(0, 10), // First 10 members
      risk_ratio: riskRatio,
      avg_score: avgScore,
      cluster_hash: clusterHash,
    },
  });
}

/**
 * Register the cluster alert consumer on the event bus.
 */
export function registerClusterAlertConsumer(): void {
  const { getEventBus } = require('../../events/bus');
  const bus = getEventBus();

  bus.registerConsumer({
    name: 'alerting-cluster',
    eventTypes: [
      EventType.RELATIONSHIP_UPDATED,
      EventType.USER_REGISTERED,
      EventType.PROVIDER_REGISTERED,
    ],
    handler: handleClusterCheck,
  });
}

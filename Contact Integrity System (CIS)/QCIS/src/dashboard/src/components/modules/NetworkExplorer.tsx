'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import * as api from '@/lib/api';
import type { NetworkNode, NetworkEdge, NetworkData } from '@/lib/api';

// ─── Force simulation ──────────────────────────────────────────

interface SimNode extends NetworkNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  connectionCount?: number;
}

function trustScoreColor(score: number | null): string {
  if (score === null) return '#9ca3af';
  if (score >= 70) return '#ef4444';
  if (score >= 40) return '#f59e0b';
  return '#22c55e';
}

function getRiskTier(score: number | null): string {
  if (score === null) return 'unknown';
  if (score >= 75) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

function runForceSimulation(nodes: SimNode[], edges: NetworkEdge[], width = 600, height = 500, iterations = 120): void {
  const repulsion = 2500;
  const attraction = 0.04;
  const damping = 0.88;
  const centerForce = 0.01;

  nodes.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / nodes.length;
    n.x = width / 2 + Math.cos(angle) * 150;
    n.y = height / 2 + Math.sin(angle) * 150;
    n.vx = 0;
    n.vy = 0;
  });

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const force = repulsion / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        nodes[i].vx -= fx;
        nodes[i].vy -= fy;
        nodes[j].vx += fx;
        nodes[j].vy += fy;
      }
    }

    for (const edge of edges) {
      const a = nodeMap.get(edge.user_a_id);
      const b = nodeMap.get(edge.user_b_id);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const force = attraction * dist * edge.strength_score;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }

    for (const node of nodes) {
      node.vx += (width / 2 - node.x) * centerForce;
      node.vy += (height / 2 - node.y) * centerForce;
      node.vx *= damping;
      node.vy *= damping;
      node.x += node.vx;
      node.y += node.vy;
      node.x = Math.max(40, Math.min(width - 40, node.x));
      node.y = Math.max(40, Math.min(height - 40, node.y));
    }
  }
}

// ─── Component ──────────────────────────────────────────────────

export default function NetworkExplorer() {
  const { auth } = useAuth();
  const [userId, setUserId] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [data, setData] = useState<NetworkData | null>(null);
  const [simNodes, setSimNodes] = useState<SimNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<SimNode | null>(null);
  const [depth, setDepth] = useState(2);
  const [minStrength, setMinStrength] = useState(0);
  const [clusterInfo, setClusterInfo] = useState<{ cluster_size: number; avg_trust_score: number; risk_ratio: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const loadGraph = useCallback(async (targetUserId: string) => {
    if (!auth.token || !targetUserId) return;
    setLoading(true);
    setError(null);
    setClusterInfo(null);
    try {
      const res = await api.getUserNetwork(auth.token, targetUserId, depth);
      setData(res.data);

      // Calculate connection count per node
      const connectionCounts = new Map<string, number>();
      res.data.edges.forEach((edge) => {
        connectionCounts.set(edge.user_a_id, (connectionCounts.get(edge.user_a_id) || 0) + 1);
        connectionCounts.set(edge.user_b_id, (connectionCounts.get(edge.user_b_id) || 0) + 1);
      });

      const sNodes: SimNode[] = res.data.nodes.map((n) => ({
        ...n,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        connectionCount: connectionCounts.get(n.id) || 0,
      }));

      if (sNodes.length > 0) {
        runForceSimulation(sNodes, res.data.edges);
      }
      setSimNodes(sNodes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load network');
    } finally {
      setLoading(false);
    }
  }, [auth.token, depth]);

  const loadCluster = useCallback(async (targetUserId: string) => {
    if (!auth.token) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || '/api'}/intelligence/network/${targetUserId}/clusters`,
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      if (res.ok) {
        const body = await res.json();
        setClusterInfo(body.data);
      }
    } catch {
      // Non-fatal
    }
  }, [auth.token]);

  const handleSearch = () => {
    const trimmed = inputValue.trim();
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
      setUserId(trimmed);
      setSelectedNode(null);
      loadGraph(trimmed);
      loadCluster(trimmed);
    } else {
      setError('Please enter a valid UUID');
    }
  };

  const handleNodeClick = (node: SimNode) => {
    setSelectedNode(node);
    if (node.id !== userId) {
      setUserId(node.id);
      setInputValue(node.id);
      loadGraph(node.id);
      loadCluster(node.id);
    }
  };

  const nodeMap = new Map(simNodes.map((n) => [n.id, n]));

  // Stats
  const highRiskNodes = simNodes.filter((n) => n.trust_score !== null && n.trust_score >= 70).length;
  const avgScore = simNodes.length > 0
    ? Math.round(simNodes.reduce((sum, n) => sum + (n.trust_score || 0), 0) / simNodes.length)
    : 0;

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-100 mb-1">Network Explorer</h2>
      <p className="text-sm text-gray-400 dark:text-slate-400 mb-6">Visualize user relationship networks, identify clusters, and assess network risk.</p>

      {/* Controls */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600 p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Enter user UUID or search..."
            className="flex-1 min-w-[280px] text-sm border border-gray-300 dark:border-slate-600 rounded-md px-3 py-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
          <select
            value={depth}
            onChange={(e) => setDepth(parseInt(e.target.value, 10))}
            className="text-sm border border-gray-300 dark:border-slate-600 rounded-md px-3 py-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
          >
            <option value={1}>1-hop</option>
            <option value={2}>2-hop</option>
            <option value={3}>3-hop</option>
          </select>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="text-sm bg-cis-green text-white px-5 py-2 rounded-md hover:bg-cis-green/90 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Explore'}
          </button>
        </div>
        {error && <div className="text-sm text-red-600 dark:text-red-400 mt-2">{error}</div>}
      </div>

      {/* Stats + Graph */}
      {simNodes.length > 0 && data && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          {/* Stats Sidebar */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600 p-4">
              <h3 className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">Network Stats</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-gray-500 dark:text-slate-400">Nodes</dt><dd className="font-medium text-gray-900 dark:text-slate-100">{simNodes.length}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500 dark:text-slate-400">Edges</dt><dd className="font-medium text-gray-900 dark:text-slate-100">{data.edges.length}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500 dark:text-slate-400">High Risk</dt><dd className="font-medium text-red-600 dark:text-red-400">{highRiskNodes}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500 dark:text-slate-400">Avg Score</dt><dd className="font-medium text-gray-900 dark:text-slate-100">{avgScore}</dd></div>
              </dl>
            </div>

            {clusterInfo && (
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600 p-4">
                <h3 className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">Cluster Analysis</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-gray-500 dark:text-slate-400">Cluster Size</dt><dd className="font-medium text-gray-900 dark:text-slate-100">{clusterInfo.cluster_size}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500 dark:text-slate-400">Avg Trust</dt><dd className="font-medium text-gray-900 dark:text-slate-100">{clusterInfo.avg_trust_score}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500 dark:text-slate-400">Risk Ratio</dt><dd className={`font-medium ${clusterInfo.risk_ratio > 0.3 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{(clusterInfo.risk_ratio * 100).toFixed(1)}%</dd></div>
                </dl>
              </div>
            )}

            {selectedNode && (
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600 p-4">
                <h3 className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">Selected Node</h3>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-gray-500 dark:text-slate-400">Name</dt>
                    <dd className="font-medium text-gray-900 dark:text-slate-100">{selectedNode.display_name}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-slate-400">Type</dt>
                    <dd className="font-medium capitalize text-gray-900 dark:text-slate-100">{selectedNode.user_type}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-slate-400">Status</dt>
                    <dd className="font-medium capitalize text-gray-900 dark:text-slate-100">{selectedNode.status}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-slate-400">Trust Score</dt>
                    <dd className="font-medium text-gray-900 dark:text-slate-100">{selectedNode.trust_score ?? 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-slate-400">Risk Tier</dt>
                    <dd className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                      getRiskTier(selectedNode.trust_score) === 'critical'
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        : getRiskTier(selectedNode.trust_score) === 'high'
                        ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                        : getRiskTier(selectedNode.trust_score) === 'medium'
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                        : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    }`}>
                      {getRiskTier(selectedNode.trust_score)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-slate-400">Connections</dt>
                    <dd className="font-medium text-gray-900 dark:text-slate-100">{selectedNode.connectionCount || 0}</dd>
                  </div>
                  <div className="pt-2 border-t border-gray-200 dark:border-slate-600">
                    <dt className="text-gray-400 dark:text-slate-500 text-xs break-all">{selectedNode.id}</dt>
                  </div>
                </dl>
              </div>
            )}
          </div>

          {/* Graph */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600 p-4">
            <div className="relative">
              <svg
                ref={svgRef}
                viewBox="0 0 600 500"
                className="w-full border border-gray-100 dark:border-slate-700 rounded bg-gray-50 dark:bg-slate-900"
                style={{ maxHeight: '500px' }}
              >
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                    markerUnits="strokeWidth"
                  >
                    <path d="M0,0 L0,6 L9,3 z" fill="#9ca3af" />
                  </marker>
                  <marker
                    id="arrowhead-flagged"
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                    markerUnits="strokeWidth"
                  >
                    <path d="M0,0 L0,6 L9,3 z" fill="#f59e0b" />
                  </marker>
                </defs>

                {/* Edges */}
                {data.edges.map((edge) => {
                  const a = nodeMap.get(edge.user_a_id);
                  const b = nodeMap.get(edge.user_b_id);
                  if (!a || !b) return null;
                  const isHovered = hoveredNode === edge.user_a_id || hoveredNode === edge.user_b_id;
                  const isDeviceShared = edge.relationship_type === 'device_shared';
                  const isFlagged = edge.strength_score > 0.7;
                  const strokeWidth = Math.max(1, edge.strength_score * 5);

                  return (
                    <line
                      key={edge.id}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke={isFlagged ? '#f59e0b' : isHovered ? '#6b7280' : '#d1d5db'}
                      strokeWidth={strokeWidth}
                      strokeOpacity={isHovered ? 0.9 : 0.5}
                      strokeDasharray={isDeviceShared ? '4,2' : 'none'}
                      markerEnd={`url(#${isFlagged ? 'arrowhead-flagged' : 'arrowhead'})`}
                    />
                  );
                })}

                {/* Nodes */}
                {simNodes.map((node) => {
                  const isCenter = node.id === userId;
                  const isHovered = node.id === hoveredNode;
                  const isSelected = selectedNode?.id === node.id;
                  const connCount = node.connectionCount || 0;
                  const radius = Math.max(8, Math.min(24, 8 + connCount * 2));
                  const isProvider = node.user_type === 'provider';

                  return (
                    <g key={node.id}>
                      {/* Node circle */}
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={isHovered ? radius + 2 : radius}
                        fill={trustScoreColor(node.trust_score)}
                        stroke={isSelected ? '#7c3aed' : isCenter ? '#1e40af' : isHovered ? '#374151' : '#fff'}
                        strokeWidth={isSelected ? 3 : isCenter ? 3 : 2}
                        strokeDasharray={isProvider ? 'none' : '3,2'}
                        className="cursor-pointer transition-all duration-200"
                        onClick={() => handleNodeClick(node)}
                        onMouseEnter={() => setHoveredNode(node.id)}
                        onMouseLeave={() => setHoveredNode(null)}
                      />
                      {/* Label and risk tier badge */}
                      {(isCenter || isSelected || isHovered) && (
                        <>
                          <text
                            x={node.x}
                            y={node.y + radius + 12}
                            textAnchor="middle"
                            className="text-[10px] fill-gray-700 dark:fill-slate-300 font-medium pointer-events-none"
                          >
                            {node.display_name.length > 20 ? node.display_name.substring(0, 20) + '...' : node.display_name}
                          </text>
                          <text
                            x={node.x}
                            y={node.y + radius + 24}
                            textAnchor="middle"
                            className="text-[8px] fill-gray-500 dark:fill-slate-400 pointer-events-none"
                          >
                            {getRiskTier(node.trust_score).toUpperCase()}
                          </text>
                        </>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Tooltip */}
              {hoveredNode && (() => {
                const node = nodeMap.get(hoveredNode);
                if (!node) return null;
                return (
                  <div
                    className="absolute bg-gray-900 dark:bg-slate-700 text-white text-xs rounded-md px-3 py-2 pointer-events-none shadow-lg z-10"
                    style={{
                      left: `${(node.x / 600) * 100}%`,
                      top: `${(node.y / 500) * 100 - 8}%`,
                      transform: 'translate(-50%, -100%)',
                    }}
                  >
                    <div className="font-medium">{node.display_name}</div>
                    <div className="text-gray-300 dark:text-slate-300">{node.user_type} - {node.status}</div>
                    <div className="text-gray-300 dark:text-slate-300">Trust: {node.trust_score !== null ? node.trust_score : 'N/A'}</div>
                    <div className="text-gray-300 dark:text-slate-300">Connections: {node.connectionCount || 0}</div>
                  </div>
                );
              })()}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-xs text-gray-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Healthy (&lt;40)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Medium (40-69)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> High Risk (70+)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-gray-400 inline-block" /> Unscored
              </span>
              <span className="flex items-center gap-1 border-l border-gray-300 dark:border-slate-600 pl-3">
                <span className="w-4 h-0.5 bg-gray-400 inline-block" /> Normal
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-0.5 bg-amber-500 inline-block" /> Flagged
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-0.5 bg-gray-400 inline-block border-t-2 border-dashed border-gray-400" style={{ borderStyle: 'dashed' }} /> Device Shared
              </span>
              <span className="ml-auto text-gray-700 dark:text-slate-300 font-medium">
                {simNodes.length} nodes, {data.edges.length} edges
              </span>
            </div>
          </div>
        </div>
      )}

      {!loading && simNodes.length === 0 && !userId && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600 p-12 text-center">
          <div className="text-gray-400 dark:text-slate-400 text-sm">Enter a user UUID to explore their relationship network.</div>
          <div className="text-gray-300 dark:text-slate-500 text-xs mt-2">Supports 1-3 hop depth. Click nodes to navigate. Node size reflects connection count.</div>
        </div>
      )}

      {!loading && simNodes.length === 0 && userId && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600 p-12 text-center">
          <div className="text-gray-400 dark:text-slate-400 text-sm">No relationships found for this user.</div>
        </div>
      )}
    </div>
  );
}

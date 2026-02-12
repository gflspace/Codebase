'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import * as api from '@/lib/api';
import type { NetworkNode, NetworkEdge, NetworkData } from '@/lib/api';

// ─── Force simulation types ──────────────────────────────────────

interface SimNode extends NetworkNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

function trustScoreColor(score: number | null): string {
  if (score === null) return '#9ca3af';
  if (score >= 70) return '#ef4444'; // high risk = red
  if (score >= 40) return '#f59e0b'; // medium = amber
  return '#22c55e'; // healthy = green
}

function runForceSimulation(nodes: SimNode[], edges: NetworkEdge[], iterations: number = 100): void {
  const width = 500;
  const height = 400;
  const repulsion = 2000;
  const attraction = 0.05;
  const damping = 0.9;
  const centerForce = 0.01;

  // Initialize positions in a circle
  nodes.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / nodes.length;
    n.x = width / 2 + Math.cos(angle) * 120;
    n.y = height / 2 + Math.sin(angle) * 120;
    n.vx = 0;
    n.vy = 0;
  });

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  for (let iter = 0; iter < iterations; iter++) {
    // Repulsion between all pairs
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

    // Attraction along edges
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

    // Center gravity
    for (const node of nodes) {
      node.vx += (width / 2 - node.x) * centerForce;
      node.vy += (height / 2 - node.y) * centerForce;
    }

    // Apply velocity with damping
    for (const node of nodes) {
      node.vx *= damping;
      node.vy *= damping;
      node.x += node.vx;
      node.y += node.vy;
      // Clamp to bounds
      node.x = Math.max(30, Math.min(width - 30, node.x));
      node.y = Math.max(30, Math.min(height - 30, node.y));
    }
  }
}

export default function NetworkGraph() {
  const { auth } = useAuth();
  const [userId, setUserId] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [data, setData] = useState<NetworkData | null>(null);
  const [simNodes, setSimNodes] = useState<SimNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [depth, setDepth] = useState(1);
  const svgRef = useRef<SVGSVGElement>(null);

  const loadGraph = useCallback(async (targetUserId: string) => {
    if (!auth.token || !targetUserId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getUserNetwork(auth.token, targetUserId, depth);
      setData(res.data);

      // Build simulation nodes
      const sNodes: SimNode[] = res.data.nodes.map((n) => ({
        ...n,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
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

  const handleSearch = () => {
    const trimmed = inputValue.trim();
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
      setUserId(trimmed);
      loadGraph(trimmed);
    } else {
      setError('Please enter a valid UUID');
    }
  };

  const handleNodeClick = (nodeId: string) => {
    setUserId(nodeId);
    setInputValue(nodeId);
    loadGraph(nodeId);
  };

  const nodeMap = new Map(simNodes.map((n) => [n.id, n]));

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Network Graph</h3>
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        {/* Search controls */}
        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Enter user UUID..."
            className="flex-1 text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <select
            value={depth}
            onChange={(e) => setDepth(parseInt(e.target.value, 10))}
            className="text-sm border border-gray-300 rounded-md px-2 py-1.5"
          >
            <option value={1}>Depth 1</option>
            <option value={2}>Depth 2</option>
            <option value={3}>Depth 3</option>
          </select>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Search'}
          </button>
        </div>

        {error && (
          <div className="text-sm text-red-600 mb-3">{error}</div>
        )}

        {/* Graph SVG */}
        {simNodes.length > 0 && data && (
          <div className="relative">
            <svg
              ref={svgRef}
              viewBox="0 0 500 400"
              className="w-full border border-gray-100 rounded bg-gray-50"
              style={{ maxHeight: '400px' }}
            >
              {/* Edges */}
              {data.edges.map((edge) => {
                const a = nodeMap.get(edge.user_a_id);
                const b = nodeMap.get(edge.user_b_id);
                if (!a || !b) return null;
                return (
                  <line
                    key={edge.id}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="#d1d5db"
                    strokeWidth={Math.max(1, edge.strength_score * 4)}
                    strokeOpacity={0.6}
                  />
                );
              })}

              {/* Nodes */}
              {simNodes.map((node) => {
                const isCenter = node.id === userId;
                const isHovered = node.id === hoveredNode;
                const radius = isCenter ? 12 : 8;

                return (
                  <g key={node.id}>
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={isHovered ? radius + 2 : radius}
                      fill={trustScoreColor(node.trust_score)}
                      stroke={isCenter ? '#1e40af' : isHovered ? '#374151' : '#fff'}
                      strokeWidth={isCenter ? 3 : 1.5}
                      className="cursor-pointer transition-all"
                      onClick={() => handleNodeClick(node.id)}
                      onMouseEnter={() => setHoveredNode(node.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                    />
                    {isCenter && (
                      <text
                        x={node.x}
                        y={node.y + radius + 14}
                        textAnchor="middle"
                        className="text-[10px] fill-gray-600 font-medium"
                      >
                        {node.display_name}
                      </text>
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
                  className="absolute bg-gray-900 text-white text-xs rounded-md px-3 py-2 pointer-events-none shadow-lg z-10"
                  style={{
                    left: `${(node.x / 500) * 100}%`,
                    top: `${(node.y / 400) * 100 - 10}%`,
                    transform: 'translate(-50%, -100%)',
                  }}
                >
                  <div className="font-medium">{node.display_name}</div>
                  <div className="text-gray-300">{node.user_type} - {node.status}</div>
                  <div className="text-gray-300">Trust: {node.trust_score !== null ? node.trust_score : 'N/A'}</div>
                </div>
              );
            })()}

            {/* Legend */}
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Healthy
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Medium
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> High Risk
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-gray-400 inline-block" /> Unscored
              </div>
              <span className="ml-auto">{simNodes.length} nodes, {data.edges.length} edges</span>
            </div>
          </div>
        )}

        {!loading && simNodes.length === 0 && userId && (
          <p className="text-sm text-gray-400 text-center py-8">No relationships found for this user.</p>
        )}

        {!userId && (
          <p className="text-sm text-gray-400 text-center py-8">Enter a user UUID above to visualize their network.</p>
        )}
      </div>
    </div>
  );
}

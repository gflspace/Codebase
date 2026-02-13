'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import * as api from '@/lib/api';

interface DecisionPoint {
  timestamp: string;
  allow: number;
  flag: number;
  block: number;
}

interface LatencyData {
  p50: number;
  p95: number;
  p99: number;
  max: number;
  total: number;
}

interface EvaluationStatsData {
  decision_time_series: DecisionPoint[];
  by_action_type: Record<string, { allow: number; flag: number; block: number }>;
  latency: LatencyData;
}

export default function EvaluationStats() {
  const { auth } = useAuth();
  const [data, setData] = useState<EvaluationStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [range, setRange] = useState('last_24h');

  useEffect(() => { loadStats(); }, [auth.token, range]);

  async function loadStats() {
    if (!auth.token) return;
    setLoading(true);
    try {
      const result = await api.getEvaluationStats(auth.token, { range, granularity: 'hourly' });
      setData(result.data);
    } catch (err) {
      console.error('Failed to load evaluation stats:', err);
    } finally {
      setLoading(false);
    }
  }

  const totalEvals = data?.latency.total || 0;
  const totalFlags = data ? Object.values(data.by_action_type).reduce((s, v) => s + v.flag, 0) : 0;
  const totalBlocks = data ? Object.values(data.by_action_type).reduce((s, v) => s + v.block, 0) : 0;
  const flagRate = totalEvals > 0 ? ((totalFlags / totalEvals) * 100).toFixed(1) : '0.0';
  const blockRate = totalEvals > 0 ? ((totalBlocks / totalEvals) * 100).toFixed(1) : '0.0';

  return (
    <div className="mt-6">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-gray-900 mb-3"
      >
        <span className={`transform transition-transform ${collapsed ? '' : 'rotate-90'}`}>&#9654;</span>
        Pre-Transaction Evaluations
      </button>

      {!collapsed && (
        <div className="space-y-4">
          {/* Range selector */}
          <div className="flex gap-2">
            {['last_24h', 'last_7d', 'last_30d'].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 text-xs rounded-md border ${range === r ? 'bg-cis-green text-white border-cis-green' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}
              >
                {r === 'last_24h' ? '24h' : r === 'last_7d' ? '7d' : '30d'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-gray-400 text-center py-8">Loading evaluation stats...</div>
          ) : data ? (
            <>
              {/* KPI tiles */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <p className="text-xs text-gray-400 mb-1">Total Evaluations</p>
                  <p className="text-2xl font-bold text-gray-900">{totalEvals.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <p className="text-xs text-gray-400 mb-1">Flag Rate</p>
                  <p className="text-2xl font-bold text-cis-orange">{flagRate}%</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <p className="text-xs text-gray-400 mb-1">Block Rate</p>
                  <p className="text-2xl font-bold text-cis-red">{blockRate}%</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <p className="text-xs text-gray-400 mb-1">Latency (p95)</p>
                  <p className="text-2xl font-bold text-gray-900">{data.latency.p95}ms</p>
                </div>
              </div>

              {/* Decision time series (stacked bar representation) */}
              {data.decision_time_series.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h4 className="text-xs font-medium text-gray-500 mb-3">Decision Distribution</h4>
                  <div className="flex items-end gap-1 h-24">
                    {data.decision_time_series.map((point, idx) => {
                      const total = point.allow + point.flag + point.block;
                      if (total === 0) return <div key={idx} className="flex-1 bg-gray-100 rounded-t" style={{ height: '2px' }} />;
                      const maxTotal = Math.max(...data.decision_time_series.map(p => p.allow + p.flag + p.block));
                      const height = (total / maxTotal) * 100;
                      const allowPct = (point.allow / total) * 100;
                      const flagPct = (point.flag / total) * 100;
                      return (
                        <div key={idx} className="flex-1 flex flex-col rounded-t overflow-hidden" style={{ height: `${height}%` }} title={`Allow: ${point.allow}, Flag: ${point.flag}, Block: ${point.block}`}>
                          <div className="bg-red-400" style={{ height: `${100 - allowPct - flagPct}%` }} />
                          <div className="bg-amber-400" style={{ height: `${flagPct}%` }} />
                          <div className="bg-emerald-400 flex-1" />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Allow</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Flag</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Block</span>
                  </div>
                </div>
              )}

              {/* Latency card */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="text-xs font-medium text-gray-500 mb-3">Evaluation Latency</h4>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-lg font-mono font-bold text-gray-900">{data.latency.p50}ms</p>
                    <p className="text-xs text-gray-400">p50</p>
                  </div>
                  <div>
                    <p className="text-lg font-mono font-bold text-gray-900">{data.latency.p95}ms</p>
                    <p className="text-xs text-gray-400">p95</p>
                  </div>
                  <div>
                    <p className="text-lg font-mono font-bold text-gray-900">{data.latency.p99}ms</p>
                    <p className="text-xs text-gray-400">p99</p>
                  </div>
                  <div>
                    <p className="text-lg font-mono font-bold text-cis-orange">{data.latency.max}ms</p>
                    <p className="text-xs text-gray-400">max</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-gray-400 text-center py-8">No evaluation data available</div>
          )}
        </div>
      )}
    </div>
  );
}

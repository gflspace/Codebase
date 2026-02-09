'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import * as api from '@/lib/api';

interface RiskScore {
  id: string;
  user_id: string;
  score: number;
  tier: string;
  factors: { operational: number; behavioral: number; network: number };
  trend: string;
  signal_count: number;
  created_at: string;
}

const TIER_COLORS: Record<string, string> = {
  monitor: 'bg-gray-100 text-gray-600',
  low: 'bg-cis-green-soft text-cis-green',
  medium: 'bg-cis-orange-soft text-cis-orange',
  high: 'bg-cis-red-soft text-cis-red',
  critical: 'bg-red-100 text-red-800',
};

const TREND_ARROWS: Record<string, string> = {
  stable: '\u2192',
  escalating: '\u2191',
  decaying: '\u2193',
};

export default function RiskTrends() {
  const { auth } = useAuth();
  const [scores, setScores] = useState<RiskScore[]>([]);
  const [tierFilter, setTierFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadScores(); }, [tierFilter, auth.token]);

  async function loadScores() {
    if (!auth.token) return;
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: '50' };
      if (tierFilter) params.tier = tierFilter;
      const result = await api.getRiskScores(auth.token, params);
      setScores(result.data as RiskScore[]);
    } catch (err) {
      console.error('Failed to load risk scores:', err);
    } finally {
      setLoading(false);
    }
  }

  // Simple tier distribution
  const distribution = scores.reduce<Record<string, number>>((acc, s) => {
    acc[s.tier] = (acc[s.tier] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Risk & Trends</h2>

      {/* Distribution cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {['monitor', 'low', 'medium', 'high', 'critical'].map((tier) => (
          <button
            key={tier}
            onClick={() => setTierFilter(tierFilter === tier ? '' : tier)}
            className={`p-4 rounded-lg border text-center transition-colors ${
              tierFilter === tier ? 'border-cis-green ring-2 ring-cis-green' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-2xl font-bold text-gray-900">{distribution[tier] || 0}</div>
            <div className={`text-xs font-medium mt-1 px-2 py-0.5 rounded inline-block ${TIER_COLORS[tier]}`}>
              {tier}
            </div>
          </button>
        ))}
      </div>

      {/* Scores table */}
      {loading ? (
        <div className="text-gray-400 text-center py-8">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">User</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Score</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Tier</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Trend</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Factors (O/B/N)</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Signals</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {scores.map((score) => (
                <tr key={score.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{score.user_id.slice(0, 8)}...</td>
                  <td className="px-4 py-3 font-mono font-bold">{score.score}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${TIER_COLORS[score.tier]}`}>
                      {score.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-lg ${
                      score.trend === 'escalating' ? 'text-cis-red' :
                      score.trend === 'decaying' ? 'text-cis-green' : 'text-gray-400'
                    }`}>
                      {TREND_ARROWS[score.trend] || '-'}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">{score.trend}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {score.factors.operational}/{score.factors.behavioral}/{score.factors.network}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{score.signal_count}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(score.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

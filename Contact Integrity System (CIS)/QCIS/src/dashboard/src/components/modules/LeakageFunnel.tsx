'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useDashboardFilters } from '@/contexts/DashboardFilterContext';
import { getLeakageFunnelStats, LeakageFunnelData } from '@/lib/api';

const STAGE_LABELS: Record<string, string> = {
  signal: 'Signals Detected',
  attempt: 'Contact Attempts',
  confirmation: 'Confirmed Exchange',
  leakage: 'Off-Platform Activity',
};

const STAGE_COLORS: Record<string, string> = {
  signal: '#3b82f6',     // blue
  attempt: '#f59e0b',    // amber
  confirmation: '#ef4444', // red
  leakage: '#991b1b',    // dark red
};

const PLATFORM_COLORS: Record<string, string> = {
  whatsapp: '#25d366',
  telegram: '#0088cc',
  phone: '#6b7280',
  email: '#f59e0b',
  unknown: '#9ca3af',
};

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export default function LeakageFunnel() {
  const { auth } = useAuth();
  const { filterParams } = useDashboardFilters();
  const [data, setData] = useState<LeakageFunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!auth.token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getLeakageFunnelStats(auth.token, filterParams);
      setData(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leakage data');
    } finally {
      setLoading(false);
    }
  }, [auth.token, filterParams]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Leakage Funnel</h2>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Leakage Funnel</h2>
        <div className="bg-red-50 text-red-700 p-3 rounded text-sm">{error}</div>
      </div>
    );
  }

  if (!data) return null;

  const stages = ['signal', 'attempt', 'confirmation', 'leakage'];
  const maxCount = Math.max(...stages.map((s) => data.funnel[s] || 0), 1);
  const totalDestinations = data.destinations.reduce((sum, d) => sum + d.count, 0) || 1;

  // Calculate conversion rates
  const conversionRates = stages.slice(1).map((stage, i) => {
    const prev = data.funnel[stages[i]] || 0;
    const curr = data.funnel[stage] || 0;
    return prev > 0 ? ((curr / prev) * 100).toFixed(1) : '0.0';
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Leakage Funnel</h2>
          <p className="text-sm text-gray-400 mt-1">Off-platform activity tracking and revenue impact analysis.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">Total Signals</p>
          <p className="text-2xl font-bold text-blue-600">{data.funnel.signal || 0}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">Confirmed Leakages</p>
          <p className="text-2xl font-bold text-red-600">{data.revenue.confirmed_leakages}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">Revenue Impact</p>
          <p className="text-2xl font-bold text-red-700">{formatCurrency(data.revenue.total_loss)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">Avg Loss / Leakage</p>
          <p className="text-2xl font-bold text-amber-600">{formatCurrency(data.revenue.avg_loss)}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Funnel Chart */}
        <div className="col-span-2 bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Leakage Funnel</h3>
          <div className="space-y-3">
            {stages.map((stage, i) => {
              const count = data.funnel[stage] || 0;
              const widthPct = Math.max(5, (count / maxCount) * 100);
              return (
                <div key={stage}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">{STAGE_LABELS[stage]}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{count}</span>
                      {i > 0 && (
                        <span className="text-xs text-gray-400">({conversionRates[i - 1]}%)</span>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-6">
                    <div
                      className="h-6 rounded-full transition-all duration-500"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: STAGE_COLORS[stage],
                        minWidth: count > 0 ? '24px' : '0',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Destination Pie Chart */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Top Destinations</h3>
          {data.destinations.length === 0 ? (
            <p className="text-xs text-gray-400">No destination data</p>
          ) : (
            <div className="space-y-2">
              {data.destinations.map((d) => {
                const pct = ((d.count / totalDestinations) * 100).toFixed(0);
                const color = PLATFORM_COLORS[d.platform.toLowerCase()] || PLATFORM_COLORS.unknown;
                return (
                  <div key={d.platform} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-xs text-gray-600 flex-1 capitalize">{d.platform}</span>
                    <span className="text-xs font-medium">{d.count}</span>
                    <span className="text-xs text-gray-400 w-10 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Velocity Chart */}
      {data.velocity.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Daily Leakage Velocity (30 days)</h3>
          <svg viewBox={`0 0 ${data.velocity.length * 20 + 40} 120`} className="w-full h-32">
            {data.velocity.map((v, i) => {
              const maxV = Math.max(...data.velocity.map((d) => d.count), 1);
              const height = (v.count / maxV) * 90;
              const leakageHeight = (v.leakage_count / maxV) * 90;
              return (
                <g key={i}>
                  <rect
                    x={i * 20 + 20}
                    y={100 - height}
                    width={14}
                    height={height}
                    fill="#93c5fd"
                    rx={2}
                  />
                  <rect
                    x={i * 20 + 20}
                    y={100 - leakageHeight}
                    width={14}
                    height={leakageHeight}
                    fill="#ef4444"
                    rx={2}
                  />
                </g>
              );
            })}
            <line x1="20" y1="100" x2={data.velocity.length * 20 + 20} y2="100" stroke="#e5e7eb" strokeWidth="1" />
          </svg>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-300" />
              <span>All signals</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span>Confirmed leakage</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

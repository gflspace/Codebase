'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useDashboardFilters } from '@/contexts/DashboardFilterContext';
import { getLeakageFunnelStats, LeakageFunnelStatsData } from '@/lib/api';

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

type TimeRange = '7d' | '30d' | '90d';

export default function LeakageFunnel() {
  const { auth } = useAuth();
  const { filterParams } = useDashboardFilters();
  const [data, setData] = useState<LeakageFunnelStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);
  const [totalRevenue] = useState(1_500_000);

  const load = useCallback(async () => {
    if (!auth.token) return;
    setLoading(true);
    setError(null);
    try {
      const params = { ...filterParams, time_range: timeRange };
      const res = await getLeakageFunnelStats(auth.token, params);
      setData(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leakage data');
    } finally {
      setLoading(false);
    }
  }, [auth.token, filterParams, timeRange]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Leakage Funnel</h2>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-100 dark:bg-slate-700 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Leakage Funnel</h2>
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-3 rounded text-sm">{error}</div>
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

  // Revenue impact percentage
  const revenueImpactPct = totalRevenue > 0 ? (data.revenue.total_loss / totalRevenue) * 100 : 0;
  const revenueImpactColor = revenueImpactPct > 5 ? 'text-red-600 dark:text-red-400' : revenueImpactPct > 1 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-100">Leakage Funnel</h2>
          <p className="text-sm text-gray-400 dark:text-slate-400 mt-1">Off-platform activity tracking and revenue impact analysis.</p>
        </div>
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                timeRange === range
                  ? 'bg-cis-green text-white'
                  : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg p-4">
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Total Signals</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{data.funnel.signal || 0}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg p-4">
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Confirmed Leakages</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{data.revenue.confirmed_leakages}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg p-4">
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Revenue Impact</p>
          <p className="text-2xl font-bold text-red-700 dark:text-red-400">{formatCurrency(data.revenue.total_loss)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg p-4">
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Avg Loss / Leakage</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(data.revenue.avg_loss)}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Visual Funnel Chart */}
        <div className="col-span-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-4">Leakage Funnel</h3>
          <div className="relative">
            <svg viewBox="0 0 400 320" className="w-full h-80">
              <defs>
                <linearGradient id="signal-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.7" />
                </linearGradient>
                <linearGradient id="attempt-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.7" />
                </linearGradient>
                <linearGradient id="confirmation-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.7" />
                </linearGradient>
                <linearGradient id="leakage-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#991b1b" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#991b1b" stopOpacity="0.7" />
                </linearGradient>
              </defs>
              {stages.map((stage, i) => {
                const count = data.funnel[stage] || 0;
                const topWidth = maxCount > 0 ? (count / maxCount) * 300 : 0;
                const nextCount = i < stages.length - 1 ? (data.funnel[stages[i + 1]] || 0) : count;
                const bottomWidth = maxCount > 0 ? (nextCount / maxCount) * 300 : 0;
                const centerX = 200;
                const y = i * 70 + 10;
                const height = 60;

                const topLeft = centerX - topWidth / 2;
                const topRight = centerX + topWidth / 2;
                const bottomLeft = centerX - bottomWidth / 2;
                const bottomRight = centerX + bottomWidth / 2;

                const path = `M ${topLeft} ${y} L ${topRight} ${y} L ${bottomRight} ${y + height} L ${bottomLeft} ${y + height} Z`;

                const isHovered = hoveredStage === stage;

                return (
                  <g key={stage} className="transition-opacity duration-200" opacity={isHovered ? 1 : 0.95}>
                    <path
                      d={path}
                      fill={`url(#${stage}-gradient)`}
                      stroke={STAGE_COLORS[stage]}
                      strokeWidth={isHovered ? 2 : 1}
                      className="cursor-pointer transition-all duration-200"
                      onMouseEnter={() => setHoveredStage(stage)}
                      onMouseLeave={() => setHoveredStage(null)}
                    />
                    <text
                      x={centerX}
                      y={y + height / 2 - 8}
                      textAnchor="middle"
                      className="text-xs font-semibold pointer-events-none fill-white"
                    >
                      {STAGE_LABELS[stage]}
                    </text>
                    <text
                      x={centerX}
                      y={y + height / 2 + 8}
                      textAnchor="middle"
                      className="text-lg font-bold pointer-events-none fill-white"
                    >
                      {count.toLocaleString()}
                    </text>
                    {i > 0 && (
                      <text
                        x={centerX}
                        y={y + height / 2 + 24}
                        textAnchor="middle"
                        className="text-xs pointer-events-none fill-white opacity-80"
                      >
                        {conversionRates[i - 1]}% conversion
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
            {hoveredStage && (
              <div className="absolute top-2 right-2 bg-gray-900 dark:bg-slate-700 text-white text-xs rounded-md px-3 py-2 shadow-lg pointer-events-none">
                <div className="font-medium">{STAGE_LABELS[hoveredStage]}</div>
                <div className="text-gray-300 dark:text-slate-300">Count: {(data.funnel[hoveredStage] || 0).toLocaleString()}</div>
                {stages.indexOf(hoveredStage) > 0 && (
                  <div className="text-gray-300 dark:text-slate-300">
                    {conversionRates[stages.indexOf(hoveredStage) - 1]}% from previous
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Platform Breakdown - Horizontal Bar Chart */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-4">Platform Distribution</h3>
          {data.destinations.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-slate-500">No destination data</p>
          ) : (
            <div className="space-y-3">
              {data.destinations.map((d) => {
                const pct = ((d.count / totalDestinations) * 100).toFixed(1);
                const color = PLATFORM_COLORS[d.platform.toLowerCase()] || PLATFORM_COLORS.unknown;
                return (
                  <div key={d.platform}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700 dark:text-slate-300 capitalize">{d.platform}</span>
                      <span className="text-xs text-gray-500 dark:text-slate-400">{d.count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-4">
                      <div
                        className="h-4 rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: color,
                          minWidth: d.count > 0 ? '20px' : '0',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Revenue Impact Card */}
      <div className={`bg-white dark:bg-slate-800 border rounded-lg p-6 ${
        revenueImpactPct > 5
          ? 'border-red-300 dark:border-red-700'
          : revenueImpactPct > 1
          ? 'border-amber-300 dark:border-amber-700'
          : 'border-green-300 dark:border-green-700'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">Revenue at Risk</h3>
            <p className={`text-4xl font-bold ${revenueImpactColor}`}>
              {formatCurrency(data.revenue.total_loss)}
            </p>
            <p className="text-sm text-gray-600 dark:text-slate-400 mt-2">
              {revenueImpactPct.toFixed(2)}% of total platform revenue ({formatCurrency(totalRevenue)})
            </p>
          </div>
          <div className="text-right">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
              revenueImpactPct > 5
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                : revenueImpactPct > 1
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
            }`}>
              {revenueImpactPct > 5 ? 'High Risk' : revenueImpactPct > 1 ? 'Medium Risk' : 'Low Risk'}
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
              {data.revenue.confirmed_leakages} confirmed leakages
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Avg {formatCurrency(data.revenue.avg_loss)} per leakage
            </p>
          </div>
        </div>
      </div>

      {/* Velocity Chart */}
      {data.velocity.length > 0 && (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-4">Daily Leakage Velocity ({timeRange})</h3>
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
            <line x1="20" y1="100" x2={data.velocity.length * 20 + 20} y2="100" stroke="#e5e7eb" strokeWidth="1" className="dark:stroke-slate-600" />
          </svg>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-slate-400">
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

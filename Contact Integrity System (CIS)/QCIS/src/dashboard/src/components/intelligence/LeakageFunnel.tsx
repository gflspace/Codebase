'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useDashboardFilters } from '@/contexts/DashboardFilterContext';
import * as api from '@/lib/api';
import type { LeakageFunnelData, LeakageDestination } from '@/lib/api';

const STAGES: Array<{ key: keyof LeakageFunnelData; label: string; color: string }> = [
  { key: 'signal', label: 'Signal', color: '#3b82f6' },
  { key: 'attempt', label: 'Attempt', color: '#f59e0b' },
  { key: 'confirmation', label: 'Confirmation', color: '#ef4444' },
  { key: 'leakage', label: 'Leakage', color: '#991b1b' },
];

function FunnelBar({ value, maxValue, color, label }: { value: number; maxValue: number; color: string; label: string }) {
  const width = maxValue > 0 ? Math.max(8, (value / maxValue) * 100) : 8;
  return (
    <div className="flex items-center gap-3 mb-2">
      <span className="text-xs font-medium text-gray-500 w-24 text-right">{label}</span>
      <div className="flex-1 h-7 bg-gray-100 rounded-md overflow-hidden">
        <div
          className="h-full rounded-md flex items-center px-2 transition-all duration-500"
          style={{ width: `${width}%`, backgroundColor: color }}
        >
          <span className="text-xs font-bold text-white drop-shadow">{value}</span>
        </div>
      </div>
    </div>
  );
}

function ConversionRate({ from, to }: { from: number; to: number }) {
  if (from === 0) return <span className="text-xs text-gray-300 ml-24 pl-1">--</span>;
  const rate = Math.round((to / from) * 100);
  return (
    <div className="ml-24 pl-1 mb-1">
      <span className="text-[10px] text-gray-400">{rate}% conversion</span>
    </div>
  );
}

interface RevenueTrend { period: string; amount: number }

const TIME_RANGES = ['30d', '60d', '90d'] as const;

export default function LeakageFunnel() {
  const { auth } = useAuth();
  const { filterParams } = useDashboardFilters();
  const [funnel, setFunnel] = useState<LeakageFunnelData | null>(null);
  const [destinations, setDestinations] = useState<LeakageDestination[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrend[]>([]);
  const [estimatedLoss, setEstimatedLoss] = useState<number>(0);
  const [trendRange, setTrendRange] = useState<typeof TIME_RANGES[number]>('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!auth.token) return;
      setLoading(true);
      setError(null);
      try {
        const [funnelRes, destRes] = await Promise.all([
          api.getLeakageFunnel(auth.token, filterParams),
          api.getLeakageDestinations(auth.token),
        ]);
        if (!cancelled) {
          setFunnel(funnelRes.data);
          setDestinations(destRes.data);

          // Calculate estimated revenue loss from leakage events
          try {
            const lossRes = await api.fetchWithAuth(auth.token, `/api/intelligence/leakage?limit=200`);
            const lossData = await lossRes.json();
            const events = lossData.data || [];
            const totalLoss = events.reduce((sum: number, e: Record<string, unknown>) => {
              return sum + (Number(e.estimated_revenue_loss) || 0);
            }, 0);
            if (!cancelled) {
              setEstimatedLoss(totalLoss);
              // Build trend buckets by week
              const buckets: Record<string, number> = {};
              for (const e of events) {
                const week = new Date(String(e.created_at)).toISOString().slice(0, 10);
                buckets[week] = (buckets[week] || 0) + (Number(e.estimated_revenue_loss) || 0);
              }
              setRevenueTrend(
                Object.entries(buckets)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([period, amount]) => ({ period, amount }))
              );
            }
          } catch {
            // Revenue data is supplementary — failure is non-blocking
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load leakage funnel');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [auth.token, filterParams]);

  if (error) {
    return (
      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        Leakage funnel failed: {error}
      </div>
    );
  }

  if (loading && !funnel) {
    return (
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Leakage Funnel</h3>
        <div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
          <div className="space-y-3">
            {STAGES.map((s) => (
              <div key={s.key} className="h-7 bg-gray-100 rounded-md" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!funnel) return null;

  const maxValue = Math.max(...STAGES.map((s) => funnel[s.key]), 1);

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Leakage Funnel</h3>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Funnel chart */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-4">
          {STAGES.map((stage, i) => (
            <div key={stage.key}>
              <FunnelBar value={funnel[stage.key]} maxValue={maxValue} color={stage.color} label={stage.label} />
              {i < STAGES.length - 1 && (
                <ConversionRate from={funnel[STAGES[i].key]} to={funnel[STAGES[i + 1].key]} />
              )}
            </div>
          ))}
        </div>

        {/* Revenue at Risk + Top destinations */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-4">
          {/* Estimated Revenue Loss */}
          <div>
            <h4 className="text-xs font-medium text-gray-500 mb-2">Estimated Revenue at Risk</h4>
            <div className="text-2xl font-bold text-red-600">
              ${estimatedLoss.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            {/* Trend range selector */}
            <div className="flex gap-1 mt-2">
              {TIME_RANGES.map((range) => (
                <button
                  key={range}
                  onClick={() => setTrendRange(range)}
                  className={`text-[10px] px-2 py-0.5 rounded ${
                    trendRange === range ? 'bg-red-100 text-red-700 font-medium' : 'bg-gray-50 text-gray-400'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
            {/* Mini trend bars */}
            {revenueTrend.length > 0 && (
              <div className="flex items-end gap-px mt-2 h-10">
                {revenueTrend.slice(-14).map((t, i) => {
                  const maxAmt = Math.max(...revenueTrend.map((x) => x.amount), 1);
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-red-300 rounded-t"
                      style={{ height: `${Math.max(2, (t.amount / maxAmt) * 100)}%` }}
                      title={`${t.period}: $${t.amount}`}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Top Destinations */}
          <div>
          <h4 className="text-xs font-medium text-gray-500 mb-3">Top Destinations</h4>
          {destinations.length === 0 ? (
            <p className="text-xs text-gray-400">No destination data yet</p>
          ) : (
            <div className="space-y-2">
              {destinations.slice(0, 8).map((d) => {
                const maxDest = Math.max(...destinations.map((x) => x.count), 1);
                return (
                  <div key={d.platform} className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-28 truncate">{d.platform}</span>
                    <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
                      <div
                        className="h-full bg-red-400 rounded"
                        style={{ width: `${(d.count / maxDest) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-gray-700 w-8 text-right">{d.count}</span>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

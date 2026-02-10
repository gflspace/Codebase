'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useDashboardFilters } from '@/contexts/DashboardFilterContext';
import * as api from '@/lib/api';
import type { TimelinePoint } from '@/lib/api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const LAYERS = [
  { key: 'messages', label: 'Messages', color: '#3B82F6' },
  { key: 'transactions_initiated', label: 'Tx Initiated', color: '#8B5CF6' },
  { key: 'transactions_completed', label: 'Tx Completed', color: '#10B981' },
  { key: 'risk_signals', label: 'Risk Signals', color: '#EF4444' },
  { key: 'enforcement_actions', label: 'Enforcements', color: '#F59E0B' },
] as const;

type LayerKey = typeof LAYERS[number]['key'];

function formatTimestamp(ts: string, granularity: string): string {
  const d = new Date(ts);
  if (granularity === 'hourly') {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  if (granularity === 'weekly') {
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ActivityTimeline() {
  const { auth } = useAuth();
  const { filters, filterParams } = useDashboardFilters();
  const [data, setData] = useState<TimelinePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleLayers, setVisibleLayers] = useState<Set<LayerKey>>(
    new Set(['messages', 'risk_signals', 'enforcement_actions'])
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!auth.token) return;
      setLoading(true);
      setError(null);
      try {
        const result = await api.getTimelineStats(auth.token, filterParams);
        if (!cancelled) setData(result.data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load timeline');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [auth.token, filterParams]);

  function toggleLayer(key: LayerKey) {
    setVisibleLayers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (error) {
    return (
      <div className="mb-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          Failed to load activity timeline. <button onClick={() => setLoading(true)} className="underline ml-1">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h3 className="text-sm font-medium text-gray-700">Activity Timeline</h3>
            <p className="text-xs text-gray-400">When does behavior happen? Spot spikes and anomalies.</p>
          </div>
        </div>

        {/* Layer toggles */}
        <div className="flex flex-wrap gap-2 my-3">
          {LAYERS.map((layer) => (
            <button
              key={layer.key}
              onClick={() => toggleLayer(layer.key)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 border ${
                visibleLayers.has(layer.key)
                  ? 'border-transparent text-white'
                  : 'border-gray-200 text-gray-400 bg-white'
              }`}
              style={visibleLayers.has(layer.key) ? { backgroundColor: layer.color } : {}}
            >
              {layer.label}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className={`transition-opacity duration-200 ${loading && data.length > 0 ? 'opacity-50' : ''}`}>
          {loading && data.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">Loading timeline...</div>
          ) : data.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">No activity data for this period.</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(ts: string) => formatTimestamp(ts, filters.granularity)}
                  stroke="#9CA3AF"
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}
                  labelFormatter={(ts: string) => new Date(ts).toLocaleString()}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  onClick={(e) => {
                    if (e.dataKey) toggleLayer(e.dataKey as LayerKey);
                  }}
                />
                {LAYERS.map((layer) =>
                  visibleLayers.has(layer.key) ? (
                    <Area
                      key={layer.key}
                      type="monotone"
                      dataKey={layer.key}
                      name={layer.label}
                      stroke={layer.color}
                      fill={layer.color}
                      fillOpacity={0.1}
                      strokeWidth={2}
                      dot={false}
                      animationDuration={300}
                    />
                  ) : null
                )}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

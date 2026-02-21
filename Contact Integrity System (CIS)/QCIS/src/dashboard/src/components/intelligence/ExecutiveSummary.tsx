'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useDashboardFilters } from '@/contexts/DashboardFilterContext';
import * as api from '@/lib/api';
import type { KPIData, PlatformHealthSummary } from '@/lib/api';
import KPITile from './KPITile';

const KPI_LABELS: Record<keyof KPIData, string> = {
  active_users: 'Active Users',
  active_providers: 'Active Providers',
  messages_sent: 'Messages Sent',
  transactions_completed: 'Tx Completed',
  off_platform_signals: 'Off-Platform Signals',
  failed_transactions: 'Failed Transactions',
  open_alerts: 'Open Alerts',
  trust_score_index: 'Trust Score Index',
};

const KPI_ORDER: (keyof KPIData)[] = [
  'active_users',
  'active_providers',
  'messages_sent',
  'transactions_completed',
  'off_platform_signals',
  'failed_transactions',
  'open_alerts',
  'trust_score_index',
];

function AIHealthNarrative() {
  const { auth } = useAuth();
  const { filterParams } = useDashboardFilters();
  const [health, setHealth] = useState<PlatformHealthSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function load() {
    if (!auth.token) return;
    setLoading(true);
    try {
      const result = await api.getPlatformHealthSummary(auth.token, { range: filterParams.range });
      setHealth(result.data);
    } catch {
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }

  const HEALTH_COLORS: Record<string, string> = {
    healthy: 'bg-green-50 border-green-200 text-green-800',
    degraded: 'bg-amber-50 border-amber-200 text-amber-800',
    critical: 'bg-red-50 border-red-200 text-red-800',
  };

  const HEALTH_BADGE: Record<string, string> = {
    healthy: 'bg-green-100 text-green-700',
    degraded: 'bg-amber-100 text-amber-700',
    critical: 'bg-red-100 text-red-700',
  };

  return (
    <div className="mt-3">
      {!health && !loading && (
        <button
          onClick={load}
          className="px-3 py-1.5 text-xs bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors"
        >
          Generate AI Health Summary
        </button>
      )}
      {loading && (
        <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 animate-pulse">
          <div className="h-3 bg-purple-100 rounded w-40 mb-2" />
          <div className="h-3 bg-purple-100 rounded w-64" />
        </div>
      )}
      {health && (
        <div className={`rounded-lg border p-4 ${HEALTH_COLORS[health.health_status] || HEALTH_COLORS.healthy}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">AI Health Assessment</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${HEALTH_BADGE[health.health_status] || HEALTH_BADGE.healthy}`}>
                {health.health_status}
              </span>
            </div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              {expanded ? 'Collapse' : 'Expand'}
            </button>
          </div>
          <p className="text-sm mb-2">{health.narrative}</p>
          {expanded && (
            <>
              {health.key_concerns.length > 0 && (
                <div className="mb-2">
                  <span className="text-xs font-medium">Key Concerns:</span>
                  <ul className="list-disc list-inside text-xs mt-1 space-y-0.5">
                    {health.key_concerns.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              )}
              {health.recommended_actions.length > 0 && (
                <div>
                  <span className="text-xs font-medium">Recommended Actions:</span>
                  <ul className="list-disc list-inside text-xs mt-1 space-y-0.5">
                    {health.recommended_actions.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function ExecutiveSummary() {
  const { auth } = useAuth();
  const { filterParams } = useDashboardFilters();
  const [data, setData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!auth.token) return;
      setLoading(true);
      setError(null);
      try {
        const result = await api.getKPIStats(auth.token, filterParams);
        if (!cancelled) setData(result.data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load KPIs');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [auth.token, filterParams, retryKey]);

  if (error) {
    return (
      <div className="mb-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          Failed to load executive summary. <button onClick={() => setRetryKey((k) => k + 1)} className="underline ml-1">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h3 className="text-sm font-medium text-gray-500 mb-3">Executive Summary</h3>
      <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 transition-opacity duration-200 ${loading && data ? 'opacity-50' : ''}`}>
        {loading && !data ? (
          // Skeleton placeholders
          KPI_ORDER.map((key) => (
            <div key={key} className="bg-white rounded-lg border border-gray-200 border-l-4 border-l-gray-200 p-4 animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-20 mb-2" />
              <div className="h-7 bg-gray-200 rounded w-16" />
            </div>
          ))
        ) : data ? (
          KPI_ORDER.map((key) => (
            <KPITile key={key} label={KPI_LABELS[key]} metric={data[key]} />
          ))
        ) : null}
      </div>
      <AIHealthNarrative />
    </div>
  );
}

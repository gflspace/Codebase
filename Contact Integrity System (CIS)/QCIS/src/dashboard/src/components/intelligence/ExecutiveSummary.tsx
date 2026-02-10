'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useDashboardFilters } from '@/contexts/DashboardFilterContext';
import * as api from '@/lib/api';
import type { KPIData } from '@/lib/api';
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

export default function ExecutiveSummary() {
  const { auth } = useAuth();
  const { filterParams } = useDashboardFilters();
  const [data, setData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  }, [auth.token, filterParams]);

  if (error) {
    return (
      <div className="mb-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          Failed to load executive summary. <button onClick={() => setLoading(true)} className="underline ml-1">Retry</button>
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
    </div>
  );
}

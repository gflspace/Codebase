'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import * as api from '@/lib/api';

interface CorrelationCluster {
  user_id: string;
  counterparty_id: string;
  correlation_type: string;
  user_name: string | null;
  counterparty_name: string | null;
  signal_count: number;
  avg_confidence: number;
  first_seen: string;
  last_seen: string;
  total_booking_value: number;
}

function severityColor(signalCount: number): string {
  if (signalCount >= 5) return 'border-red-400 bg-red-50';
  if (signalCount >= 3) return 'border-amber-400 bg-amber-50';
  return 'border-blue-300 bg-blue-50';
}

function severityBadge(signalCount: number): string {
  if (signalCount >= 5) return 'Critical';
  if (signalCount >= 3) return 'High';
  return 'Medium';
}

function severityBadgeColor(signalCount: number): string {
  if (signalCount >= 5) return 'bg-red-100 text-red-700';
  if (signalCount >= 3) return 'bg-amber-100 text-amber-700';
  return 'bg-blue-100 text-blue-700';
}

export default function CancellationClusters() {
  const { auth } = useAuth();
  const [clusters, setClusters] = useState<CorrelationCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!auth.token) return;
      setLoading(true);
      setError(null);
      try {
        const res = await api.fetchWithAuth(auth.token, '/api/correlations/clusters?type=contact_then_cancel&limit=50');
        const data = await res.json();
        if (!cancelled) {
          setClusters(data.data || []);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load cancellation clusters');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [auth.token]);

  if (error) {
    return (
      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        Cancellation clusters failed: {error}
      </div>
    );
  }

  if (loading && clusters.length === 0) {
    return (
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Cancellation Clusters</h3>
        <div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-md" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Cancellation Clusters
        {clusters.length > 0 && (
          <span className="ml-2 text-xs font-normal text-gray-400">({clusters.length} pairs)</span>
        )}
      </h3>

      {clusters.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
          <p className="text-sm text-gray-400">No cancellation-after-contact clusters detected</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {clusters.map((cluster) => {
            const timeRange = cluster.first_seen !== cluster.last_seen
              ? `${new Date(cluster.first_seen).toLocaleDateString()} - ${new Date(cluster.last_seen).toLocaleDateString()}`
              : new Date(cluster.first_seen).toLocaleDateString();

            return (
              <div
                key={`${cluster.user_id}-${cluster.counterparty_id}`}
                className={`rounded-lg border-l-4 p-3 ${severityColor(cluster.signal_count)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="text-xs">
                    <div className="font-medium text-gray-800">
                      {cluster.user_name || cluster.user_id.slice(0, 8)}
                    </div>
                    <div className="text-gray-400">
                      &harr; {cluster.counterparty_name || cluster.counterparty_id.slice(0, 8)}
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${severityBadgeColor(cluster.signal_count)}`}>
                    {severityBadge(cluster.signal_count)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[10px] text-gray-500">
                  <div>
                    <div className="font-medium text-gray-700 text-sm">{cluster.signal_count}</div>
                    signals
                  </div>
                  <div>
                    <div className="font-medium text-gray-700 text-sm">
                      {Math.round((cluster.avg_confidence as number) * 100)}%
                    </div>
                    avg conf
                  </div>
                  <div>
                    <div className="font-medium text-gray-700 text-sm">
                      ${Number(cluster.total_booking_value || 0).toLocaleString()}
                    </div>
                    value lost
                  </div>
                </div>

                <div className="text-[10px] text-gray-400 mt-1">{timeRange}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

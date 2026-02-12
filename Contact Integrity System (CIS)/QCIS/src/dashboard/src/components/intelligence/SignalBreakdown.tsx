'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useDashboardFilters } from '@/contexts/DashboardFilterContext';
import * as api from '@/lib/api';
import type { SignalBreakdownData } from '@/lib/api';

const DOMAIN_LABELS: Record<string, string> = {
  off_platform: 'Off-Platform',
  transaction: 'Transaction',
  booking: 'Booking',
  payment: 'Payment',
  provider: 'Provider',
  behavioral: 'Behavioral',
};

const DOMAIN_COLORS: Record<string, string> = {
  off_platform: '#ef4444',
  transaction: '#f59e0b',
  booking: '#3b82f6',
  payment: '#8b5cf6',
  provider: '#ec4899',
  behavioral: '#10b981',
};

const DOMAIN_ORDER = ['off_platform', 'transaction', 'booking', 'payment', 'provider', 'behavioral'];

function Sparkline({ data, color }: { data: Array<{ count: number }>; color: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data.map((d) => d.count), 1);
  const w = 80;
  const h = 24;
  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - (d.count / max) * h;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={w} height={h} className="inline-block ml-2">
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
    </svg>
  );
}

export default function SignalBreakdown() {
  const { auth } = useAuth();
  const { filterParams } = useDashboardFilters();
  const [data, setData] = useState<SignalBreakdownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!auth.token) return;
      setLoading(true);
      setError(null);
      try {
        const result = await api.getSignalBreakdown(auth.token, filterParams);
        if (!cancelled) setData(result.data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load signal breakdown');
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
        Signal breakdown failed: {error}
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Signal Domains</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {DOMAIN_ORDER.map((d) => (
            <div key={d} className="bg-white rounded-lg border border-gray-200 p-3 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
              <div className="h-6 bg-gray-100 rounded w-12" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Signal Domains</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {DOMAIN_ORDER.map((domain) => {
          const info = data.domains[domain];
          const ts = data.timeSeries[domain] || [];
          const color = DOMAIN_COLORS[domain];
          const isExpanded = expanded === domain;

          return (
            <div
              key={domain}
              className={`bg-white rounded-lg border transition-all cursor-pointer ${
                isExpanded ? 'border-gray-400 shadow-md col-span-2 md:col-span-3 lg:col-span-6' : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setExpanded(isExpanded ? null : domain)}
            >
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">{DOMAIN_LABELS[domain]}</span>
                  <Sparkline data={ts} color={color} />
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-lg font-bold" style={{ color }}>
                    {info?.total ?? 0}
                  </span>
                  <span className="text-xs text-gray-400">signals</span>
                </div>
              </div>

              {isExpanded && info && Object.keys(info.types).length > 0 && (
                <div className="border-t border-gray-100 px-3 pb-3 pt-2">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {Object.entries(info.types)
                      .sort(([, a], [, b]) => b - a)
                      .map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between text-xs py-1 px-2 bg-gray-50 rounded">
                          <span className="text-gray-600 truncate mr-2">{type.replace(/_/g, ' ')}</span>
                          <span className="font-mono font-medium text-gray-800">{count}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

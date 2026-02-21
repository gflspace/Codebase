'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import * as api from '@/lib/api';
import type { AIInsight } from '@/lib/api';

const SEVERITY_STYLES: Record<string, string> = {
  info: 'border-l-blue-400 bg-blue-50',
  warning: 'border-l-amber-400 bg-amber-50',
  critical: 'border-l-red-400 bg-red-50',
};

const SEVERITY_BADGE: Record<string, string> = {
  info: 'bg-blue-100 text-blue-700',
  warning: 'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700',
};

const TYPE_ICONS: Record<string, string> = {
  trend: '\u2191',
  anomaly: '\u26A0',
  recommendation: '\u2726',
  milestone: '\u2605',
};

export default function AIInsightsBanner() {
  const { auth } = useAuth();
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!auth.token) return;
      try {
        const result = await api.getAIInsightsFeed(auth.token);
        if (!cancelled) {
          setInsights(result.data || []);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 5 * 60 * 1000); // Refresh every 5 minutes
    return () => { cancelled = true; clearInterval(interval); };
  }, [auth.token]);

  if (loading) {
    return (
      <div className="mb-6">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="min-w-[280px] bg-gray-50 rounded-lg border border-l-4 border-l-gray-200 p-4 animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-20 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-48 mb-1" />
              <div className="h-3 bg-gray-200 rounded w-36" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || insights.length === 0) {
    return null; // Gracefully hidden when no insights available
  }

  return (
    <div className="mb-6">
      <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
        <span className="text-purple-500">{'\u2726'}</span> AI Insights
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {insights.map((insight) => (
          <div
            key={insight.id}
            className={`min-w-[280px] max-w-[320px] rounded-lg border border-l-4 p-4 flex-shrink-0 ${SEVERITY_STYLES[insight.severity] || SEVERITY_STYLES.info}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">{TYPE_ICONS[insight.type] || '\u2726'}</span>
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${SEVERITY_BADGE[insight.severity] || SEVERITY_BADGE.info}`}>
                {insight.severity}
              </span>
              <span className="text-xs text-gray-400">{insight.type}</span>
            </div>
            <h4 className="text-sm font-semibold text-gray-900 mb-1">{insight.title}</h4>
            <p className="text-xs text-gray-600 mb-3 line-clamp-2">{insight.body}</p>
            <a
              href={insight.cta_link}
              className="inline-block px-3 py-1 text-xs font-medium bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors text-gray-700"
            >
              {insight.cta_label}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

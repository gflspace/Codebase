'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import * as api from '@/lib/api';

interface Alert {
  id: string;
  user_id: string;
  priority: string;
  status: string;
  title: string;
  description: string;
  assigned_to: string | null;
  created_at: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-cis-red text-white',
  high: 'bg-cis-orange text-white',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-gray-100 text-gray-600',
};

export default function AlertsInbox() {
  const { auth } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<string>('open');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
  }, [filter]);

  async function loadAlerts() {
    if (!auth.token) return;
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filter) params.status = filter;
      const result = await api.getAlerts(auth.token, params);
      setAlerts(result.data as Alert[]);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  }

  async function assignToMe(alertId: string) {
    if (!auth.token || !auth.user) return;
    try {
      await api.updateAlert(auth.token, alertId, {
        assigned_to: auth.user.id,
        status: 'assigned',
      });
      loadAlerts();
    } catch (err) {
      console.error('Failed to assign alert:', err);
    }
  }

  async function dismissAlert(alertId: string) {
    if (!auth.token) return;
    try {
      await api.updateAlert(auth.token, alertId, { status: 'dismissed' });
      loadAlerts();
    } catch (err) {
      console.error('Failed to dismiss alert:', err);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Alerts & Inbox</h2>
        <div className="flex gap-2">
          {['open', 'assigned', 'in_progress', 'resolved', 'dismissed'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === s ? 'bg-cis-green text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-12">Loading alerts...</div>
      ) : alerts.length === 0 ? (
        <div className="text-gray-400 text-center py-12">No alerts found.</div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div key={alert.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[alert.priority] || ''}`}>
                      {alert.priority}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(alert.created_at).toLocaleString()}
                    </span>
                  </div>
                  <h3 className="font-medium text-gray-900">{alert.title}</h3>
                  {alert.description && (
                    <p className="text-sm text-gray-500 mt-1">{alert.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">User: {alert.user_id.slice(0, 8)}...</p>
                </div>
                <div className="flex gap-2 ml-4">
                  {alert.status === 'open' && (
                    <button
                      onClick={() => assignToMe(alert.id)}
                      className="px-3 py-1 text-xs bg-cis-green-soft text-cis-green rounded hover:bg-cis-green hover:text-white transition-colors"
                    >
                      Claim
                    </button>
                  )}
                  {['open', 'assigned'].includes(alert.status) && (
                    <button
                      onClick={() => dismissAlert(alert.id)}
                      className="px-3 py-1 text-xs bg-gray-100 text-gray-500 rounded hover:bg-gray-200 transition-colors"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

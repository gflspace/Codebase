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
  user_name: string | null;
  user_email: string | null;
  user_phone: string | null;
  user_type: string | null;
  service_category: string | null;
  user_trust_score: number | null;
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-cis-red text-white',
  high: 'bg-cis-orange text-white',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-gray-100 text-gray-600',
};

const SERVICE_CATEGORIES = ['', 'Cleaning', 'Plumbing', 'Electrical', 'Moving', 'Tutoring', 'Handyman', 'Landscaping', 'Pet Care', 'Auto Repair', 'Personal Training'];

export default function AlertsInbox() {
  const { auth } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [userTypeFilter, setUserTypeFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [aiSummary, setAiSummary] = useState<{ summary: string; risk_level: string; recommendations: string[] } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    loadAlerts();
  }, [statusFilter, priorityFilter, categoryFilter, userTypeFilter, auth.token]);

  async function loadAlerts() {
    if (!auth.token) return;
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (userTypeFilter) params.user_type = userTypeFilter;
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
      await api.updateAlert(auth.token, alertId, { assigned_to: auth.user.id, status: 'assigned' });
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

  async function loadAiSummary(userId: string) {
    if (!auth.token) return;
    setAiLoading(true);
    setAiSummary(null);
    try {
      const result = await api.getRiskSummary(auth.token, userId);
      setAiSummary(result.data);
    } catch (err) {
      setAiSummary({ summary: 'AI analysis unavailable.', risk_level: 'unknown', recommendations: [] });
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Alerts & Inbox</h2>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 mb-4">
        {/* Status filter */}
        <div className="flex gap-1">
          {['', 'open', 'assigned', 'in_progress', 'resolved', 'dismissed'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                statusFilter === s ? 'bg-cis-green text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s ? s.replace('_', ' ') : 'all'}
            </button>
          ))}
        </div>

        {/* Priority filter */}
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="text-xs border border-gray-300 rounded-md px-2 py-1">
          <option value="">All priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {/* Category filter */}
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="text-xs border border-gray-300 rounded-md px-2 py-1">
          <option value="">All categories</option>
          {SERVICE_CATEGORIES.filter(Boolean).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* User type filter */}
        <select value={userTypeFilter} onChange={(e) => setUserTypeFilter(e.target.value)} className="text-xs border border-gray-300 rounded-md px-2 py-1">
          <option value="">All user types</option>
          <option value="customer">Customer</option>
          <option value="provider">Provider</option>
        </select>
      </div>

      <div className="flex gap-6">
        {/* Alert list */}
        <div className={selectedAlert ? 'w-1/2' : 'w-full'}>
          {loading ? (
            <div className="text-gray-400 text-center py-12">Loading alerts...</div>
          ) : alerts.length === 0 ? (
            <div className="text-gray-400 text-center py-12">No alerts found.</div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`bg-white rounded-lg border p-4 cursor-pointer transition-colors ${
                    selectedAlert?.id === alert.id ? 'border-cis-green ring-1 ring-cis-green' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => { setSelectedAlert(alert); setAiSummary(null); }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[alert.priority] || ''}`}>
                          {alert.priority}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(alert.created_at).toLocaleString()}
                        </span>
                        {alert.service_category && (
                          <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{alert.service_category}</span>
                        )}
                      </div>
                      <h3 className="font-medium text-gray-900">{alert.title}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {alert.user_name || alert.user_id.slice(0, 8)} {alert.user_type ? `(${alert.user_type})` : ''}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {alert.status === 'open' && (
                        <button onClick={(e) => { e.stopPropagation(); assignToMe(alert.id); }} className="px-3 py-1 text-xs bg-cis-green-soft text-cis-green rounded hover:bg-cis-green hover:text-white transition-colors">
                          Claim
                        </button>
                      )}
                      {['open', 'assigned'].includes(alert.status) && (
                        <button onClick={(e) => { e.stopPropagation(); dismissAlert(alert.id); }} className="px-3 py-1 text-xs bg-gray-100 text-gray-500 rounded hover:bg-gray-200 transition-colors">
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

        {/* Detail Panel */}
        {selectedAlert && (
          <div className="w-1/2">
            <div className="bg-white rounded-lg border border-gray-200 p-5 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Alert Details</h3>
                <button onClick={() => setSelectedAlert(null)} className="text-gray-400 hover:text-gray-600 text-sm">Close</button>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-500">Title:</span>
                  <p className="font-medium text-gray-900">{selectedAlert.title}</p>
                </div>
                {selectedAlert.description && (
                  <div>
                    <span className="text-gray-500">Description:</span>
                    <p className="text-gray-700">{selectedAlert.description}</p>
                  </div>
                )}

                {/* User Details */}
                <div className="border-t border-gray-100 pt-3">
                  <span className="text-gray-500 font-medium">User Details</span>
                  <div className="mt-2 space-y-1">
                    <p><span className="text-gray-400">Name:</span> {selectedAlert.user_name || 'Unknown'}</p>
                    <p><span className="text-gray-400">Email:</span> {selectedAlert.user_email || '-'}</p>
                    <p><span className="text-gray-400">Phone:</span> {selectedAlert.user_phone || '-'}</p>
                    <p><span className="text-gray-400">Type:</span> {selectedAlert.user_type || '-'}</p>
                    <p><span className="text-gray-400">Category:</span> {selectedAlert.service_category || '-'}</p>
                    <p><span className="text-gray-400">Trust Score:</span>{' '}
                      <span className={`font-mono font-bold ${
                        (selectedAlert.user_trust_score || 0) < 40 ? 'text-cis-red' :
                        (selectedAlert.user_trust_score || 0) < 60 ? 'text-cis-orange' : 'text-cis-green'
                      }`}>
                        {selectedAlert.user_trust_score ?? '-'}
                      </span>
                    </p>
                  </div>
                </div>

                {/* AI Risk Summary */}
                <div className="border-t border-gray-100 pt-3">
                  <button
                    onClick={() => loadAiSummary(selectedAlert.user_id)}
                    disabled={aiLoading}
                    className="px-3 py-1.5 text-xs bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 disabled:opacity-50 transition-colors"
                  >
                    {aiLoading ? 'Analyzing...' : 'AI Risk Summary'}
                  </button>
                  {aiSummary && (
                    <div className="mt-3 bg-purple-50 rounded-md p-3 text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-purple-800">Risk Level:</span>
                        <span className={`px-2 py-0.5 rounded font-medium ${
                          aiSummary.risk_level === 'critical' ? 'bg-red-100 text-red-700' :
                          aiSummary.risk_level === 'high' ? 'bg-orange-100 text-orange-700' :
                          aiSummary.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {aiSummary.risk_level}
                        </span>
                      </div>
                      <p className="text-purple-700 mb-2">{aiSummary.summary}</p>
                      {aiSummary.recommendations.length > 0 && (
                        <ul className="list-disc list-inside text-purple-600 space-y-0.5">
                          {aiSummary.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import * as api from '@/lib/api';

interface AuditLog {
  id: string;
  actor: string;
  actor_type: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown>;
  timestamp: string;
}

export default function AuditLogsModule() {
  const { auth } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ action: '', entity_type: '' });

  useEffect(() => { loadLogs(); }, [filters, auth.token]);

  async function loadLogs() {
    if (!auth.token) return;
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: '50' };
      if (filters.action) params.action = filters.action;
      if (filters.entity_type) params.entity_type = filters.entity_type;
      const result = await api.getAuditLogs(auth.token, params);
      setLogs(result.data as AuditLog[]);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Audit Logs</h2>
        <div className="flex gap-2">
          <input
            placeholder="Filter by action..."
            value={filters.action}
            onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-cis-green"
          />
          <input
            placeholder="Filter by entity type..."
            value={filters.entity_type}
            onChange={(e) => setFilters((f) => ({ ...f, entity_type: e.target.value }))}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-cis-green"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-12">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Timestamp</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Actor</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Action</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Entity</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-700">{log.actor}</span>
                    <span className="text-xs text-gray-400 ml-1">({log.actor_type})</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{log.action}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-500">{log.entity_type}</span>
                    <span className="text-xs text-gray-400 ml-1">{log.entity_id.slice(0, 8)}...</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 max-w-xs truncate">
                    {JSON.stringify(log.details).slice(0, 80)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import {
  getSyncStatus,
  getSyncHistory,
  triggerSync,
  toggleTableSync,
  resetTableWatermark,
  testSyncConnection,
  SyncStatus,
  SyncRunLog,
  SyncTableStatus,
} from '@/lib/api';

export default function DataSync() {
  const { auth } = useAuth();
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [history, setHistory] = useState<SyncRunLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingConnection, setTestingConnection] = useState(false);
  const [triggeringSync, setTriggeringSync] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{
    connected: boolean;
    host?: string;
    port?: number;
    database?: string;
    error?: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    if (!auth.token) return;
    setLoading(true);
    try {
      const [statusResult, historyResult] = await Promise.all([
        getSyncStatus(auth.token),
        getSyncHistory(auth.token, 20),
      ]);
      setStatus(statusResult);
      setHistory(historyResult.runs);
    } catch (err) {
      console.error('Failed to load sync data:', err);
    } finally {
      setLoading(false);
    }
  }, [auth.token]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleTestConnection = async () => {
    if (!auth.token) return;
    setTestingConnection(true);
    setConnectionResult(null);
    try {
      const result = await testSyncConnection(auth.token);
      setConnectionResult(result);
    } catch (err) {
      setConnectionResult({
        connected: false,
        error: err instanceof Error ? err.message : 'Connection test failed',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleTriggerSync = async (table?: string) => {
    if (!auth.token) return;
    setTriggeringSync(true);
    try {
      await triggerSync(auth.token, table);
      setTimeout(loadData, 2000);
    } catch (err) {
      console.error('Failed to trigger sync:', err);
    } finally {
      setTriggeringSync(false);
    }
  };

  const handleToggleTable = async (table: string, enabled: boolean) => {
    if (!auth.token) return;
    try {
      await toggleTableSync(auth.token, table, enabled);
      loadData();
    } catch (err) {
      console.error('Failed to toggle table sync:', err);
    }
  };

  const handleResetWatermark = async (table: string) => {
    if (!auth.token) return;
    if (!confirm(`Reset watermark for ${table}? This will re-sync all records from the beginning.`)) {
      return;
    }
    try {
      await resetTableWatermark(auth.token, table);
      loadData();
    } catch (err) {
      console.error('Failed to reset watermark:', err);
    }
  };

  if (loading && !status) {
    return (
      <div className="text-gray-400 dark:text-slate-500 text-center py-12">Loading sync status...</div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Data Sync Management</h2>
        <button
          onClick={loadData}
          className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 rounded-md hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Status Panel */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 p-5 mb-6">
        <h3 className="font-bold text-gray-900 dark:text-white mb-4">Sync Status</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Sync Engine</div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                status?.enabled
                  ? 'bg-cis-green-soft text-cis-green dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400'
              }`}>
                {status?.enabled ? 'Enabled' : 'Disabled'}
              </span>
              {status?.running && (
                <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                  Running
                </span>
              )}
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">External DB</div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                status?.externalDbConnected
                  ? 'bg-cis-green-soft text-cis-green dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-cis-red-soft text-cis-red dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {status?.externalDbConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Sync Interval</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {status?.intervalMs ? `${Math.floor(status.intervalMs / 1000)}s` : '-'}
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Active Tables</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {status?.tables.filter(t => t.enabled).length || 0} / {status?.tables.length || 0}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleTestConnection}
            disabled={testingConnection}
            className="px-4 py-2 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/50 disabled:opacity-50 transition-colors"
          >
            {testingConnection ? 'Testing...' : 'Test Connection'}
          </button>
          <button
            onClick={() => handleTriggerSync()}
            disabled={triggeringSync || !status?.externalDbConnected}
            className="px-4 py-2 text-sm bg-cis-green text-white rounded-md hover:opacity-90 disabled:opacity-50 transition-colors"
          >
            {triggeringSync ? 'Triggering...' : 'Trigger Sync Now'}
          </button>
        </div>

        {connectionResult && (
          <div className={`mt-4 p-3 rounded-md text-sm ${
            connectionResult.connected
              ? 'bg-cis-green-soft text-cis-green dark:bg-green-900/30 dark:text-green-400'
              : 'bg-cis-red-soft text-cis-red dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {connectionResult.connected ? (
              <div>
                <div className="font-medium mb-1">Connection Successful</div>
                <div className="text-xs opacity-80">
                  {connectionResult.host && `Host: ${connectionResult.host}`}
                  {connectionResult.port && ` | Port: ${connectionResult.port}`}
                  {connectionResult.database && ` | Database: ${connectionResult.database}`}
                </div>
              </div>
            ) : (
              <div>
                <div className="font-medium mb-1">Connection Failed</div>
                <div className="text-xs opacity-80">{connectionResult.error || 'Unknown error'}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tables Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-gray-200 dark:border-slate-700">
          <h3 className="font-bold text-gray-900 dark:text-white">Sync Tables</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-800">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-slate-400 font-medium">Table</th>
                <th className="text-center px-4 py-3 text-gray-600 dark:text-slate-400 font-medium">Enabled</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-slate-400 font-medium">Last Synced</th>
                <th className="text-right px-4 py-3 text-gray-600 dark:text-slate-400 font-medium">Records</th>
                <th className="text-right px-4 py-3 text-gray-600 dark:text-slate-400 font-medium">Duration</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-slate-400 font-medium">Status</th>
                <th className="text-right px-4 py-3 text-gray-600 dark:text-slate-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {status?.tables.map((table: SyncTableStatus) => (
                <tr key={table.source_table} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                  <td className="px-4 py-3 font-mono text-gray-900 dark:text-white">{table.source_table}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleTable(table.source_table, !table.enabled)}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        table.enabled
                          ? 'bg-cis-green-soft text-cis-green dark:bg-green-900/30 dark:text-green-400 hover:bg-cis-green hover:text-white dark:hover:bg-green-700'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {table.enabled ? 'ON' : 'OFF'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-slate-400">
                    {table.last_synced_at
                      ? new Date(table.last_synced_at).toLocaleString()
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                    {table.records_synced.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-slate-400">
                    {table.last_run_duration_ms
                      ? `${Math.round(table.last_run_duration_ms)}ms`
                      : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {table.last_error ? (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-cis-red-soft text-cis-red dark:bg-red-900/30 dark:text-red-400">
                        Error
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-cis-green-soft text-cis-green dark:bg-green-900/30 dark:text-green-400">
                        OK
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleTriggerSync(table.source_table)}
                        disabled={!table.enabled || !status?.externalDbConnected}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        Sync
                      </button>
                      <button
                        onClick={() => handleResetWatermark(table.source_table)}
                        disabled={!table.enabled}
                        className="text-xs text-cis-orange hover:text-cis-red dark:text-orange-400 dark:hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        Reset
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Sync Runs */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 dark:border-slate-700">
          <h3 className="font-bold text-gray-900 dark:text-white">Recent Sync Runs</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-800">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-slate-400 font-medium">Time</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-slate-400 font-medium">Table</th>
                <th className="text-right px-4 py-3 text-gray-600 dark:text-slate-400 font-medium">Found</th>
                <th className="text-right px-4 py-3 text-gray-600 dark:text-slate-400 font-medium">Processed</th>
                <th className="text-right px-4 py-3 text-gray-600 dark:text-slate-400 font-medium">Failed</th>
                <th className="text-right px-4 py-3 text-gray-600 dark:text-slate-400 font-medium">Events</th>
                <th className="text-right px-4 py-3 text-gray-600 dark:text-slate-400 font-medium">Duration</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-slate-400 font-medium">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400 dark:text-slate-500">
                    No sync runs recorded yet
                  </td>
                </tr>
              ) : (
                history.map((run) => {
                  const duration = run.finished_at && run.started_at
                    ? new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()
                    : null;

                  return (
                    <tr key={run.id} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                      <td className="px-4 py-3 text-gray-600 dark:text-slate-400">
                        {new Date(run.started_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-900 dark:text-white">
                        {run.source_table}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-slate-400">
                        {run.records_found}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900 dark:text-white font-medium">
                        {run.records_processed}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {run.records_failed > 0 ? (
                          <span className="text-cis-red dark:text-red-400 font-medium">
                            {run.records_failed}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-slate-500">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400 font-medium">
                        {run.events_emitted}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-slate-400">
                        {duration ? `${Math.round(duration)}ms` : '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-slate-500 max-w-xs truncate">
                        {run.error || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import * as api from '@/lib/api';

interface HealthStatus {
  status: string;
  timestamp: string;
  version: string;
  environment: string;
  shadowMode: boolean;
  enforcementKillSwitch: boolean;
  database: string;
}

export default function SystemHealth() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadHealth();
    const interval = setInterval(loadHealth, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  async function loadHealth() {
    try {
      const result = await api.getHealth() as unknown as HealthStatus;
      setHealth(result);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reach API');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">System Health</h2>

      {loading ? (
        <div className="text-gray-400 text-center py-12">Checking system status...</div>
      ) : error ? (
        <div className="bg-cis-red-soft border border-cis-red text-cis-red p-4 rounded-lg">
          API unreachable: {error}
        </div>
      ) : health ? (
        <div className="grid grid-cols-2 gap-4">
          <StatusCard
            label="Overall Status"
            value={health.status}
            color={health.status === 'healthy' ? 'green' : 'red'}
          />
          <StatusCard
            label="Database"
            value={health.database}
            color={health.database === 'connected' ? 'green' : 'red'}
          />
          <StatusCard
            label="Shadow Mode"
            value={health.shadowMode ? 'Enabled' : 'Disabled'}
            color={health.shadowMode ? 'orange' : 'green'}
          />
          <StatusCard
            label="Kill Switch"
            value={health.enforcementKillSwitch ? 'ACTIVE' : 'Off'}
            color={health.enforcementKillSwitch ? 'red' : 'green'}
          />
          <StatusCard label="Version" value={health.version} color="gray" />
          <StatusCard label="Environment" value={health.environment} color="gray" />
          <StatusCard
            label="Last Check"
            value={new Date(health.timestamp).toLocaleTimeString()}
            color="gray"
          />
        </div>
      ) : null}
    </div>
  );
}

function StatusCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    green: 'border-cis-green bg-cis-green-soft',
    red: 'border-cis-red bg-cis-red-soft',
    orange: 'border-cis-orange bg-cis-orange-soft',
    gray: 'border-gray-200 bg-white',
  };

  return (
    <div className={`p-4 rounded-lg border ${colorMap[color] || colorMap.gray}`}>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-lg font-bold text-gray-900">{value}</div>
    </div>
  );
}

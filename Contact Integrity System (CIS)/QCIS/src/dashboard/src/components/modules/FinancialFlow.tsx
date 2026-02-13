'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useDashboardFilters } from '@/contexts/DashboardFilterContext';
import { getFinancialFlow, FinancialFlowData } from '@/lib/api';

function StatusDot({ status }: { status: 'green' | 'amber' | 'red' }) {
  const colors = { green: 'bg-green-400', amber: 'bg-amber-400', red: 'bg-red-400' };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status]}`} />;
}

function formatCurrency(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
  return `$${val.toFixed(2)}`;
}

export default function FinancialFlow() {
  const { auth } = useAuth();
  const { filterParams } = useDashboardFilters();
  const [data, setData] = useState<FinancialFlowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!auth.token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getFinancialFlow(auth.token, filterParams);
      setData(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load financial data');
    } finally {
      setLoading(false);
    }
  }, [auth.token, filterParams]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="text-sm text-gray-400 py-8 text-center">Loading financial data...</div>;
  if (error) return <div className="bg-red-50 text-red-700 p-3 rounded text-sm">{error}</div>;
  if (!data) return null;

  const { kpi, wallet_timeline, transaction_timeline } = data;

  // Max for wallet chart
  const maxWallet = Math.max(...wallet_timeline.map((t) => t.deposits + t.withdrawals + t.transfers), 1);
  // Max for tx chart
  const maxTx = Math.max(...transaction_timeline.map((t) => t.total), 1);

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-1">Financial Flow</h2>
      <p className="text-sm text-gray-400 mb-6">Wallet activity, transaction health, and volume analytics.</p>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Volume</div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(kpi.total_volume)}</div>
          <div className="text-xs text-gray-400 mt-1">{kpi.total_transactions} transactions</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Avg Transaction</div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(kpi.avg_transaction)}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 uppercase tracking-wide">Deposits</span>
            <StatusDot status={kpi.deposits.status} />
          </div>
          <div className="text-2xl font-bold text-gray-900">{kpi.deposits.value}</div>
          <div className="text-xs text-gray-400 mt-1">prev: {kpi.deposits.previous}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 uppercase tracking-wide">TX Completed</span>
            <StatusDot status={kpi.tx_completed.status} />
          </div>
          <div className="text-2xl font-bold text-green-700">{kpi.tx_completed.value}</div>
          <div className="text-xs text-gray-400 mt-1">prev: {kpi.tx_completed.previous}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 uppercase tracking-wide">TX Failed</span>
            <StatusDot status={kpi.tx_failed.status} />
          </div>
          <div className="text-2xl font-bold text-red-700">{kpi.tx_failed.value}</div>
          <div className="text-xs text-gray-400 mt-1">prev: {kpi.tx_failed.previous}</div>
        </div>
      </div>

      {/* Two columns: wallet + transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Wallet Activity */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Wallet Activity</h3>
          {wallet_timeline.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No wallet data.</p>
          ) : (
            <>
              <div className="flex items-end gap-1" style={{ height: 140 }}>
                {wallet_timeline.map((point, i) => {
                  const depH = (point.deposits / maxWallet) * 140;
                  const wdH = (point.withdrawals / maxWallet) * 140;
                  const trH = (point.transfers / maxWallet) * 140;
                  return (
                    <div key={i} className="flex-1 flex flex-col-reverse" title={new Date(point.timestamp).toLocaleDateString()}>
                      <div className="bg-green-400 rounded-t-sm" style={{ height: depH }} />
                      <div className="bg-orange-400" style={{ height: wdH }} />
                      <div className="bg-blue-400 rounded-t-sm" style={{ height: trH }} />
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-2 bg-green-400 rounded-sm inline-block" /> Deposits</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 bg-orange-400 rounded-sm inline-block" /> Withdrawals</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 bg-blue-400 rounded-sm inline-block" /> Transfers</span>
              </div>
            </>
          )}
        </div>

        {/* Transaction Health */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Transaction Health</h3>
          {transaction_timeline.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No transaction data.</p>
          ) : (
            <>
              <div className="flex items-end gap-1" style={{ height: 140 }}>
                {transaction_timeline.map((point, i) => {
                  const compH = (point.completed / maxTx) * 140;
                  const failH = (point.failed / maxTx) * 140;
                  const pendH = (point.pending / maxTx) * 140;
                  return (
                    <div key={i} className="flex-1 flex flex-col-reverse" title={new Date(point.timestamp).toLocaleDateString()}>
                      <div className="bg-green-400 rounded-t-sm" style={{ height: compH }} />
                      <div className="bg-red-400" style={{ height: failH }} />
                      <div className="bg-gray-300 rounded-t-sm" style={{ height: pendH }} />
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-2 bg-green-400 rounded-sm inline-block" /> Completed</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 bg-red-400 rounded-sm inline-block" /> Failed</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 bg-gray-300 rounded-sm inline-block" /> Pending</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Volume Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Volume Summary</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-gray-500">Completed Volume</div>
            <div className="text-lg font-bold text-green-700">{formatCurrency(kpi.completed_volume)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Failed Volume</div>
            <div className="text-lg font-bold text-red-700">{formatCurrency(kpi.failed_volume)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Success Rate</div>
            <div className="text-lg font-bold text-gray-900">
              {kpi.total_transactions > 0
                ? Math.round(((kpi.tx_completed.value) / (kpi.tx_completed.value + kpi.tx_failed.value || 1)) * 100)
                : 0}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

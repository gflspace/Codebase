'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useDashboardFilters } from '@/contexts/DashboardFilterContext';
import { getBookingTimeline, BookingTimelineData } from '@/lib/api';

function StatusDot({ status }: { status: 'green' | 'amber' | 'red' }) {
  const colors = { green: 'bg-green-400', amber: 'bg-amber-400', red: 'bg-red-400' };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status]}`} />;
}

function KPICard({ label, value, previous, status, suffix }: {
  label: string; value: number; previous?: number; status?: 'green' | 'amber' | 'red'; suffix?: string;
}) {
  const pctChange = previous && previous > 0 ? Math.round(((value - previous) / previous) * 100) : 0;
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
        {status && <StatusDot status={status} />}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value.toLocaleString()}{suffix}</div>
      {previous !== undefined && (
        <div className={`text-xs mt-1 ${pctChange > 0 ? 'text-red-500' : pctChange < 0 ? 'text-green-500' : 'text-gray-400'}`}>
          {pctChange > 0 ? '+' : ''}{pctChange}% vs prev
        </div>
      )}
    </div>
  );
}

export default function BookingTimeline() {
  const { auth } = useAuth();
  const { filterParams } = useDashboardFilters();
  const [data, setData] = useState<BookingTimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!auth.token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getBookingTimeline(auth.token, filterParams);
      setData(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load booking data');
    } finally {
      setLoading(false);
    }
  }, [auth.token, filterParams]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="text-sm text-gray-400 py-8 text-center">Loading booking data...</div>;
  if (error) return <div className="bg-red-50 text-red-700 p-3 rounded text-sm">{error}</div>;
  if (!data) return null;

  const { kpi, timeline, by_category } = data;

  // Find max for bar chart scaling
  const maxTotal = Math.max(...timeline.map((t) => t.total), 1);

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-1">Booking Timeline</h2>
      <p className="text-sm text-gray-400 mb-6">Booking activity, completion rates, and service category breakdown.</p>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <KPICard label="Total Bookings" value={kpi.total_bookings.value} previous={kpi.total_bookings.previous} status={kpi.total_bookings.status} />
        <KPICard label="Completed" value={kpi.completed.value} previous={kpi.completed.previous} status={kpi.completed.status} />
        <KPICard label="Cancelled" value={kpi.cancelled.value} previous={kpi.cancelled.previous} status={kpi.cancelled.status} />
        <KPICard label="No-Shows" value={kpi.no_shows.value} previous={kpi.no_shows.previous} status={kpi.no_shows.status} />
        <KPICard label="Completion Rate" value={kpi.completion_rate} suffix="%" />
        <KPICard label="Avg Value" value={kpi.avg_booking_value.value} previous={kpi.avg_booking_value.previous} suffix="" />
      </div>

      {/* Timeline Chart (stacked bar) */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Timeline</h3>
        {timeline.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No booking data in this period.</p>
        ) : (
          <div className="flex items-end gap-1" style={{ height: 160 }}>
            {timeline.map((point, i) => {
              const scale = point.total / maxTotal;
              const completedH = (point.completed / maxTotal) * 160;
              const cancelledH = (point.cancelled / maxTotal) * 160;
              const noShowH = (point.no_show / maxTotal) * 160;
              const pendingH = Math.max(0, scale * 160 - completedH - cancelledH - noShowH);
              return (
                <div key={i} className="flex-1 flex flex-col-reverse" title={`${new Date(point.timestamp).toLocaleDateString()}: ${point.total} bookings`}>
                  <div className="bg-green-400 rounded-t-sm" style={{ height: completedH }} />
                  <div className="bg-red-400" style={{ height: cancelledH }} />
                  <div className="bg-amber-400" style={{ height: noShowH }} />
                  <div className="bg-blue-300 rounded-t-sm" style={{ height: pendingH }} />
                </div>
              );
            })}
          </div>
        )}
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-2 bg-green-400 rounded-sm inline-block" /> Completed</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 bg-red-400 rounded-sm inline-block" /> Cancelled</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 bg-amber-400 rounded-sm inline-block" /> No-Show</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 bg-blue-300 rounded-sm inline-block" /> Pending</span>
        </div>
      </div>

      {/* Category Breakdown Table */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">By Service Category</h3>
        {by_category.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No category data.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-gray-500 text-xs">
              <tr>
                <th className="text-left py-2">Category</th>
                <th className="text-right py-2">Total</th>
                <th className="text-right py-2">Completed</th>
                <th className="text-right py-2">Cancelled</th>
                <th className="text-right py-2">No-Show</th>
                <th className="text-right py-2">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {by_category.map((cat) => {
                const rate = cat.total > 0 ? Math.round((cat.completed / cat.total) * 100) : 0;
                return (
                  <tr key={cat.category}>
                    <td className="py-2 font-medium text-gray-800 capitalize">{cat.category}</td>
                    <td className="py-2 text-right text-gray-600">{cat.total}</td>
                    <td className="py-2 text-right text-green-600">{cat.completed}</td>
                    <td className="py-2 text-right text-red-600">{cat.cancelled}</td>
                    <td className="py-2 text-right text-amber-600">{cat.no_show}</td>
                    <td className="py-2 text-right">
                      <span className={`px-2 py-0.5 rounded text-xs ${rate >= 80 ? 'bg-green-100 text-green-700' : rate >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {rate}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

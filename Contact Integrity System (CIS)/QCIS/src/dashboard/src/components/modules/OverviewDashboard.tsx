'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import * as api from '@/lib/api';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const CIS_COLORS = {
  green: '#10B981',
  red: '#EF4444',
  orange: '#F59E0B',
  blue: '#3B82F6',
  gray: '#6B7280',
  purple: '#8B5CF6',
  pink: '#EC4899',
  teal: '#14B8A6',
  indigo: '#6366F1',
  amber: '#D97706',
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: CIS_COLORS.red,
  high: CIS_COLORS.orange,
  medium: CIS_COLORS.amber,
  low: CIS_COLORS.gray,
};

const CATEGORY_COLORS = [
  CIS_COLORS.green, CIS_COLORS.blue, CIS_COLORS.orange, CIS_COLORS.purple,
  CIS_COLORS.pink, CIS_COLORS.teal, CIS_COLORS.indigo, CIS_COLORS.amber,
  CIS_COLORS.red, CIS_COLORS.gray,
];

interface OverviewData {
  alerts: Record<string, string>;
  cases: Record<string, string>;
  enforcements: Record<string, string>;
  risk: Record<string, string>;
}

interface CriticalityData {
  alerts_by_priority: Array<{ priority: string; count: string }>;
  enforcements_by_type: Array<{ action_type: string; count: string }>;
}

interface TrendData {
  alerts: Array<{ date: string; count: string }>;
  cases: Array<{ date: string; count: string }>;
  enforcements: Array<{ date: string; count: string }>;
}

interface CategoryRow {
  category: string;
  alert_count: string;
  case_count: string;
  enforcement_count: string;
  avg_trust_score: string;
}

function MetricCard({ title, value, subtitle, trend }: { title: string; value: string | number; subtitle?: string; trend?: 'up' | 'down' | 'stable' }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        {trend && (
          <span className={`text-sm font-medium ${trend === 'up' ? 'text-cis-red' : trend === 'down' ? 'text-cis-green' : 'text-gray-400'}`}>
            {trend === 'up' ? '\u2191' : trend === 'down' ? '\u2193' : '\u2192'}
          </span>
        )}
      </div>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

export default function OverviewDashboard() {
  const { auth } = useAuth();
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [criticality, setCriticality] = useState<CriticalityData | null>(null);
  const [trends, setTrends] = useState<TrendData | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!auth.token) return;
    try {
      const [overviewRes, critRes, trendRes, catRes] = await Promise.all([
        api.getOverviewStats(auth.token),
        api.getCriticalityStats(auth.token),
        api.getTrendStats(auth.token),
        api.getCategoryStats(auth.token),
      ]);
      setOverview(overviewRes.data);
      setCriticality(critRes.data);
      setTrends(trendRes.data);
      setCategories(catRes.data);
    } catch (err) {
      console.error('Failed to load overview stats:', err);
    } finally {
      setLoading(false);
    }
  }, [auth.token]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  if (loading) {
    return <div className="text-gray-400 text-center py-12">Loading dashboard...</div>;
  }

  const priorityChartData = (criticality?.alerts_by_priority || []).map((d) => ({
    name: d.priority,
    count: parseInt(d.count),
    fill: PRIORITY_COLORS[d.priority] || CIS_COLORS.gray,
  }));

  // Merge trend data into a unified timeline
  const trendMap = new Map<string, { date: string; alerts: number; cases: number; enforcements: number }>();
  for (const row of trends?.alerts || []) {
    const d = row.date.split('T')[0];
    if (!trendMap.has(d)) trendMap.set(d, { date: d, alerts: 0, cases: 0, enforcements: 0 });
    trendMap.get(d)!.alerts = parseInt(row.count);
  }
  for (const row of trends?.cases || []) {
    const d = row.date.split('T')[0];
    if (!trendMap.has(d)) trendMap.set(d, { date: d, alerts: 0, cases: 0, enforcements: 0 });
    trendMap.get(d)!.cases = parseInt(row.count);
  }
  for (const row of trends?.enforcements || []) {
    const d = row.date.split('T')[0];
    if (!trendMap.has(d)) trendMap.set(d, { date: d, alerts: 0, cases: 0, enforcements: 0 });
    trendMap.get(d)!.enforcements = parseInt(row.count);
  }
  const trendChartData = [...trendMap.values()].sort((a, b) => a.date.localeCompare(b.date));

  const pieData = categories.filter((c) => parseInt(c.alert_count) > 0 || parseInt(c.case_count) > 0).map((c, i) => ({
    name: c.category,
    value: parseInt(c.alert_count) + parseInt(c.case_count),
    fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }));

  const openAlerts = parseInt(overview?.alerts.open || '0') + parseInt(overview?.alerts.assigned || '0') + parseInt(overview?.alerts.in_progress || '0');
  const activeCases = parseInt(overview?.cases.open || '0') + parseInt(overview?.cases.investigating || '0') + parseInt(overview?.cases.pending_action || '0');
  const activeEnf = parseInt(overview?.enforcements.active || '0');
  const avgScore = parseFloat(overview?.risk.avg_score || '0').toFixed(1);

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Overview</h2>

      {/* Metric Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <MetricCard title="Active Alerts" value={openAlerts} subtitle={`${overview?.alerts.total || 0} total`} trend={openAlerts > 5 ? 'up' : 'stable'} />
        <MetricCard title="Active Cases" value={activeCases} subtitle={`${overview?.cases.total || 0} total`} trend={activeCases > 3 ? 'up' : 'stable'} />
        <MetricCard title="Active Enforcements" value={activeEnf} subtitle={`${overview?.enforcements.total || 0} total`} />
        <MetricCard title="Avg Trust Score" value={avgScore} subtitle={`${overview?.risk.user_count || 0} users`} trend={parseFloat(avgScore) < 50 ? 'down' : 'stable'} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Alerts by Priority */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Alerts by Priority</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={priorityChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" name="Alerts">
                {priorityChartData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 30-day Incident Trend */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-4">30-Day Incident Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trendChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d: string) => d.slice(5)} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="alerts" stroke={CIS_COLORS.red} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="cases" stroke={CIS_COLORS.blue} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="enforcements" stroke={CIS_COLORS.orange} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category PieChart */}
      {pieData.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Cases by Service Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }: { name: string; value: number }) => `${name}: ${value}`}>
                {pieData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

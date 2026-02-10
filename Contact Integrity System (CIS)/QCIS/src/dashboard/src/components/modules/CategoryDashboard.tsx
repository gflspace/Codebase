'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import * as api from '@/lib/api';

const SERVICE_CATEGORIES = [
  'All', 'Cleaning', 'Plumbing', 'Electrical', 'Moving', 'Tutoring',
  'Handyman', 'Landscaping', 'Pet Care', 'Auto Repair', 'Personal Training',
];

interface CategoryStat {
  category: string;
  alert_count: string;
  case_count: string;
  enforcement_count: string;
  avg_trust_score: string;
}

interface UserRow {
  id: string;
  display_name: string;
  email: string;
  phone: string | null;
  trust_score: number;
  user_type: string;
  service_category: string | null;
  status: string;
}

export default function CategoryDashboard() {
  const { auth } = useAuth();
  const [activeCategory, setActiveCategory] = useState('All');
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [providers, setProviders] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [auth.token, activeCategory]);

  async function loadData() {
    if (!auth.token) return;
    setLoading(true);
    try {
      const [statsRes, usersRes] = await Promise.all([
        api.getCategoryStats(auth.token),
        api.getUsers(auth.token, {
          ...(activeCategory !== 'All' ? { service_category: activeCategory } : {}),
          user_type: 'provider',
          limit: '50',
        }),
      ]);
      setCategoryStats(statsRes.data);
      setProviders((usersRes.data as UserRow[]).sort((a, b) => a.trust_score - b.trust_score));
    } catch (err) {
      console.error('Failed to load category data:', err);
    } finally {
      setLoading(false);
    }
  }

  const currentStats = activeCategory === 'All'
    ? categoryStats.reduce(
        (acc, c) => ({
          alert_count: String(parseInt(acc.alert_count) + parseInt(c.alert_count)),
          case_count: String(parseInt(acc.case_count) + parseInt(c.case_count)),
          enforcement_count: String(parseInt(acc.enforcement_count) + parseInt(c.enforcement_count)),
          avg_trust_score: '0',
        }),
        { alert_count: '0', case_count: '0', enforcement_count: '0', avg_trust_score: '0' }
      )
    : categoryStats.find((c) => c.category === activeCategory) || { alert_count: '0', case_count: '0', enforcement_count: '0', avg_trust_score: '0' };

  const avgScore = activeCategory === 'All'
    ? (providers.length > 0 ? (providers.reduce((s, p) => s + p.trust_score, 0) / providers.length).toFixed(1) : '0')
    : parseFloat((currentStats as CategoryStat).avg_trust_score || '0').toFixed(1);

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">Service Categories</h2>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {SERVICE_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-cis-green text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Category Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Alerts</p>
          <p className="text-xl font-bold text-gray-900">{currentStats.alert_count}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Cases</p>
          <p className="text-xl font-bold text-gray-900">{currentStats.case_count}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Enforcements</p>
          <p className="text-xl font-bold text-gray-900">{currentStats.enforcement_count}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Avg Trust Score</p>
          <p className="text-xl font-bold text-gray-900">{avgScore}</p>
        </div>
      </div>

      {/* Provider Table */}
      {loading ? (
        <div className="text-gray-400 text-center py-8">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Provider</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Email</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Phone</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Category</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Trust Score</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {providers.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No providers found.</td></tr>
              ) : (
                providers.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.display_name || 'Unknown'}</td>
                    <td className="px-4 py-3 text-gray-600">{p.email || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{p.phone || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{p.service_category || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`font-mono font-bold ${
                        p.trust_score < 40 ? 'text-cis-red' : p.trust_score < 60 ? 'text-cis-orange' : 'text-cis-green'
                      }`}>
                        {p.trust_score}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        p.status === 'active' ? 'bg-cis-green-soft text-cis-green' :
                        p.status === 'restricted' ? 'bg-cis-orange-soft text-cis-orange' :
                        p.status === 'suspended' ? 'bg-cis-red-soft text-cis-red' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

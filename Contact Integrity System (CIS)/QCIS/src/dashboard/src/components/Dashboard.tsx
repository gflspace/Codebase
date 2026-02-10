'use client';

import { useState } from 'react';
import { useAuth, hasAccess } from '@/lib/auth';
import OverviewDashboard from './modules/OverviewDashboard';
import CategoryDashboard from './modules/CategoryDashboard';
import AlertsInbox from './modules/AlertsInbox';
import CaseInvestigation from './modules/CaseInvestigation';
import EnforcementManagement from './modules/EnforcementManagement';
import RiskTrends from './modules/RiskTrends';
import AppealsModule from './modules/AppealsModule';
import SystemHealth from './modules/SystemHealth';
import AuditLogsModule from './modules/AuditLogsModule';

const MODULES = [
  { id: 'overview', label: 'Overview', access: 'overview' },
  { id: 'category', label: 'Categories', access: 'category' },
  { id: 'alerts', label: 'Alerts & Inbox', access: 'alerts' },
  { id: 'cases', label: 'Case Investigation', access: 'cases' },
  { id: 'enforcement', label: 'Enforcement', access: 'enforcement' },
  { id: 'risk', label: 'Risk & Trends', access: 'risk_trends' },
  { id: 'appeals', label: 'Appeals', access: 'appeals' },
  { id: 'health', label: 'System Health', access: 'system_health' },
  { id: 'audit', label: 'Audit Logs', access: 'audit_logs' },
] as const;

const SERVICE_CATEGORIES = [
  'All', 'Cleaning', 'Plumbing', 'Electrical', 'Moving', 'Tutoring',
  'Handyman', 'Landscaping', 'Pet Care', 'Auto Repair', 'Personal Training',
];

export default function Dashboard() {
  const { auth, logout } = useAuth();
  const [activeModule, setActiveModule] = useState('overview');
  const [activeCategory, setActiveCategory] = useState('All');
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);

  if (!auth.user) return null;

  const visibleModules = MODULES.filter((m) => hasAccess(auth.user!.role, m.access));
  const mainModules = visibleModules.filter((m) => m.id !== 'audit');
  const auditModule = visibleModules.find((m) => m.id === 'audit');

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-lg font-bold text-cis-green">CIS Dashboard</h1>
          <p className="text-xs text-gray-500 mt-1">Trust & Safety</p>
        </div>

        <nav className="flex-1 p-2 overflow-y-auto">
          {mainModules.map((mod) => (
            <button
              key={mod.id}
              onClick={() => setActiveModule(mod.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm mb-1 transition-colors ${
                activeModule === mod.id
                  ? 'bg-cis-green-soft text-cis-green font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {mod.label}
            </button>
          ))}

          {/* Service Categories — collapsible dropdown */}
          <div>
            <button
              onClick={() => setCategoriesExpanded(!categoriesExpanded)}
              className="w-full text-left px-3 py-2 rounded-md text-sm mb-1 transition-colors text-gray-600 hover:bg-gray-100 flex items-center justify-between"
            >
              <span>Service Categories</span>
              <svg
                className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${categoriesExpanded ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            {categoriesExpanded && (
              <div className="ml-3 mb-1">
                {SERVICE_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`w-full text-left px-3 py-1.5 rounded-md text-xs mb-0.5 transition-colors ${
                      activeCategory === cat
                        ? 'bg-cis-green-soft text-cis-green font-medium'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {auditModule && (
            <button
              onClick={() => setActiveModule(auditModule.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm mb-1 transition-colors ${
                activeModule === auditModule.id
                  ? 'bg-cis-green-soft text-cis-green font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {auditModule.label}
            </button>
          )}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="text-sm text-gray-600 mb-2">
            <div className="font-medium">{auth.user.name || auth.user.email}</div>
            <div className="text-xs text-gray-400 capitalize">{auth.user.role.replace('_', ' ')}</div>
          </div>
          <button
            onClick={logout}
            className="text-sm text-gray-500 hover:text-cis-red transition-colors"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-auto">
        {activeModule === 'overview' && <OverviewDashboard />}
        {activeModule === 'category' && <CategoryDashboard activeCategory={activeCategory} />}
        {activeModule === 'alerts' && <AlertsInbox />}
        {activeModule === 'cases' && <CaseInvestigation />}
        {activeModule === 'enforcement' && <EnforcementManagement />}
        {activeModule === 'risk' && <RiskTrends />}
        {activeModule === 'appeals' && <AppealsModule />}
        {activeModule === 'health' && <SystemHealth />}
        {activeModule === 'audit' && <AuditLogsModule />}
      </main>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useAuth, hasPermission } from '@/lib/auth';
import OverviewDashboard from './modules/OverviewDashboard';
import CategoryDashboard from './modules/CategoryDashboard';
import AlertsInbox from './modules/AlertsInbox';
import CaseInvestigation from './modules/CaseInvestigation';
import EnforcementManagement from './modules/EnforcementManagement';
import RiskTrends from './modules/RiskTrends';
import AppealsModule from './modules/AppealsModule';
import SystemHealth from './modules/SystemHealth';
import AuditLogsModule from './modules/AuditLogsModule';
import IntelligenceDashboard from './intelligence/IntelligenceDashboard';
import SettingsModule from './modules/SettingsModule';

const MODULES = [
  { id: 'intelligence', label: 'Intelligence', permission: 'intelligence.view' },
  { id: 'overview', label: 'Overview', permission: 'overview.view' },
  { id: 'category', label: 'Categories', permission: 'category.view' },
  { id: 'alerts', label: 'Alerts & Inbox', permission: 'alerts.view' },
  { id: 'cases', label: 'Case Investigation', permission: 'cases.view' },
  { id: 'enforcement', label: 'Enforcement', permission: 'enforcement.view' },
  { id: 'risk', label: 'Risk & Trends', permission: 'risk.view' },
  { id: 'appeals', label: 'Appeals', permission: 'appeals.view' },
  { id: 'health', label: 'System Health', permission: 'system_health.view' },
  { id: 'audit', label: 'Audit Logs', permission: 'audit_logs.view' },
  { id: 'settings', label: 'Settings', permission: 'settings.view' },
] as const;

const SERVICE_CATEGORIES = [
  'All', 'Cleaning', 'Plumbing', 'Electrical', 'Moving', 'Tutoring',
  'Handyman', 'Landscaping', 'Pet Care', 'Auto Repair', 'Personal Training',
];

export default function Dashboard() {
  const { auth, logout } = useAuth();
  const [activeModule, setActiveModule] = useState('intelligence');
  const [activeCategory, setActiveCategory] = useState('All');
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);

  if (!auth.user) return null;

  const visibleModules = MODULES.filter((m) => hasPermission(auth.user, m.permission));
  const mainModules = visibleModules.filter((m) => m.id !== 'audit' && m.id !== 'settings');
  const auditModule = visibleModules.find((m) => m.id === 'audit');
  const settingsModule = visibleModules.find((m) => m.id === 'settings');

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

          {settingsModule && (
            <>
              <div className="border-t border-gray-200 my-2" />
              <button
                onClick={() => setActiveModule(settingsModule.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm mb-1 transition-colors flex items-center gap-2 ${
                  activeModule === settingsModule.id
                    ? 'bg-cis-green-soft text-cis-green font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
                {settingsModule.label}
              </button>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="text-sm text-gray-600 mb-2">
            <div className="font-medium">{auth.user.name || auth.user.email}</div>
            <div className="text-xs text-gray-400 capitalize">{auth.user.role.replace(/_/g, ' ')}</div>
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
        {activeModule === 'intelligence' && <IntelligenceDashboard />}
        {activeModule === 'overview' && <OverviewDashboard />}
        {activeModule === 'category' && <CategoryDashboard activeCategory={activeCategory} />}
        {activeModule === 'alerts' && <AlertsInbox />}
        {activeModule === 'cases' && <CaseInvestigation />}
        {activeModule === 'enforcement' && <EnforcementManagement />}
        {activeModule === 'risk' && <RiskTrends />}
        {activeModule === 'appeals' && <AppealsModule />}
        {activeModule === 'health' && <SystemHealth />}
        {activeModule === 'audit' && <AuditLogsModule />}
        {activeModule === 'settings' && <SettingsModule />}
      </main>
    </div>
  );
}

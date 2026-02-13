'use client';

import { useState } from 'react';
import { useAuth, hasPermission } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
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
import RulesEngine from './modules/RulesEngine';
import BookingTimeline from './modules/BookingTimeline';
import FinancialFlow from './modules/FinancialFlow';
import NetworkExplorer from './modules/NetworkExplorer';
import LeakageFunnel from './modules/LeakageFunnel';
import DataSync from './modules/DataSync';

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
  { id: 'bookings', label: 'Bookings', permission: 'intelligence.view' },
  { id: 'financial', label: 'Financial', permission: 'intelligence.view' },
  { id: 'network', label: 'Network Explorer', permission: 'intelligence.view' },
  { id: 'leakage', label: 'Leakage Funnel', permission: 'intelligence.view' },
  { id: 'rules', label: 'Rules Engine', permission: 'rules.view' },
  { id: 'sync', label: 'Data Sync', permission: 'sync.view' },
  { id: 'settings', label: 'Settings', permission: 'settings.view' },
] as const;

const SERVICE_CATEGORIES = [
  'All', 'Cleaning', 'Plumbing', 'Electrical', 'Moving', 'Tutoring',
  'Handyman', 'Landscaping', 'Pet Care', 'Auto Repair', 'Personal Training',
];

export default function Dashboard() {
  const { auth, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeModule, setActiveModule] = useState('intelligence');
  const [activeCategory, setActiveCategory] = useState('All');
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);

  if (!auth.user) return null;

  const visibleModules = MODULES.filter((m) => hasPermission(auth.user, m.permission));
  const mainModules = visibleModules.filter((m) => m.id !== 'audit' && m.id !== 'settings');
  const auditModule = visibleModules.find((m) => m.id === 'audit');
  const settingsModule = visibleModules.find((m) => m.id === 'settings');

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-slate-800">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <h1 className="text-lg font-bold text-cis-green">CIS Dashboard</h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Trust & Safety</p>
        </div>

        <nav className="flex-1 p-2 overflow-y-auto">
          {mainModules.map((mod) => (
            <button
              key={mod.id}
              onClick={() => setActiveModule(mod.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm mb-1 transition-colors ${
                activeModule === mod.id
                  ? 'bg-cis-green-soft text-cis-green font-medium'
                  : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
            >
              {mod.label}
            </button>
          ))}

          {/* Service Categories — collapsible dropdown */}
          <div>
            <button
              onClick={() => setCategoriesExpanded(!categoriesExpanded)}
              className="w-full text-left px-3 py-2 rounded-md text-sm mb-1 transition-colors text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center justify-between"
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
                        : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'
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
                  : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
            >
              {auditModule.label}
            </button>
          )}

          {settingsModule && (
            <>
              <div className="border-t border-gray-200 dark:border-slate-700 my-2" />
              <button
                onClick={() => setActiveModule(settingsModule.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm mb-1 transition-colors flex items-center gap-2 ${
                  activeModule === settingsModule.id
                    ? 'bg-cis-green-soft text-cis-green font-medium'
                    : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
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

        <div className="p-4 border-t border-gray-200 dark:border-slate-700">
          <div className="text-sm text-gray-600 dark:text-slate-300 mb-3">
            <div className="font-medium">{auth.user.name || auth.user.email}</div>
            <div className="text-xs text-gray-400 dark:text-slate-500 capitalize">{auth.user.role.replace(/_/g, ' ')}</div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
              )}
            </button>
            <button
              onClick={logout}
              className="text-sm text-gray-500 dark:text-slate-400 hover:text-cis-red dark:hover:text-red-400 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-auto bg-gray-50 dark:bg-slate-800">
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
        {activeModule === 'bookings' && <BookingTimeline />}
        {activeModule === 'financial' && <FinancialFlow />}
        {activeModule === 'network' && <NetworkExplorer />}
        {activeModule === 'leakage' && <LeakageFunnel />}
        {activeModule === 'rules' && <RulesEngine />}
        {activeModule === 'sync' && <DataSync />}
        {activeModule === 'settings' && <SettingsModule />}
      </main>
    </div>
  );
}

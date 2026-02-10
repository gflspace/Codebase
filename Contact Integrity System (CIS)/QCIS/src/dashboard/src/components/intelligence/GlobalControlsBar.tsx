'use client';

import { useDashboardFilters } from '@/contexts/DashboardFilterContext';
import type { TimeRange, Granularity, EntityType, RiskLevel } from '@/contexts/DashboardFilterContext';

const SERVICE_CATEGORIES = [
  '', 'Cleaning', 'Plumbing', 'Electrical', 'Moving', 'Tutoring',
  'Handyman', 'Landscaping', 'Pet Care', 'Auto Repair', 'Personal Training',
];

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: 'last_24h', label: '24h' },
  { value: 'last_7d', label: '7d' },
  { value: 'last_30d', label: '30d' },
];

const GRANULARITIES: { value: Granularity; label: string; disabledWhen?: TimeRange }[] = [
  { value: 'hourly', label: 'Hourly', disabledWhen: 'last_30d' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly', disabledWhen: 'last_24h' },
];

export default function GlobalControlsBar() {
  const { filters, setFilters } = useDashboardFilters();

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex flex-wrap items-center gap-4 sticky top-0 z-30">
      {/* Time Range */}
      <div className="flex items-center gap-1.5" title="Select the analysis window. Shorter ranges reveal spikes; longer ranges reveal trends.">
        <span className="text-xs text-gray-400 font-medium">Range</span>
        <div className="flex bg-gray-100 rounded-md p-0.5">
          {TIME_RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setFilters({ timeRange: r.value })}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filters.timeRange === r.value
                  ? 'bg-white text-cis-green shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Granularity */}
      <div className="flex items-center gap-1.5" title="Hourly view reveals behavioral spikes and anomalies that daily views may hide.">
        <span className="text-xs text-gray-400 font-medium">Granularity</span>
        <div className="flex bg-gray-100 rounded-md p-0.5">
          {GRANULARITIES.map((g) => {
            const disabled = g.disabledWhen === filters.timeRange;
            return (
              <button
                key={g.value}
                onClick={() => !disabled && setFilters({ granularity: g.value })}
                disabled={disabled}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  filters.granularity === g.value
                    ? 'bg-white text-cis-green shadow-sm'
                    : disabled
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {g.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Entity Type */}
      <div className="flex items-center gap-1.5" title="Filter data to specific entity types.">
        <span className="text-xs text-gray-400 font-medium">Entity</span>
        <select
          value={filters.entityType}
          onChange={(e) => setFilters({ entityType: e.target.value as EntityType })}
          className="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white"
        >
          <option value="both">All Entities</option>
          <option value="users">Users</option>
          <option value="providers">Providers</option>
        </select>
      </div>

      {/* Service Category */}
      <div className="flex items-center gap-1.5" title="Filter by service category.">
        <span className="text-xs text-gray-400 font-medium">Category</span>
        <select
          value={filters.serviceCategory}
          onChange={(e) => setFilters({ serviceCategory: e.target.value })}
          className="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white"
        >
          <option value="">All Categories</option>
          {SERVICE_CATEGORIES.filter(Boolean).map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Risk Level */}
      <div className="flex items-center gap-1.5" title="Filter entities by their current risk level.">
        <span className="text-xs text-gray-400 font-medium">Risk</span>
        <select
          value={filters.riskLevel}
          onChange={(e) => setFilters({ riskLevel: e.target.value as RiskLevel })}
          className="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white"
        >
          <option value="all">All Levels</option>
          <option value="normal">Normal</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>
    </div>
  );
}

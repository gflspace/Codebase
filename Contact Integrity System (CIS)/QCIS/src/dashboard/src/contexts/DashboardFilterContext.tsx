'use client';

import { createContext, useContext, useState, useMemo, ReactNode } from 'react';

export type TimeRange = 'last_24h' | 'last_7d' | 'last_30d';
export type Granularity = 'hourly' | 'daily' | 'weekly';
export type EntityType = 'users' | 'providers' | 'both';
export type RiskLevel = 'all' | 'normal' | 'medium' | 'high';

export interface DashboardFilters {
  timeRange: TimeRange;
  granularity: Granularity;
  entityType: EntityType;
  serviceCategory: string;
  riskLevel: RiskLevel;
}

interface DashboardFilterContextValue {
  filters: DashboardFilters;
  setFilters: (partial: Partial<DashboardFilters>) => void;
  filterParams: Record<string, string>;
}

const DEFAULT_FILTERS: DashboardFilters = {
  timeRange: 'last_24h',
  granularity: 'hourly',
  entityType: 'both',
  serviceCategory: '',
  riskLevel: 'all',
};

const DashboardFilterContext = createContext<DashboardFilterContextValue>({
  filters: DEFAULT_FILTERS,
  setFilters: () => {},
  filterParams: {},
});

export function DashboardFilterProvider({ children }: { children: ReactNode }) {
  const [filters, _setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);

  function setFilters(partial: Partial<DashboardFilters>) {
    _setFilters((prev) => {
      const next = { ...prev, ...partial };
      // Auto-adjust granularity based on time range
      if (partial.timeRange === 'last_30d' && next.granularity === 'hourly') {
        next.granularity = 'daily';
      }
      if (partial.timeRange === 'last_24h' && next.granularity === 'weekly') {
        next.granularity = 'hourly';
      }
      return next;
    });
  }

  const filterParams = useMemo(() => {
    const p: Record<string, string> = {
      range: filters.timeRange,
      granularity: filters.granularity,
      entity_type: filters.entityType,
    };
    if (filters.serviceCategory) p.category = filters.serviceCategory;
    if (filters.riskLevel !== 'all') p.risk_level = filters.riskLevel;
    return p;
  }, [filters]);

  return (
    <DashboardFilterContext.Provider value={{ filters, setFilters, filterParams }}>
      {children}
    </DashboardFilterContext.Provider>
  );
}

export function useDashboardFilters() {
  return useContext(DashboardFilterContext);
}

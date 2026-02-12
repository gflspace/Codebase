'use client';

import { DashboardFilterProvider } from '@/contexts/DashboardFilterContext';
import GlobalControlsBar from './GlobalControlsBar';
import ExecutiveSummary from './ExecutiveSummary';
import SignalBreakdown from './SignalBreakdown';
import ActivityTimeline from './ActivityTimeline';

export default function IntelligenceDashboard() {
  return (
    <DashboardFilterProvider>
      <div className="-m-6">
        {/* Global controls — sticky header bar */}
        <GlobalControlsBar />

        {/* Scrollable content */}
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Intelligence</h2>
          <p className="text-sm text-gray-400 mb-6">Real-time behavioral intelligence and early-warning signals.</p>

          <ExecutiveSummary />
          <SignalBreakdown />
          <ActivityTimeline />
        </div>
      </div>
    </DashboardFilterProvider>
  );
}

import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import MetricCard from "@/components/dashboard/MetricCard";
import OwnershipChart from "@/components/dashboard/OwnershipChart";
import NoiseReductionStats from "@/components/dashboard/NoiseReductionStats";
import TrendChart from "@/components/dashboard/TrendChart";
import TeamTrendChart from "@/components/dashboard/TeamTrendChart";
import AssetTrendChart from "@/components/dashboard/AssetTrendChart";
import SeverityTrendChart from "@/components/dashboard/SeverityTrendChart";
import VulnerabilityCard from "@/components/vulnerability/VulnerabilityCard";
import {
  ShieldAlert,
  Target,
  Clock,
  TrendingDown,
  Sparkles,
  ArrowRight,
  Zap,
  BarChart3,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// PCE Planning Layer: Thresholds from planning/prioritization.md
import { CONFIDENCE_THRESHOLDS, needsReview } from "@/config/planningConfig";

export default function Dashboard() {
  const [trendPeriod, setTrendPeriod] = useState('weekly');
  
  const { data: vulnerabilities = [], isLoading } = useQuery({
    queryKey: ['vulnerabilities'],
    queryFn: () => base44.entities.Vulnerability.list('-created_date', 100),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  const { data: trendData, isLoading: trendsLoading } = useQuery({
    queryKey: ['trends', trendPeriod],
    queryFn: async () => {
      const result = await base44.functions.invoke('analyzeTrends', { period: trendPeriod });
      return result.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Calculate metrics
  const openVulns = vulnerabilities.filter(v => v.status === 'open' || v.status === 'in_progress');
  const criticalCount = vulnerabilities.filter(v => v.severity === 'critical' && v.status !== 'resolved').length;
  const highCount = vulnerabilities.filter(v => v.severity === 'high' && v.status !== 'resolved').length;
  const assignedCount = vulnerabilities.filter(v => v.assigned_team).length;
  const suppressedCount = vulnerabilities.filter(v => v.is_suppressed).length;
  const avgConfidence = vulnerabilities.length > 0 
    ? Math.round(vulnerabilities.filter(v => v.ownership_confidence).reduce((sum, v) => sum + (v.ownership_confidence || 0), 0) / vulnerabilities.filter(v => v.ownership_confidence).length)
    : 0;

  const recentCritical = vulnerabilities
    .filter(v => (v.severity === 'critical' || v.severity === 'high') && v.status !== 'resolved' && !v.is_suppressed)
    .slice(0, 4);

  // PCE: Uses needsReview() from planning/prioritization.md Section 2.1
  const vulnsNeedingReview = vulnerabilities
    .filter(v => needsReview(v))
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800/50 bg-slate-900/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">VIOE</h1>
                  <p className="text-xs text-slate-500">Vulnerability Intelligence</p>
                </div>
              </div>
            </div>
            
            <nav className="flex items-center gap-1">
              <Link to={createPageUrl("Dashboard")}>
                <Button variant="ghost" className="text-cyan-400 bg-cyan-500/10">Dashboard</Button>
              </Link>
              <Link to={createPageUrl("AdvancedDashboard")}>
                <Button variant="ghost" className="text-slate-400 hover:text-white">Analytics</Button>
              </Link>
              <Link to={createPageUrl("Assets")}>
                <Button variant="ghost" className="text-slate-400 hover:text-white">Assets</Button>
              </Link>
              <Link to={createPageUrl("Vulnerabilities")}>
                <Button variant="ghost" className="text-slate-400 hover:text-white">Vulnerabilities</Button>
              </Link>
              <Link to={createPageUrl("RemediationTasks")}>
                <Button variant="ghost" className="text-slate-400 hover:text-white">Tasks</Button>
              </Link>
              <Link to={createPageUrl("Teams")}>
                <Button variant="ghost" className="text-slate-400 hover:text-white">Teams</Button>
              </Link>
              <Link to={createPageUrl("IncidentResponse")}>
                <Button variant="ghost" className="text-slate-400 hover:text-white">Incidents</Button>
              </Link>
              <Link to={createPageUrl("PredictiveAnalysis")}>
                <Button variant="ghost" className="text-slate-400 hover:text-white">Predictions</Button>
              </Link>
              <Link to={createPageUrl("ComplianceReports")}>
                <Button variant="ghost" className="text-slate-400 hover:text-white">Compliance</Button>
              </Link>
              <Link to={createPageUrl("ThreatHunting")}>
                <Button variant="ghost" className="text-slate-400 hover:text-white">Threat Hunting</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">Security Overview</h2>
          <p className="text-slate-400 mt-1">AI-powered vulnerability intelligence at a glance</p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            title="Open Vulnerabilities"
            value={openVulns.length}
            icon={ShieldAlert}
            variant="default"
            trend="down"
            trendValue="12% from last week"
          />
          <MetricCard
            title="Critical & High"
            value={criticalCount + highCount}
            subtitle={`${criticalCount} critical, ${highCount} high`}
            icon={Target}
            variant="danger"
          />
          <MetricCard
            title="AI Auto-Assigned"
            value={`${vulnerabilities.length > 0 ? Math.round((assignedCount / vulnerabilities.length) * 100) : 0}%`}
            subtitle={`${assignedCount} of ${vulnerabilities.length} vulns`}
            icon={Sparkles}
            variant="success"
          />
          <MetricCard
            title="Noise Reduced"
            value={suppressedCount}
            subtitle="Non-production filtered"
            icon={TrendingDown}
            variant="info"
          />
        </div>

        {/* Trend Analysis Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-semibold text-white">Trend Analysis</h3>
            </div>
            <Tabs value={trendPeriod} onValueChange={setTrendPeriod}>
              <TabsList className="bg-slate-900/50 border border-slate-800">
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {trendsLoading ? (
            <div className="h-96 bg-slate-900/50 rounded-2xl animate-pulse" />
          ) : trendData?.success ? (
            <>
              <div className="grid grid-cols-1 gap-6 mb-6">
                <TrendChart 
                  data={trendData.time_series} 
                  anomaly={trendData.anomaly}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <SeverityTrendChart 
                  current={trendData.current_metrics}
                  previous={null}
                />
                <TeamTrendChart data={trendData.team_trends.slice(0, 6)} />
                <AssetTrendChart data={trendData.asset_trends} />
              </div>
            </>
          ) : null}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* PCE: Thresholds from planning/prioritization.md Section 2.1 */}
          <OwnershipChart
            data={{
              highConfidence: vulnerabilities.filter(v => v.ownership_confidence >= CONFIDENCE_THRESHOLDS.HIGH).length,
              medConfidence: vulnerabilities.filter(v => v.ownership_confidence >= CONFIDENCE_THRESHOLDS.MEDIUM && v.ownership_confidence < CONFIDENCE_THRESHOLDS.HIGH).length,
              needsReview: vulnerabilities.filter(v => v.ownership_confidence && v.ownership_confidence < CONFIDENCE_THRESHOLDS.MEDIUM).length,
              unassigned: vulnerabilities.filter(v => !v.assigned_team).length
            }}
          />
          <NoiseReductionStats 
            suppressedCount={suppressedCount}
            totalCount={vulnerabilities.length}
          />
        </div>

        {/* Priority Vulnerabilities */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                Priority Vulnerabilities
              </h3>
              <Link to={createPageUrl("Vulnerabilities")}>
                <Button variant="ghost" className="text-slate-400 hover:text-cyan-400 text-sm">
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="space-y-3">
              {isLoading ? (
                <div className="space-y-3">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="h-24 rounded-xl bg-slate-900/50 animate-pulse" />
                  ))}
                </div>
              ) : recentCritical.length > 0 ? (
                recentCritical.map(vuln => (
                  <Link key={vuln.id} to={createPageUrl(`VulnerabilityDetail?id=${vuln.id}`)}>
                    <VulnerabilityCard vulnerability={vuln} compact />
                  </Link>
                ))
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No critical vulnerabilities found</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-400" />
                Needs Review
              </h3>
            </div>
            <div className="space-y-3">
              {vulnsNeedingReview.length > 0 ? (
                vulnsNeedingReview.map(vuln => (
                  <Link key={vuln.id} to={createPageUrl(`VulnerabilityDetail?id=${vuln.id}`)}>
                    <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-900/30 hover:border-amber-800/50 transition-colors">
                      <p className="text-sm font-medium text-white truncate">{vuln.title}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-amber-400">
                          {vuln.assigned_team ? `${vuln.ownership_confidence}% confidence` : 'Unassigned'}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">All assigned with high confidence</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
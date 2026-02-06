import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SeverityCriticalityHeatmap from "@/components/analytics/SeverityCriticalityHeatmap";
import AttackVectorChart from "@/components/analytics/AttackVectorChart";
import RiskPostureChart from "@/components/analytics/RiskPostureChart";
import TrendTimelineChart from "@/components/analytics/TrendTimelineChart";
import {
  ShieldAlert,
  Loader2,
  Sparkles,
  TrendingDown,
  Target,
  BarChart3
} from "lucide-react";

export default function AdvancedDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboardInsights'],
    queryFn: async () => {
      const result = await base44.functions.invoke('generateDashboardInsights', {});
      return result.data;
    },
    refetchInterval: 60000 // Refresh every minute
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800/50 bg-slate-900/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to={createPageUrl("Dashboard")} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">VIOE</h1>
                <p className="text-xs text-slate-500">Advanced Analytics</p>
              </div>
            </Link>
            
            <nav className="flex items-center gap-1">
              <Link to={createPageUrl("Dashboard")}>
                <Button variant="ghost" className="text-slate-400 hover:text-white">Dashboard</Button>
              </Link>
              <Link to={createPageUrl("AdvancedDashboard")}>
                <Button variant="ghost" className="text-cyan-400 bg-cyan-500/10">Analytics</Button>
              </Link>
              <Link to={createPageUrl("Vulnerabilities")}>
                <Button variant="ghost" className="text-slate-400 hover:text-white">Vulnerabilities</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">Advanced Security Analytics</h2>
          <p className="text-slate-400 mt-1">AI-powered insights and trend analysis</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        ) : data?.success ? (
          <div className="space-y-6">
            {/* Executive Summary */}
            {data.insights?.executive_summary && (
              <div className="bg-gradient-to-r from-purple-950/30 to-indigo-950/30 border border-purple-900/50 rounded-2xl p-6">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-6 h-6 text-purple-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-semibold text-purple-400 mb-2">Executive Summary</h3>
                    <p className="text-slate-300 leading-relaxed">{data.insights.executive_summary}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <BarChart3 className="w-5 h-5 text-cyan-400" />
                  <span className="text-sm text-slate-400">Resolution Rate</span>
                </div>
                <p className="text-3xl font-bold text-white">{data.raw_data?.resolution_rate || 0}%</p>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingDown className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm text-slate-400">Risk Reduction</span>
                </div>
                <p className="text-3xl font-bold text-white">
                  {data.insights?.risk_reduction_metrics?.improvement_percentage || 0}%
                </p>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <Target className="w-5 h-5 text-amber-400" />
                  <span className="text-sm text-slate-400">Tasks Completed</span>
                </div>
                <p className="text-3xl font-bold text-white">{data.raw_data?.completed_tasks || 0}</p>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <ShieldAlert className="w-5 h-5 text-red-400" />
                  <span className="text-sm text-slate-400">Open Issues</span>
                </div>
                <p className="text-3xl font-bold text-white">{data.raw_data?.open_vulnerabilities || 0}</p>
              </div>
            </div>

            {/* Trend Analysis */}
            <TrendTimelineChart 
              data={data.raw_data?.trend_data || []}
              summary={data.insights?.trend_summary}
            />

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Severity-Criticality Correlation */}
              <SeverityCriticalityHeatmap 
                data={data.raw_data?.severity_criticality || {}}
                criticalCombinations={data.insights?.critical_combinations || []}
              />

              {/* Attack Vectors */}
              <AttackVectorChart 
                data={data.raw_data?.attack_vectors || {}}
                analysis={data.insights?.attack_vector_analysis || []}
              />
            </div>

            {/* Risk Posture Reduction */}
            <RiskPostureChart 
              metrics={data.insights?.risk_reduction_metrics}
            />

            {/* Strategic Recommendations */}
            {data.insights?.strategic_recommendations?.length > 0 && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">
                  Strategic Recommendations
                </h3>
                <div className="space-y-2">
                  {data.insights.strategic_recommendations.map((rec, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-900/50">
                      <p className="text-sm text-slate-300 flex items-start gap-2">
                        <span className="text-indigo-400 mt-0.5">•</span>
                        <span>{rec}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16 text-slate-500">
            <p>Failed to load dashboard insights</p>
          </div>
        )}
      </main>
    </div>
  );
}
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ThreatPredictionCard from "@/components/predictive/ThreatPredictionCard";
import VulnerabilityPatternChart from "@/components/predictive/VulnerabilityPatternChart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldAlert,
  Play,
  Loader2,
  TrendingUp,
  AlertTriangle,
  Target,
  Sparkles,
  Brain,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function PredictiveAnalysis() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('60d');
  const queryClient = useQueryClient();

  const { data: analyses = [], isLoading } = useQuery({
    queryKey: ['predictiveAnalyses'],
    queryFn: () => base44.entities.PredictiveAnalysis.list('-analysis_date', 5),
  });

  const generateMutation = useMutation({
    mutationFn: async (period) => {
      const result = await base44.functions.invoke('generatePredictiveAnalysis', {
        prediction_period: period
      });
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['predictiveAnalyses']);
      setIsGenerating(false);
    },
    onError: () => {
      setIsGenerating(false);
    }
  });

  const latestAnalysis = analyses[0];

  const priorityColors = {
    critical: "bg-red-500/10 text-red-400 border-red-500/20",
    high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    low: "bg-blue-500/10 text-blue-400 border-blue-500/20"
  };

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
                <p className="text-xs text-slate-500">Predictive Intelligence</p>
              </div>
            </Link>
            
            <nav className="flex items-center gap-1">
              <Link to={createPageUrl("Dashboard")}>
                <Button variant="ghost" className="text-slate-400 hover:text-white">Dashboard</Button>
              </Link>
              <Link to={createPageUrl("Vulnerabilities")}>
                <Button variant="ghost" className="text-slate-400 hover:text-white">Vulnerabilities</Button>
              </Link>
              <Link to={createPageUrl("PredictiveAnalysis")}>
                <Button variant="ghost" className="text-cyan-400 bg-cyan-500/10">Predictions</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Brain className="w-7 h-7 text-purple-400" />
              Predictive Vulnerability Analysis
            </h2>
            <p className="text-slate-400 mt-1">AI-powered forecasting of emerging threats and vulnerabilities</p>
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="30d">30 Days</option>
              <option value="60d">60 Days</option>
              <option value="90d">90 Days</option>
            </select>
            <Button
              onClick={() => {
                setIsGenerating(true);
                generateMutation.mutate(selectedPeriod);
              }}
              disabled={isGenerating}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Generate Predictions
                </>
              )}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        ) : !latestAnalysis ? (
          <div className="text-center py-16 bg-slate-900/30 rounded-2xl border border-slate-800">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-slate-700" />
            <h3 className="text-lg font-medium text-slate-400">No predictions yet</h3>
            <p className="text-slate-500 mt-1 mb-4">Generate your first predictive analysis</p>
            <Button onClick={() => generateMutation.mutate(selectedPeriod)} className="bg-purple-600 hover:bg-purple-500">
              <Play className="w-4 h-4 mr-2" />
              Start Analysis
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Executive Summary */}
            {latestAnalysis.executive_summary && (
              <div className="bg-gradient-to-r from-purple-950/30 to-indigo-950/30 border border-purple-900/50 rounded-2xl p-6">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-6 h-6 text-purple-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-purple-400">Executive Summary</h3>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20">
                          {latestAnalysis.confidence_score}% Confidence
                        </Badge>
                        <Badge variant="outline" className="text-slate-400 border-slate-700">
                          {latestAnalysis.prediction_period}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-slate-300 leading-relaxed">{latestAnalysis.executive_summary}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Threat Intelligence Summary */}
            {latestAnalysis.threat_intelligence_summary && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-slate-400 mb-2">CVE Trends</h4>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {latestAnalysis.threat_intelligence_summary.cve_trends}
                  </p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-slate-400 mb-2">Exploit Activity</h4>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {latestAnalysis.threat_intelligence_summary.exploit_activity}
                  </p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-slate-400 mb-2">Industry Threats</h4>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {latestAnalysis.threat_intelligence_summary.industry_threats}
                  </p>
                </div>
              </div>
            )}

            {/* Emerging Threats */}
            {latestAnalysis.emerging_threats?.length > 0 && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Predicted Emerging Threats ({latestAnalysis.emerging_threats.length})
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  {latestAnalysis.emerging_threats.map((threat, idx) => (
                    <ThreatPredictionCard key={idx} threat={threat} />
                  ))}
                </div>
              </div>
            )}

            {/* Vulnerability Patterns */}
            {latestAnalysis.vulnerability_patterns?.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <VulnerabilityPatternChart patterns={latestAnalysis.vulnerability_patterns} />

                {/* Architectural Risks */}
                {latestAnalysis.architectural_risks?.length > 0 && (
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Architectural Risk Areas
                    </h3>
                    <div className="space-y-3">
                      {latestAnalysis.architectural_risks.map((risk, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-semibold text-white">{risk.risk_area}</h4>
                            <Badge className={cn(
                              "text-xs",
                              risk.vulnerability_probability >= 70 ? "bg-red-500/10 text-red-400" :
                              risk.vulnerability_probability >= 50 ? "bg-orange-500/10 text-orange-400" :
                              "bg-amber-500/10 text-amber-400"
                            )}>
                              {risk.vulnerability_probability}% Probability
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-400 mb-2">{risk.description}</p>
                          <div className="p-2 rounded bg-emerald-950/20 border border-emerald-900/50">
                            <p className="text-xs text-emerald-400">Prevention: {risk.prevention_strategy}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Recommendations */}
            {latestAnalysis.recommendations?.length > 0 && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Proactive Recommendations
                </h3>
                <div className="space-y-3">
                  {latestAnalysis.recommendations.map((rec, idx) => (
                    <div key={idx} className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-white">{rec.action}</h4>
                        <Badge className={cn("text-xs border", priorityColors[rec.priority])}>
                          {rec.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-400 mb-2">{rec.rationale}</p>
                      <div className="p-2 rounded bg-blue-950/20 border border-blue-900/50">
                        <p className="text-xs text-blue-400">Expected Impact: {rec.expected_impact}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldAlert,
  Play,
  Loader2,
  Target,
  Shield,
  AlertTriangle,
  TrendingUp,
  Lock,
  Unlock,
  Database,
  Users,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ThreatModeling() {
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  const { data: threatModels = [], isLoading } = useQuery({
    queryKey: ['threatModels'],
    queryFn: () => base44.entities.ThreatModel.list('-model_date', 5),
  });

  const generateModelMutation = useMutation({
    mutationFn: async () => {
      const result = await base44.functions.invoke('generateThreatModel', {});
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['threatModels']);
      setIsGenerating(false);
    },
    onError: () => {
      setIsGenerating(false);
    }
  });

  const latestModel = threatModels[0];

  const severityColors = {
    critical: "bg-red-500/10 text-red-400 border-red-500/20",
    high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    low: "bg-blue-500/10 text-blue-400 border-blue-500/20"
  };

  const likelihoodColors = {
    very_high: "text-red-400",
    high: "text-orange-400",
    medium: "text-amber-400",
    low: "text-blue-400",
    very_low: "text-slate-400"
  };

  const strideCategories = [
    { key: 'spoofing', icon: Users, color: 'text-red-400', label: 'Spoofing' },
    { key: 'tampering', icon: AlertTriangle, color: 'text-orange-400', label: 'Tampering' },
    { key: 'repudiation', icon: Shield, color: 'text-amber-400', label: 'Repudiation' },
    { key: 'information_disclosure', icon: Unlock, color: 'text-purple-400', label: 'Info Disclosure' },
    { key: 'denial_of_service', icon: Target, color: 'text-pink-400', label: 'DoS' },
    { key: 'elevation_of_privilege', icon: Lock, color: 'text-cyan-400', label: 'Privilege Escalation' }
  ];

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
                <p className="text-xs text-slate-500">Vulnerability Intelligence</p>
              </div>
            </Link>
            
            <nav className="flex items-center gap-1">
              <Link to={createPageUrl("Dashboard")}>
                <Button variant="ghost" className="text-slate-400 hover:text-white">Dashboard</Button>
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
              <Link to={createPageUrl("CodebaseAnalysis")}>
                <Button variant="ghost" className="text-slate-400 hover:text-white">Analysis</Button>
              </Link>
              <Link to={createPageUrl("ThreatModeling")}>
                <Button variant="ghost" className="text-cyan-400 bg-cyan-500/10">Threat Model</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Threat Modeling</h2>
            <p className="text-slate-400 mt-1">AI-powered STRIDE analysis and attack vector identification</p>
          </div>
          
          <Button
            onClick={() => {
              setIsGenerating(true);
              generateModelMutation.mutate();
            }}
            disabled={isGenerating}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Generate Threat Model
              </>
            )}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        ) : !latestModel ? (
          <div className="text-center py-16 bg-slate-900/30 rounded-2xl border border-slate-800">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-slate-700" />
            <h3 className="text-lg font-medium text-slate-400">No threat models yet</h3>
            <p className="text-slate-500 mt-1 mb-4">Generate your first threat model analysis</p>
            <Button onClick={() => generateModelMutation.mutate()} className="bg-purple-600 hover:bg-purple-500">
              <Play className="w-4 h-4 mr-2" />
              Start Analysis
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Executive Summary */}
            {latestModel.executive_summary && (
              <div className="bg-gradient-to-r from-purple-950/30 to-indigo-950/30 border border-purple-900/50 rounded-2xl p-6">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-6 h-6 text-purple-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-semibold text-purple-400 mb-2">Executive Summary</h3>
                    <p className="text-slate-300 leading-relaxed">{latestModel.executive_summary}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Risk Matrix */}
            {latestModel.risk_matrix && (
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-5">
                  <p className="text-sm text-red-400 mb-2">Critical Risk</p>
                  <p className="text-3xl font-bold text-white">{latestModel.risk_matrix.critical}</p>
                </div>
                <div className="bg-orange-950/30 border border-orange-900/50 rounded-xl p-5">
                  <p className="text-sm text-orange-400 mb-2">High Risk</p>
                  <p className="text-3xl font-bold text-white">{latestModel.risk_matrix.high}</p>
                </div>
                <div className="bg-amber-950/30 border border-amber-900/50 rounded-xl p-5">
                  <p className="text-sm text-amber-400 mb-2">Medium Risk</p>
                  <p className="text-3xl font-bold text-white">{latestModel.risk_matrix.medium}</p>
                </div>
                <div className="bg-blue-950/30 border border-blue-900/50 rounded-xl p-5">
                  <p className="text-sm text-blue-400 mb-2">Low Risk</p>
                  <p className="text-3xl font-bold text-white">{latestModel.risk_matrix.low}</p>
                </div>
              </div>
            )}

            {/* STRIDE Analysis */}
            {latestModel.stride_analysis && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  STRIDE Analysis
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {strideCategories.map(({ key, icon: Icon, color, label }) => (
                    <div key={key} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={cn("w-4 h-4", color)} />
                        <h4 className="text-sm font-semibold text-white">{label}</h4>
                      </div>
                      <p className="text-xs text-slate-400 mb-2">
                        {latestModel.stride_analysis[key]?.length || 0} threats identified
                      </p>
                      {latestModel.stride_analysis[key]?.slice(0, 2).map((threat, idx) => (
                        <p key={idx} className="text-xs text-slate-500 mt-1 truncate">
                          • {threat}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attack Vectors */}
            {latestModel.attack_vectors?.length > 0 && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Attack Vectors
                </h3>
                <div className="space-y-4">
                  {latestModel.attack_vectors.map((vector, idx) => (
                    <div key={idx} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <h4 className="font-semibold text-white">{vector.name}</h4>
                          <p className="text-xs text-slate-500 mt-1">{vector.category}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={cn("text-xs border", severityColors[vector.severity])}>
                            {vector.severity}
                          </Badge>
                          <Badge variant="outline" className={cn("text-xs border-slate-700", likelihoodColors[vector.likelihood])}>
                            {vector.likelihood?.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>

                      <p className="text-sm text-slate-300 mb-3">{vector.description}</p>

                      <div className="space-y-3">
                        <div className="p-3 rounded bg-red-950/20 border border-red-900/50">
                          <p className="text-xs font-medium text-red-400 mb-1">Attack Scenario:</p>
                          <p className="text-xs text-slate-300">{vector.attack_scenario}</p>
                        </div>

                        {vector.affected_assets?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            <p className="text-xs text-slate-500 w-full mb-1">Affected Assets:</p>
                            {vector.affected_assets.map((asset, i) => (
                              <Badge key={i} variant="outline" className="text-xs border-slate-700 text-slate-400">
                                {asset}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="p-3 rounded bg-emerald-950/20 border border-emerald-900/50">
                          <p className="text-xs font-medium text-emerald-400 mb-2">Mitigation Strategies:</p>
                          <ul className="space-y-1">
                            {vector.mitigation_strategies?.map((strategy, i) => (
                              <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                                <span className="text-emerald-400 mt-0.5">•</span>
                                <span>{strategy}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trust Boundaries */}
            {latestModel.trust_boundaries?.length > 0 && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Trust Boundaries
                </h3>
                <div className="space-y-3">
                  {latestModel.trust_boundaries.map((boundary, idx) => (
                    <div key={idx} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                      <h4 className="font-semibold text-white mb-2">{boundary.boundary}</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs font-medium text-red-400 mb-1">Risks:</p>
                          <ul className="space-y-1">
                            {boundary.risks?.map((risk, i) => (
                              <li key={i} className="text-xs text-slate-400">• {risk}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-emerald-400 mb-1">Controls:</p>
                          <ul className="space-y-1">
                            {boundary.controls?.map((control, i) => (
                              <li key={i} className="text-xs text-slate-400">• {control}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {latestModel.recommendations?.length > 0 && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Strategic Recommendations
                </h3>
                <div className="space-y-3">
                  {latestModel.recommendations.map((rec, idx) => (
                    <div key={idx} className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-white">{rec.action}</h4>
                        <Badge className={cn("text-xs",
                          rec.priority === 'immediate' ? 'bg-red-500/10 text-red-400' :
                          rec.priority === 'short-term' ? 'bg-orange-500/10 text-orange-400' :
                          rec.priority === 'medium-term' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-blue-500/10 text-blue-400'
                        )}>
                          {rec.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-400">{rec.expected_impact}</p>
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
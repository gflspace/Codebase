import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ShieldAlert,
  Play,
  Loader2,
  AlertTriangle,
  Package,
  Code,
  Shield,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  FileCode,
  Sparkles
} from "lucide-react";

export default function CodebaseAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const queryClient = useQueryClient();

  const { data: analyses = [], isLoading } = useQuery({
    queryKey: ['codebaseAnalyses'],
    queryFn: () => base44.entities.CodebaseAnalysis.list('-analysis_date', 10),
  });

  const runAnalysisMutation = useMutation({
    mutationFn: async () => {
      const result = await base44.functions.invoke('analyzeCodebase', { scope: 'full' });
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['codebaseAnalyses']);
      setIsAnalyzing(false);
    },
    onError: () => {
      setIsAnalyzing(false);
    }
  });

  const latestAnalysis = analyses[0];

  const severityColors = {
    critical: "bg-red-500/10 text-red-400 border-red-500/20",
    high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    low: "bg-blue-500/10 text-blue-400 border-blue-500/20"
  };

  const patternColors = {
    strong: "text-emerald-400",
    comprehensive: "text-emerald-400",
    robust: "text-emerald-400",
    adequate: "text-cyan-400",
    partial: "text-amber-400",
    weak: "text-orange-400",
    poor: "text-orange-400",
    minimal: "text-red-400",
    missing: "text-red-400",
    none: "text-red-400"
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800/50 bg-slate-900/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl("Dashboard")} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">VIOE</h1>
                  <p className="text-xs text-slate-500">Vulnerability Intelligence</p>
                </div>
              </Link>
            </div>
            
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
                <Button variant="ghost" className="text-cyan-400 bg-cyan-500/10">Analysis</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Codebase Security Analysis</h2>
            <p className="text-slate-400 mt-1">AI-powered comprehensive security assessment</p>
          </div>
          
          <Button
            onClick={() => {
              setIsAnalyzing(true);
              runAnalysisMutation.mutate();
            }}
            disabled={isAnalyzing}
            className="bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run New Analysis
              </>
            )}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        ) : !latestAnalysis ? (
          <div className="text-center py-16 bg-slate-900/30 rounded-2xl border border-slate-800">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-slate-700" />
            <h3 className="text-lg font-medium text-slate-400">No analyses yet</h3>
            <p className="text-slate-500 mt-1 mb-4">Run your first comprehensive codebase security analysis</p>
            <Button onClick={() => runAnalysisMutation.mutate()} className="bg-cyan-600 hover:bg-cyan-500">
              <Play className="w-4 h-4 mr-2" />
              Start Analysis
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="w-5 h-5 text-cyan-400" />
                  <span className="text-sm text-slate-400">Risk Score</span>
                </div>
                <p className="text-3xl font-bold text-white">{latestAnalysis.overall_risk_score || 0}</p>
                <Progress value={latestAnalysis.overall_risk_score || 0} className="h-1.5 mt-2" />
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <AlertTriangle className="w-5 h-5 text-orange-400" />
                  <span className="text-sm text-slate-400">Architecture</span>
                </div>
                <p className="text-3xl font-bold text-white">{latestAnalysis.architectural_findings?.length || 0}</p>
                <p className="text-xs text-slate-500 mt-1">Findings</p>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <Package className="w-5 h-5 text-amber-400" />
                  <span className="text-sm text-slate-400">Dependencies</span>
                </div>
                <p className="text-3xl font-bold text-white">{latestAnalysis.dependency_issues?.length || 0}</p>
                <p className="text-xs text-slate-500 mt-1">Issues</p>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <Code className="w-5 h-5 text-red-400" />
                  <span className="text-sm text-slate-400">Logic Flaws</span>
                </div>
                <p className="text-3xl font-bold text-white">{latestAnalysis.logic_flaws?.length || 0}</p>
                <p className="text-xs text-slate-500 mt-1">Detected</p>
              </div>
            </div>

            {/* AI Summary */}
            {latestAnalysis.ai_summary && (
              <div className="bg-gradient-to-r from-cyan-950/30 to-indigo-950/30 border border-cyan-900/50 rounded-2xl p-6">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-6 h-6 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-2">Executive Summary</h3>
                    <p className="text-slate-300 leading-relaxed">{latestAnalysis.ai_summary}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Security Patterns */}
            {latestAnalysis.security_patterns && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">Security Patterns</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(latestAnalysis.security_patterns).map(([key, value]) => (
                    <div key={key} className="p-4 rounded-xl bg-slate-800/30">
                      <p className="text-xs text-slate-500 mb-2">{key.replace(/_/g, ' ')}</p>
                      <p className={`text-sm font-bold capitalize ${patternColors[value]}`}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Architectural Findings */}
            {latestAnalysis.architectural_findings?.length > 0 && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Architectural Weaknesses
                </h3>
                <div className="space-y-3">
                  {latestAnalysis.architectural_findings.map((finding, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-white">{finding.title}</h4>
                          <Badge className={`mt-1 text-xs border ${severityColors[finding.severity]}`}>
                            {finding.severity}
                          </Badge>
                        </div>
                        <Badge variant="outline" className="border-slate-700 text-slate-400 text-xs">
                          {finding.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-400 mb-3">{finding.description}</p>
                      {finding.affected_components?.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs text-slate-500 mb-1">Affected Components:</p>
                          <div className="flex flex-wrap gap-1">
                            {finding.affected_components.map((comp, i) => (
                              <Badge key={i} variant="outline" className="text-xs border-slate-700 text-slate-400">
                                {comp}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/50">
                        <p className="text-xs font-medium text-emerald-400 mb-1">Remediation Strategy:</p>
                        <p className="text-xs text-slate-300">{finding.remediation_strategy}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dependency Issues */}
            {latestAnalysis.dependency_issues?.length > 0 && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Dependency Security Issues
                </h3>
                <div className="space-y-3">
                  {latestAnalysis.dependency_issues.map((issue, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <h4 className="font-mono text-sm font-semibold text-white">{issue.package_name}</h4>
                          <p className="text-xs text-slate-500 mt-1">
                            {issue.current_version} → {issue.recommended_version}
                          </p>
                        </div>
                        <Badge className={`text-xs border ${severityColors[issue.severity]}`}>
                          {issue.severity}
                        </Badge>
                      </div>
                      {issue.vulnerabilities?.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-slate-500 mb-1">Known Vulnerabilities:</p>
                          <ul className="space-y-1">
                            {issue.vulnerabilities.map((vuln, i) => (
                              <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                                <span className="text-red-400 mt-0.5">•</span>
                                <span>{vuln}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Logic Flaws */}
            {latestAnalysis.logic_flaws?.length > 0 && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  Logic Flaws & Vulnerabilities
                </h3>
                <div className="space-y-3">
                  {latestAnalysis.logic_flaws.map((flaw, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h4 className="font-semibold text-white">{flaw.title}</h4>
                        <Badge className={`text-xs border ${severityColors[flaw.severity]}`}>
                          {flaw.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-400 mb-3">{flaw.description}</p>
                      {flaw.file_path && (
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                          <FileCode className="w-3.5 h-3.5" />
                          <code className="text-cyan-400">{flaw.file_path}</code>
                        </div>
                      )}
                      {flaw.code_snippet && (
                        <pre className="bg-slate-900 rounded p-3 text-xs text-slate-300 overflow-x-auto mb-3">
                          {flaw.code_snippet}
                        </pre>
                      )}
                      <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/50">
                        <p className="text-xs font-medium text-emerald-400 mb-1">Suggested Fix:</p>
                        <p className="text-xs text-slate-300">{flaw.suggested_fix}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Remediation Roadmap */}
            {latestAnalysis.remediation_roadmap?.length > 0 && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Remediation Roadmap
                </h3>
                <div className="space-y-4">
                  {latestAnalysis.remediation_roadmap.map((phase, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-800/30 border border-slate-700">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-white">{phase.phase}</h4>
                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs ${
                            phase.priority === 'immediate' ? 'bg-red-500/10 text-red-400' :
                            phase.priority === 'short-term' ? 'bg-orange-500/10 text-orange-400' :
                            phase.priority === 'medium-term' ? 'bg-amber-500/10 text-amber-400' :
                            'bg-blue-500/10 text-blue-400'
                          }`}>
                            {phase.priority}
                          </Badge>
                          <Badge variant="outline" className="text-xs border-slate-700 text-slate-400">
                            {phase.estimated_effort}
                          </Badge>
                        </div>
                      </div>
                      <ul className="space-y-1">
                        {phase.actions?.map((action, i) => (
                          <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
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
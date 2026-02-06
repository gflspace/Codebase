import { Badge } from "@/components/ui/badge";
import { Target, AlertTriangle, Shield, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProactiveInsightsPanel({ insights }) {
  if (!insights) return null;

  const severityColors = {
    critical: "bg-red-500/10 text-red-400 border-red-500/20",
    high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    low: "bg-blue-500/10 text-blue-400 border-blue-500/20"
  };

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      {insights.executive_summary && (
        <div className="p-4 rounded-lg bg-purple-950/20 border border-purple-900/50">
          <h3 className="text-sm font-semibold text-purple-400 mb-2">Executive Summary</h3>
          <p className="text-sm text-slate-300">{insights.executive_summary}</p>
        </div>
      )}

      {/* Potential Vulnerabilities */}
      {insights.potential_vulnerabilities?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-red-400" />
            Predicted Vulnerabilities ({insights.potential_vulnerabilities.length})
          </h3>
          <div className="space-y-3">
            {insights.potential_vulnerabilities.map((vuln, i) => (
              <div key={i} className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-white text-sm">{vuln.title}</h4>
                    <p className="text-xs text-slate-500 mt-1">{vuln.vulnerability_type}</p>
                  </div>
                  <Badge className={cn("text-xs border", severityColors[vuln.severity])}>
                    {vuln.severity}
                  </Badge>
                </div>

                <p className="text-xs text-slate-400 mb-3">{vuln.description}</p>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <span className="text-xs text-slate-500">Confidence:</span>
                    <span className={cn(
                      "text-xs ml-2 font-bold",
                      vuln.confidence_score >= 80 ? "text-red-400" : 
                      vuln.confidence_score >= 60 ? "text-orange-400" : "text-amber-400"
                    )}>
                      {vuln.confidence_score}%
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Priority Score:</span>
                    <span className="text-xs ml-2 text-white">{vuln.priority_score}</span>
                  </div>
                </div>

                {vuln.affected_assets?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-slate-500 mb-1">Affected Assets:</p>
                    <div className="flex flex-wrap gap-1">
                      {vuln.affected_assets.map((asset, j) => (
                        <Badge key={j} variant="outline" className="text-xs border-slate-700 text-slate-400">
                          {asset}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {vuln.threat_correlation && (
                  <div className="p-2 rounded bg-orange-950/20 border border-orange-900/50 mb-3">
                    <p className="text-xs text-orange-400">
                      <strong>Threat:</strong> {vuln.threat_correlation}
                    </p>
                  </div>
                )}

                {vuln.remediation_steps?.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Recommended Actions:</p>
                    <div className="space-y-1">
                      {vuln.remediation_steps.slice(0, 2).map((step, j) => (
                        <p key={j} className="text-xs text-slate-400 flex items-start gap-1">
                          <span className="text-cyan-400">•</span>
                          <span>{step}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Asset Risk Matrix */}
      {insights.asset_risk_matrix?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" />
            Asset Risk Assessment
          </h3>
          <div className="space-y-2">
            {insights.asset_risk_matrix.slice(0, 5).map((asset, i) => (
              <div key={i} className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">{asset.asset_name}</span>
                  <Badge className="bg-amber-500/10 text-amber-400 text-xs">
                    {asset.predicted_vulnerabilities} potential vulns
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 mb-2">{asset.threat_exposure}</p>
                {asset.priority_actions?.length > 0 && (
                  <div className="text-xs text-cyan-400">
                    → {asset.priority_actions[0]}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
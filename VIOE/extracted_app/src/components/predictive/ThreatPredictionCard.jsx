import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ThreatPredictionCard({ threat }) {
  const severityColors = {
    critical: "bg-red-500/10 text-red-400 border-red-500/20",
    high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    low: "bg-blue-500/10 text-blue-400 border-blue-500/20"
  };

  const likelihoodColor = threat.likelihood_score >= 70 ? "text-red-400" :
                         threat.likelihood_score >= 50 ? "text-orange-400" :
                         threat.likelihood_score >= 30 ? "text-amber-400" :
                         "text-blue-400";

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-white text-lg mb-1">{threat.threat_name}</h4>
          <p className="text-xs text-slate-500">{threat.threat_category}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge className={cn("text-xs border", severityColors[threat.severity_estimate])}>
            {threat.severity_estimate}
          </Badge>
          <div className="flex items-center gap-1">
            <div className={cn("text-xs font-semibold", likelihoodColor)}>
              {threat.likelihood_score}%
            </div>
            <span className="text-xs text-slate-500">likely</span>
          </div>
        </div>
      </div>

      <p className="text-sm text-slate-300 mb-3">{threat.predicted_impact}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div className="p-3 rounded bg-slate-900/50">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-3 h-3 text-slate-500" />
            <span className="text-xs font-medium text-slate-400">Timeframe</span>
          </div>
          <p className="text-xs text-white">{threat.timeframe}</p>
        </div>

        {threat.affected_components?.length > 0 && (
          <div className="p-3 rounded bg-slate-900/50">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="w-3 h-3 text-slate-500" />
              <span className="text-xs font-medium text-slate-400">Affected Components</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {threat.affected_components.slice(0, 3).map((comp, i) => (
                <Badge key={i} variant="outline" className="text-xs border-slate-700 text-slate-400">
                  {comp}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {threat.indicators?.length > 0 && (
        <div className="mb-3 p-3 rounded bg-amber-950/20 border border-amber-900/50">
          <p className="text-xs font-medium text-amber-400 mb-2">Early Warning Indicators:</p>
          <ul className="space-y-1">
            {threat.indicators.slice(0, 3).map((indicator, i) => (
              <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">•</span>
                <span>{indicator}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {threat.proactive_measures?.length > 0 && (
        <div className="p-3 rounded bg-emerald-950/20 border border-emerald-900/50">
          <p className="text-xs font-medium text-emerald-400 mb-2">Proactive Measures:</p>
          <ul className="space-y-1">
            {threat.proactive_measures.slice(0, 3).map((measure, i) => (
              <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">•</span>
                <span>{measure}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
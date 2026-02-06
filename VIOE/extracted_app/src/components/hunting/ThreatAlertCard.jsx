import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Target, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function ThreatAlertCard({ alert }) {
  const severityColors = {
    critical: "bg-red-500/10 text-red-400 border-red-500/20",
    high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    low: "bg-blue-500/10 text-blue-400 border-blue-500/20"
  };

  const statusColors = {
    new: "bg-red-500/10 text-red-400",
    investigating: "bg-amber-500/10 text-amber-400",
    escalated: "bg-orange-500/10 text-orange-400",
    resolved: "bg-emerald-500/10 text-emerald-400",
    false_positive: "bg-slate-500/10 text-slate-400"
  };

  const getConfidenceColor = (score) => {
    if (score >= 80) return "text-red-400";
    if (score >= 60) return "text-orange-400";
    if (score >= 40) return "text-amber-400";
    return "text-blue-400";
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", severityColors[alert.severity])}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-white truncate">{alert.alert_name}</h4>
            <p className="text-xs text-slate-500">{format(new Date(alert.detection_time), "MMM d, yyyy 'at' h:mm a")}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <Badge className={cn("text-xs border", severityColors[alert.severity])}>
          {alert.severity}
        </Badge>
        <Badge className={cn("text-xs", statusColors[alert.status])}>
          {alert.status}
        </Badge>
        <Badge variant="outline" className="text-xs border-slate-700 text-slate-400">
          {alert.alert_type}
        </Badge>
      </div>

      <p className="text-sm text-slate-300 mb-4 line-clamp-2">{alert.threat_description}</p>

      {alert.attack_chain_phase && (
        <div className="mb-3 p-2 rounded bg-purple-950/20 border border-purple-900/50">
          <div className="flex items-center gap-2">
            <Target className="w-3 h-3 text-purple-400" />
            <span className="text-xs text-purple-400">MITRE ATT&CK: {alert.attack_chain_phase}</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Confidence:</span>
          <span className={cn("text-sm font-bold", getConfidenceColor(alert.confidence_score))}>
            {alert.confidence_score}%
          </span>
        </div>
        {alert.affected_assets?.length > 0 && (
          <Badge variant="outline" className="text-xs border-slate-700 text-slate-400">
            {alert.affected_assets.length} asset{alert.affected_assets.length !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {alert.behavioral_patterns?.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-slate-500 mb-1">Behavioral Patterns:</p>
          <div className="space-y-1">
            {alert.behavioral_patterns.slice(0, 2).map((pattern, i) => (
              <p key={i} className="text-xs text-slate-400 flex items-start gap-1">
                <span className="text-cyan-400">•</span>
                <span>{pattern}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      <Button variant="outline" size="sm" className="w-full border-slate-700 text-slate-300">
        Investigate <ChevronRight className="w-3 h-3 ml-1" />
      </Button>
    </div>
  );
}
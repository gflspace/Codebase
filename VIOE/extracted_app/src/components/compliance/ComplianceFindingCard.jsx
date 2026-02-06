import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ComplianceFindingCard({ finding }) {
  const statusConfig = {
    compliant: { 
      icon: CheckCircle2, 
      color: "text-emerald-400", 
      bg: "bg-emerald-950/20", 
      border: "border-emerald-900/50" 
    },
    partial: { 
      icon: AlertTriangle, 
      color: "text-amber-400", 
      bg: "bg-amber-950/20", 
      border: "border-amber-900/50" 
    },
    non_compliant: { 
      icon: XCircle, 
      color: "text-red-400", 
      bg: "bg-red-950/20", 
      border: "border-red-900/50" 
    },
    not_applicable: { 
      icon: MinusCircle, 
      color: "text-slate-400", 
      bg: "bg-slate-800/20", 
      border: "border-slate-700/50" 
    }
  };

  const severityColors = {
    critical: "bg-red-500/10 text-red-400 border-red-500/20",
    high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    low: "bg-blue-500/10 text-blue-400 border-blue-500/20"
  };

  const config = statusConfig[finding.status] || statusConfig.not_applicable;
  const StatusIcon = config.icon;

  return (
    <div className={cn("rounded-lg border p-4", config.bg, config.border)}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          <StatusIcon className={cn("w-5 h-5 mt-0.5", config.color)} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs border-slate-700 text-slate-400">
                {finding.framework}
              </Badge>
              <Badge variant="outline" className="text-xs border-slate-700 text-slate-400">
                {finding.control_id}
              </Badge>
            </div>
            <h4 className="font-semibold text-white">{finding.control_name}</h4>
          </div>
        </div>
        <Badge className={cn("text-xs border", severityColors[finding.severity])}>
          {finding.severity}
        </Badge>
      </div>

      <p className="text-sm text-slate-300 mb-3">{finding.description}</p>

      {finding.evidence?.length > 0 && (
        <div className="mb-3 p-3 rounded bg-slate-900/50">
          <p className="text-xs font-medium text-emerald-400 mb-2">Evidence:</p>
          <ul className="space-y-1">
            {finding.evidence.map((item, i) => (
              <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                <span className="text-emerald-400">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {finding.gaps?.length > 0 && (
        <div className="mb-3 p-3 rounded bg-red-950/20 border border-red-900/50">
          <p className="text-xs font-medium text-red-400 mb-2">Gaps Identified:</p>
          <ul className="space-y-1">
            {finding.gaps.map((gap, i) => (
              <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                <span className="text-red-400">•</span>
                <span>{gap}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {finding.remediation_actions?.length > 0 && (
        <div className="p-3 rounded bg-cyan-950/20 border border-cyan-900/50">
          <p className="text-xs font-medium text-cyan-400 mb-2">Remediation Actions:</p>
          <ul className="space-y-1">
            {finding.remediation_actions.map((action, i) => (
              <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                <span className="text-cyan-400">→</span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
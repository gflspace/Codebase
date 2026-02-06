import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ControlMappingCard({ mapping }) {
  const statusConfig = {
    compliant: { 
      icon: CheckCircle2, 
      color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
    },
    partial: { 
      icon: AlertTriangle, 
      color: "bg-amber-500/10 text-amber-400 border-amber-500/20" 
    },
    non_compliant: { 
      icon: XCircle, 
      color: "bg-red-500/10 text-red-400 border-red-500/20" 
    }
  };

  const config = statusConfig[mapping.compliance_status] || statusConfig.partial;
  const Icon = config.icon;

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", config.color)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-1">
            <h4 className="font-semibold text-white text-sm">{mapping.control_name}</h4>
            <Badge variant="outline" className="text-xs border-slate-700 text-slate-400">
              {mapping.framework}
            </Badge>
          </div>
          <p className="text-xs text-slate-500">{mapping.control_id}</p>
        </div>
      </div>

      <p className="text-xs text-slate-400 mb-3">{mapping.control_description}</p>

      <div className="space-y-2">
        <div>
          <p className="text-xs text-slate-500 mb-1">Evidence:</p>
          <p className="text-xs text-slate-300">{mapping.evidence_provided}</p>
        </div>

        {mapping.gap_analysis && (
          <div>
            <p className="text-xs text-slate-500 mb-1">Gap Analysis:</p>
            <p className="text-xs text-amber-400">{mapping.gap_analysis}</p>
          </div>
        )}

        {mapping.remediation_required && (
          <div className="p-2 rounded bg-orange-950/20 border border-orange-900/50">
            <p className="text-xs text-orange-400">
              <strong>Required:</strong> {mapping.remediation_required}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
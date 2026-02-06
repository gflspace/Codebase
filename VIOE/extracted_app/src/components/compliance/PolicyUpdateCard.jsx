import { Badge } from "@/components/ui/badge";
import { FileText, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PolicyUpdateCard({ update }) {
  const priorityColors = {
    critical: "bg-red-500/10 text-red-400 border-red-500/20",
    high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    low: "bg-blue-500/10 text-blue-400 border-blue-500/20"
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-indigo-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className="font-semibold text-white">{update.control_name}</h4>
              <p className="text-xs text-slate-500">{update.framework} - {update.control_id}</p>
            </div>
            <Badge className={cn("text-xs border", priorityColors[update.priority])}>
              {update.priority}
            </Badge>
          </div>
          <Badge variant="outline" className="text-xs border-slate-700 text-slate-400 mb-3">
            {update.policy_category}
          </Badge>
        </div>
      </div>

      <div className="space-y-3">
        <div className="p-3 rounded-lg bg-slate-900/50">
          <p className="text-xs text-slate-500 mb-1">Current Gap:</p>
          <p className="text-sm text-slate-300">{update.current_gap}</p>
        </div>

        <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-900/50">
          <p className="text-xs text-indigo-400 mb-1 font-medium">Recommended Policy:</p>
          <p className="text-sm text-slate-300">{update.recommended_policy}</p>
        </div>

        {update.implementation_steps?.length > 0 && (
          <div>
            <p className="text-xs text-slate-500 mb-2">Implementation Steps:</p>
            <div className="space-y-1">
              {update.implementation_steps.map((step, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-400">
                  <ArrowRight className="w-3 h-3 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {update.estimated_effort && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Estimated Effort:</span>
            <span className="text-white">{update.estimated_effort}</span>
          </div>
        )}
      </div>
    </div>
  );
}
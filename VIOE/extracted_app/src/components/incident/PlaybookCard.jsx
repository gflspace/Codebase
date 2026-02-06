import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, CheckCircle2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PlaybookCard({ playbook, onApply }) {
  const severityColors = {
    critical: "bg-red-500/10 text-red-400 border-red-500/20",
    high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    low: "bg-blue-500/10 text-blue-400 border-blue-500/20"
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-white mb-1">{playbook.playbook_name}</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs border-slate-700 text-slate-400">
                {playbook.incident_type}
              </Badge>
              <Badge className={cn("text-xs border", severityColors[playbook.severity_level])}>
                {playbook.severity_level}
              </Badge>
              {playbook.ai_generated && (
                <Badge className="bg-purple-500/10 text-purple-400 text-xs">
                  <Zap className="w-3 h-3 mr-1" />
                  AI Generated
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="text-sm text-slate-400 mb-4">{playbook.description}</p>

      {playbook.response_phases?.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-slate-500 mb-2">Response Phases ({playbook.response_phases.length}):</p>
          <div className="flex flex-wrap gap-1">
            {playbook.response_phases.map((phase, i) => (
              <Badge key={i} variant="outline" className="text-xs border-slate-700 text-slate-400">
                {phase.phase_name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        {playbook.success_rate && (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-emerald-400">{playbook.success_rate}% success rate</span>
          </div>
        )}
        {onApply && (
          <Button
            onClick={() => onApply(playbook)}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-500 text-xs"
          >
            Apply Playbook
          </Button>
        )}
      </div>
    </div>
  );
}
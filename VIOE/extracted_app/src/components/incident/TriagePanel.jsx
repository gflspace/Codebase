import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Target, Search, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TriagePanel({ triage }) {
  if (!triage) return null;

  const priorityColors = {
    immediate: "bg-red-500/10 text-red-400 border-red-500/20",
    urgent: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    high: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    medium: "bg-blue-500/10 text-blue-400 border-blue-500/20"
  };

  return (
    <div className="space-y-4">
      {/* Classification */}
      {triage.incident_classification && (
        <div className="bg-purple-950/20 border border-purple-900/50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-purple-400 mb-3 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Incident Classification
          </h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-slate-500">Type:</span>
              <span className="text-white ml-2">{triage.incident_classification.incident_type}</span>
            </div>
            <div>
              <span className="text-slate-500">Confidence:</span>
              <span className="text-white ml-2">{triage.incident_classification.confidence}%</span>
            </div>
            {triage.incident_classification.attack_technique && (
              <div className="col-span-2">
                <span className="text-slate-500">Technique:</span>
                <span className="text-white ml-2">{triage.incident_classification.attack_technique}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Threat Assessment */}
      {triage.threat_assessment && (
        <div className="bg-red-950/20 border border-red-900/50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Threat Assessment
          </h4>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-slate-500">Threat Level:</span>
              <Badge className={cn("ml-2", priorityColors[triage.threat_assessment.threat_level] || "bg-slate-700")}>
                {triage.threat_assessment.threat_level}
              </Badge>
            </div>
            <div>
              <span className="text-slate-500">Blast Radius:</span>
              <span className="text-white ml-2">{triage.threat_assessment.blast_radius}</span>
            </div>
            <div>
              <span className="text-slate-500">Impact:</span>
              <p className="text-slate-300 mt-1">{triage.threat_assessment.potential_impact}</p>
            </div>
          </div>
        </div>
      )}

      {/* Immediate Containment */}
      {triage.immediate_containment?.length > 0 && (
        <div className="bg-orange-950/20 border border-orange-900/50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-orange-400 mb-3">Immediate Containment Actions</h4>
          <div className="space-y-2">
            {triage.immediate_containment.map((action, i) => (
              <div key={i} className="p-2 rounded bg-slate-800/50 border border-slate-700">
                <div className="flex items-start justify-between mb-1">
                  <span className="text-sm text-white">{action.action}</span>
                  <Badge className={cn("text-xs", priorityColors[action.priority])}>
                    {action.priority}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>{action.estimated_time}</span>
                  {action.automated && <Badge className="bg-cyan-500/10 text-cyan-400">Auto</Badge>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Investigation Plan */}
      {triage.investigation_plan?.length > 0 && (
        <div className="bg-cyan-950/20 border border-cyan-900/50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-cyan-400 mb-3 flex items-center gap-2">
            <Search className="w-4 h-4" />
            Investigation Plan
          </h4>
          <div className="space-y-2">
            {triage.investigation_plan.slice(0, 3).map((item, i) => (
              <div key={i} className="text-sm">
                <p className="text-white font-medium">{item.question}</p>
                <p className="text-xs text-slate-500 mt-1">Source: {item.data_source}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Communication Requirements */}
      {triage.communication_requirements && (
        <div className="bg-indigo-950/20 border border-indigo-900/50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-indigo-400 mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Communication Requirements
          </h4>
          <div className="space-y-2 text-sm">
            {triage.communication_requirements.notify_immediately?.length > 0 && (
              <div>
                <span className="text-slate-500">Notify Immediately:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {triage.communication_requirements.notify_immediately.map((contact, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {contact}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {triage.communication_requirements.external_reporting_needed && (
              <Badge className="bg-amber-500/10 text-amber-400">External Reporting Required</Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  Shield, 
  CheckCircle2, 
  Clock,
  Bell,
  Server
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function IncidentCard({ incident, compact, onClick }) {
  const statusConfig = {
    detected: { color: 'text-red-400', bg: 'bg-red-950/30', border: 'border-red-900/50', icon: AlertTriangle },
    containing: { color: 'text-orange-400', bg: 'bg-orange-950/30', border: 'border-orange-900/50', icon: Shield },
    contained: { color: 'text-amber-400', bg: 'bg-amber-950/30', border: 'border-amber-900/50', icon: Shield },
    investigating: { color: 'text-blue-400', bg: 'bg-blue-950/30', border: 'border-blue-900/50', icon: Clock },
    resolved: { color: 'text-emerald-400', bg: 'bg-emerald-950/30', border: 'border-emerald-900/50', icon: CheckCircle2 },
    closed: { color: 'text-slate-400', bg: 'bg-slate-900/30', border: 'border-slate-800', icon: CheckCircle2 }
  };

  const severityColors = {
    critical: 'bg-red-500/10 text-red-400 border-red-500/20',
    high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    low: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
  };

  const status = statusConfig[incident.status] || statusConfig.detected;
  const StatusIcon = status.icon;

  const detectionTime = new Date(incident.detection_time);
  const timeAgo = Math.floor((Date.now() - detectionTime.getTime()) / 1000 / 60);
  const timeText = timeAgo < 60 ? `${timeAgo}m ago` : 
                   timeAgo < 1440 ? `${Math.floor(timeAgo / 60)}h ago` : 
                   `${Math.floor(timeAgo / 1440)}d ago`;

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={cn(
          "p-4 rounded-xl border transition-all cursor-pointer hover:scale-[1.02]",
          status.bg,
          status.border
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusIcon className={cn("w-5 h-5", status.color)} />
            <div>
              <p className="font-semibold text-white">{incident.incident_id}</p>
              <p className="text-xs text-slate-400">{timeText}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={cn("text-xs border", severityColors[incident.severity])}>
              {incident.severity}
            </Badge>
            <Badge variant="outline" className="text-xs text-slate-400 border-slate-700">
              {incident.status}
            </Badge>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-6 rounded-2xl border transition-all cursor-pointer hover:scale-[1.01]",
        status.bg,
        status.border
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", status.bg)}>
            <StatusIcon className={cn("w-6 h-6", status.color)} />
          </div>
          <div>
            <h3 className="font-bold text-white text-lg">{incident.incident_id}</h3>
            <p className="text-sm text-slate-400">{incident.assigned_team}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge className={cn("text-xs border", severityColors[incident.severity])}>
            {incident.severity}
          </Badge>
          <Badge variant="outline" className={cn("text-xs border-slate-700", status.color)}>
            {incident.status}
          </Badge>
        </div>
      </div>

      {/* AI Assessment Summary */}
      {incident.ai_assessment && (
        <div className="mb-4 p-3 rounded-lg bg-slate-900/50">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-semibold text-purple-400">AI Assessment</span>
          </div>
          <p className="text-xs text-slate-400">
            Threat: {incident.ai_assessment.threat_level} • 
            Priority: {incident.ai_assessment.containment_priority} • 
            Blast Radius: {incident.ai_assessment.blast_radius}
          </p>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-2 rounded bg-slate-900/50">
          <div className="flex items-center gap-1 mb-1">
            <Server className="w-3 h-3 text-slate-500" />
            <span className="text-xs text-slate-500">Assets</span>
          </div>
          <p className="text-sm font-semibold text-white">
            {incident.affected_assets?.length || 0}
          </p>
        </div>
        <div className="p-2 rounded bg-slate-900/50">
          <div className="flex items-center gap-1 mb-1">
            <Shield className="w-3 h-3 text-slate-500" />
            <span className="text-xs text-slate-500">Actions</span>
          </div>
          <p className="text-sm font-semibold text-white">
            {incident.containment_actions?.filter(a => a.status === 'completed').length || 0}/
            {incident.containment_actions?.length || 0}
          </p>
        </div>
        <div className="p-2 rounded bg-slate-900/50">
          <div className="flex items-center gap-1 mb-1">
            <Bell className="w-3 h-3 text-slate-500" />
            <span className="text-xs text-slate-500">Notified</span>
          </div>
          <p className="text-sm font-semibold text-white">
            {incident.notifications_sent?.length || 0}
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="text-xs text-slate-500">
        Detected {timeText} • 
        {incident.response_sla_deadline && (
          <> SLA: {new Date(incident.response_sla_deadline).toLocaleTimeString()}</>
        )}
      </div>
    </div>
  );
}
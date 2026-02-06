import { Badge } from "@/components/ui/badge";
import { Search, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function HuntingSessionCard({ session }) {
  const statusColors = {
    active: "bg-emerald-500/10 text-emerald-400",
    completed: "bg-blue-500/10 text-blue-400",
    paused: "bg-amber-500/10 text-amber-400"
  };

  const completedSteps = session.investigation_steps?.filter(s => s.status === 'completed').length || 0;
  const totalSteps = session.investigation_steps?.length || 0;
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
          <Search className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white text-sm truncate">{session.session_name}</h4>
          <p className="text-xs text-slate-500">{format(new Date(session.start_time), "MMM d, h:mm a")}</p>
        </div>
        <Badge className={cn("text-xs", statusColors[session.status])}>
          {session.status}
        </Badge>
      </div>

      <p className="text-xs text-slate-400 mb-3 line-clamp-2">{session.hunting_hypothesis}</p>

      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-slate-500">Progress</span>
          <span className="text-white">{completedSteps}/{totalSteps} steps</span>
        </div>
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-cyan-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {session.findings?.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-emerald-400">
          <CheckCircle2 className="w-3 h-3" />
          <span>{session.findings.length} finding{session.findings.length !== 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  );
}
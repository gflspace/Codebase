import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import PolicyViolationBadge from "./PolicyViolationBadge";
import {
  CheckCircle2,
  Circle,
  Clock,
  User,
  Calendar,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  MoreVertical,
  Zap
} from "lucide-react";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function TaskCard({ task, onStatusChange, onSync, onClick, compact = false }) {
  const statusConfig = {
    todo: { 
      color: "bg-slate-500/10 text-slate-400 border-slate-500/20", 
      icon: Circle,
      label: "To Do"
    },
    in_progress: { 
      color: "bg-blue-500/10 text-blue-400 border-blue-500/20", 
      icon: RefreshCw,
      label: "In Progress"
    },
    review: { 
      color: "bg-purple-500/10 text-purple-400 border-purple-500/20", 
      icon: AlertCircle,
      label: "In Review"
    },
    completed: { 
      color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", 
      icon: CheckCircle2,
      label: "Completed"
    },
    blocked: { 
      color: "bg-red-500/10 text-red-400 border-red-500/20", 
      icon: AlertCircle,
      label: "Blocked"
    }
  };

  const priorityConfig = {
    critical: { color: "bg-red-500/10 text-red-400 border-red-500/20" },
    high: { color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
    medium: { color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    low: { color: "bg-blue-500/10 text-blue-400 border-blue-500/20" }
  };

  const complexityConfig = {
    trivial: { label: "Trivial", color: "text-slate-500" },
    simple: { label: "Simple", color: "text-green-400" },
    moderate: { label: "Moderate", color: "text-amber-400" },
    complex: { label: "Complex", color: "text-orange-400" },
    critical: { label: "Critical", color: "text-red-400" }
  };

  const config = statusConfig[task.status] || statusConfig.todo;
  const StatusIcon = config.icon;
  const priorityStyle = priorityConfig[task.priority] || priorityConfig.medium;
  const complexityStyle = complexityConfig[task.complexity] || complexityConfig.moderate;

  const completedSubtasks = task.subtasks?.filter(st => st.completed).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const progressPercent = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  if (compact) {
    return (
      <div
        onClick={onClick}
        className="group flex items-center gap-4 p-4 rounded-xl border border-slate-800 bg-slate-900/30 hover:bg-slate-900/60 hover:border-slate-700 cursor-pointer transition-all"
      >
        <div className={cn("p-2 rounded-lg", config.color)}>
          <StatusIcon className="w-4 h-4" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{task.title}</p>
          <div className="flex items-center gap-2 mt-1">
            {task.assigned_to && (
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <User className="w-3 h-3" />
                <span className="truncate max-w-32">{task.assigned_to.split('@')[0]}</span>
              </div>
            )}
            {task.estimated_hours && (
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Clock className="w-3 h-3" />
                <span>{task.estimated_hours}h</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {task.jira_issue_key && (
            <Badge variant="outline" className="border-indigo-700 text-indigo-400 text-xs">
              {task.jira_issue_key}
            </Badge>
          )}
          <Badge className={cn("text-xs border", config.color)}>
            {config.label}
          </Badge>
          {task.policy_check_status && task.policy_check_status !== 'pending' && (
            <PolicyViolationBadge 
              status={task.policy_check_status} 
              violations={task.policy_violations || []}
              compact
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-colors">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 flex-1">
            <div className={cn("p-2.5 rounded-xl", config.color)}>
              <StatusIcon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 
                onClick={onClick}
                className="text-base font-semibold text-white group-hover:text-cyan-50 transition-colors cursor-pointer"
              >
                {task.title}
              </h3>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge className={cn("text-xs border", config.color)}>
                  {config.label}
                </Badge>
                <Badge className={cn("text-xs border", priorityStyle.color)}>
                  {task.priority}
                </Badge>
                {task.complexity && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800/50">
                    <Zap className={cn("w-3 h-3", complexityStyle.color)} />
                    <span className={cn("text-xs font-medium", complexityStyle.color)}>
                      {complexityStyle.label}
                    </span>
                  </div>
                )}
                {task.policy_check_status && task.policy_check_status !== 'pending' && (
                  <PolicyViolationBadge 
                    status={task.policy_check_status} 
                    violations={task.policy_violations || []}
                  />
                )}
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-slate-500 hover:text-white">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-slate-900 border-slate-800">
              <DropdownMenuItem onClick={() => onStatusChange(task, "in_progress")}>
                Mark In Progress
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange(task, "review")}>
                Move to Review
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange(task, "completed")}>
                Mark Completed
              </DropdownMenuItem>
              {task.jira_issue_key && (
                <DropdownMenuItem onClick={() => onSync(task.id)}>
                  Sync from Jira
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {task.description && (
          <p className="text-sm text-slate-400 line-clamp-2 mb-4">
            {task.description}
          </p>
        )}

        {totalSubtasks > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span>Progress</span>
              <span>{completedSubtasks} / {totalSubtasks} subtasks</span>
            </div>
            <Progress value={progressPercent} className="h-1.5 bg-slate-800" />
          </div>
        )}

        <div className="flex items-center gap-4 text-xs text-slate-500">
          {task.assigned_to && (
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span className="truncate max-w-32">{task.assigned_to.split('@')[0]}</span>
            </div>
          )}
          {task.estimated_hours && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{task.estimated_hours}h estimated</span>
            </div>
          )}
          {task.due_date && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Due {format(new Date(task.due_date), "MMM d")}</span>
            </div>
          )}
        </div>
      </div>

      {task.jira_issue_key && (
        <div className="px-6 py-3 border-t border-slate-800/50 bg-slate-900/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
            <span>Synced with Jira</span>
            <Badge variant="outline" className="border-indigo-700 text-indigo-400">
              {task.jira_issue_key}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(task.jira_issue_url, '_blank')}
            className="text-indigo-400 hover:text-indigo-300 h-7"
          >
            View in Jira
          </Button>
        </div>
      )}
    </div>
  );
}
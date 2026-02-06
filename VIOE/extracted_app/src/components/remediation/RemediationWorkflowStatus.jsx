import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  GitPullRequest,
  CheckCircle2,
  Loader2,
  XCircle,
  ExternalLink,
  Play,
  AlertCircle,
  Rocket,
  GitBranch
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function RemediationWorkflowStatus({ task }) {
  const workflowStatus = task.remediation_workflow_status || 'not_started';
  
  const statusConfig = {
    not_started: { 
      icon: Play, 
      label: 'Not Started', 
      color: 'text-slate-400',
      bgColor: 'bg-slate-500/10 border-slate-500/20',
      progress: 0
    },
    pr_creating: { 
      icon: Loader2, 
      label: 'Creating PR', 
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10 border-blue-500/20',
      spin: true,
      progress: 20
    },
    pr_created: { 
      icon: GitPullRequest, 
      label: 'PR Created', 
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10 border-cyan-500/20',
      progress: 40
    },
    ci_running: { 
      icon: Loader2, 
      label: 'CI/CD Running', 
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10 border-indigo-500/20',
      spin: true,
      progress: 60
    },
    ci_passed: { 
      icon: CheckCircle2, 
      label: 'Tests Passed', 
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10 border-emerald-500/20',
      progress: 80
    },
    ci_failed: { 
      icon: XCircle, 
      label: 'Tests Failed', 
      color: 'text-red-400',
      bgColor: 'bg-red-500/10 border-red-500/20',
      progress: 60
    },
    deployed: { 
      icon: Rocket, 
      label: 'Deployed', 
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10 border-emerald-500/20',
      progress: 100
    },
    failed: { 
      icon: AlertCircle, 
      label: 'Failed', 
      color: 'text-red-400',
      bgColor: 'bg-red-500/10 border-red-500/20',
      progress: 0
    }
  };

  const config = statusConfig[workflowStatus] || statusConfig.not_started;
  const Icon = config.icon;

  if (workflowStatus === 'not_started') {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Automated Workflow Progress</span>
          <span className="text-xs font-medium text-slate-300">{config.progress}%</span>
        </div>
        <Progress value={config.progress} className="h-2" />
      </div>

      {/* Current Status */}
      <div className={cn("p-4 rounded-lg border", config.bgColor)}>
        <div className="flex items-center gap-3 mb-3">
          <Icon className={cn("w-5 h-5", config.color, config.spin && "animate-spin")} />
          <div>
            <h4 className="text-sm font-semibold text-white">{config.label}</h4>
            <p className="text-xs text-slate-400">Automated remediation in progress</p>
          </div>
        </div>

        {/* PR Link */}
        {task.pull_request_url && (
          <a
            href={task.pull_request_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2 rounded bg-slate-800/50 hover:bg-slate-800 transition-colors group"
          >
            <GitPullRequest className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-slate-300 group-hover:text-white">
              Pull Request #{task.pull_request_number}
            </span>
            <ExternalLink className="w-3 h-3 text-slate-500 ml-auto" />
          </a>
        )}

        {/* CI Pipeline Link */}
        {task.ci_pipeline_url && (
          <a
            href={task.ci_pipeline_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2 rounded bg-slate-800/50 hover:bg-slate-800 transition-colors group mt-2"
          >
            <GitBranch className="w-4 h-4 text-indigo-400" />
            <span className="text-xs text-slate-300 group-hover:text-white">
              CI/CD Pipeline - {task.ci_pipeline_status || 'Running'}
            </span>
            <ExternalLink className="w-3 h-3 text-slate-500 ml-auto" />
          </a>
        )}
      </div>

      {/* Workflow Logs */}
      {task.workflow_logs && task.workflow_logs.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
          <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Workflow Timeline
          </h5>
          <div className="space-y-2">
            {task.workflow_logs.slice().reverse().slice(0, 5).map((log, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full mt-1.5",
                  log.status === 'success' ? 'bg-emerald-400' :
                  log.status === 'failed' ? 'bg-red-400' :
                  log.status === 'running' ? 'bg-blue-400' :
                  'bg-slate-500'
                )} />
                <div className="flex-1">
                  <p className="text-slate-300">{log.message}</p>
                  <p className="text-slate-500 text-[10px] mt-0.5">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {workflowStatus === 'ci_passed' && (
        <div className="flex items-center gap-2">
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500">
            <Rocket className="w-4 h-4 mr-2" />
            Deploy to Production
          </Button>
          <Button size="sm" variant="outline" className="border-slate-700 text-slate-300">
            Review Changes
          </Button>
        </div>
      )}

      {workflowStatus === 'ci_failed' && (
        <div className="p-3 rounded-lg bg-red-950/20 border border-red-900/50">
          <p className="text-xs text-red-300">
            Automated tests failed. Manual review and fixes required before deployment.
          </p>
        </div>
      )}
    </div>
  );
}
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  GitPullRequest,
  PlayCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function PRWorkflowPanel({ task }) {
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();

  const createPRMutation = useMutation({
    mutationFn: async () => {
      setIsCreating(true);
      const result = await base44.functions.invoke('createPullRequestAndTriggerCI', {
        task_id: task.id
      });
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['remediationTasks']);
      queryClient.invalidateQueries(['vulnerabilities']);
      setTimeout(() => {
        queryClient.invalidateQueries(['remediationTasks']);
      }, 4000); // Refresh after simulated CI run
    },
    onError: () => {
      setIsCreating(false);
    }
  });

  const canCreatePR = task.auto_fix_status === 'approved' && 
                      !task.pull_request_url &&
                      task.remediation_workflow_status === 'not_started';

  const statusConfig = {
    not_started: { 
      icon: GitPullRequest, 
      color: 'text-slate-400', 
      bg: 'bg-slate-800/50',
      label: 'Ready to Create PR'
    },
    pr_creating: { 
      icon: Loader2, 
      color: 'text-blue-400', 
      bg: 'bg-blue-950/20',
      label: 'Creating Pull Request...',
      spin: true
    },
    pr_created: { 
      icon: GitPullRequest, 
      color: 'text-blue-400', 
      bg: 'bg-blue-950/20',
      label: 'PR Created - Awaiting CI'
    },
    ci_running: { 
      icon: PlayCircle, 
      color: 'text-amber-400', 
      bg: 'bg-amber-950/20',
      label: 'CI Pipeline Running',
      spin: true
    },
    ci_passed: { 
      icon: CheckCircle2, 
      color: 'text-emerald-400', 
      bg: 'bg-emerald-950/20',
      label: 'CI Tests Passed'
    },
    ci_failed: { 
      icon: XCircle, 
      color: 'text-red-400', 
      bg: 'bg-red-950/20',
      label: 'CI Tests Failed'
    },
    deployed: { 
      icon: CheckCircle2, 
      color: 'text-emerald-400', 
      bg: 'bg-emerald-950/20',
      label: 'Deployed to Production'
    },
    failed: { 
      icon: AlertCircle, 
      color: 'text-red-400', 
      bg: 'bg-red-950/20',
      label: 'Workflow Failed'
    }
  };

  const currentStatus = statusConfig[task.remediation_workflow_status] || statusConfig.not_started;
  const StatusIcon = currentStatus.icon;

  return (
    <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <GitPullRequest className="w-4 h-4 text-cyan-400" />
          Automated PR & CI/CD
        </h4>
        <Badge className={cn("text-xs", currentStatus.bg, currentStatus.color)}>
          {currentStatus.label}
        </Badge>
      </div>

      {/* Status Display */}
      <div className={cn("p-3 rounded-lg mb-3", currentStatus.bg)}>
        <div className="flex items-center gap-2">
          <StatusIcon className={cn("w-5 h-5", currentStatus.color, currentStatus.spin && "animate-spin")} />
          <span className={cn("text-sm font-medium", currentStatus.color)}>
            {currentStatus.label}
          </span>
        </div>
      </div>

      {/* PR Details */}
      {task.pull_request_url && (
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Pull Request:</span>
            <a 
              href={task.pull_request_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              {task.pull_request_number}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          {task.ci_pipeline_url && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">CI Pipeline:</span>
              <a 
                href={task.ci_pipeline_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                View Pipeline
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* Workflow Logs */}
      {task.workflow_logs && task.workflow_logs.length > 0 && (
        <div className="mb-3 p-2 rounded bg-slate-900/50 max-h-32 overflow-y-auto">
          <p className="text-xs text-slate-500 mb-1">Workflow Log:</p>
          <div className="space-y-1">
            {task.workflow_logs.slice(-3).map((log, idx) => (
              <div key={idx} className="text-xs">
                <span className={cn(
                  log.status === 'completed' ? 'text-emerald-400' :
                  log.status === 'failed' ? 'text-red-400' :
                  log.status === 'running' ? 'text-amber-400' :
                  'text-slate-400'
                )}>
                  [{log.stage}]
                </span>
                <span className="text-slate-400 ml-1">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {canCreatePR && (
        <Button
          onClick={() => createPRMutation.mutate()}
          disabled={isCreating}
          className="w-full bg-cyan-600 hover:bg-cyan-500"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating PR...
            </>
          ) : (
            <>
              <GitPullRequest className="w-4 h-4 mr-2" />
              Create PR & Trigger CI/CD
            </>
          )}
        </Button>
      )}

      {task.remediation_workflow_status === 'ci_failed' && (
        <div className="mt-2 p-2 rounded bg-red-950/20 border border-red-900/50">
          <p className="text-xs text-red-400">
            CI tests failed. Manual review and fixes required before deployment.
          </p>
        </div>
      )}

      {task.remediation_workflow_status === 'deployed' && (
        <div className="mt-2 p-2 rounded bg-emerald-950/20 border border-emerald-900/50">
          <p className="text-xs text-emerald-400">
            ✓ Fix successfully deployed. Vulnerability resolved automatically.
          </p>
        </div>
      )}
    </div>
  );
}
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  ChevronDown,
  Play,
  Loader2,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function PolicyCheckPanel({ task }) {
  const [expanded, setExpanded] = useState(false);
  const [codeChanges, setCodeChanges] = useState(task?.code_changes || '');
  const queryClient = useQueryClient();

  const checkPoliciesMutation = useMutation({
    mutationFn: async () => {
      const result = await base44.functions.invoke('checkSecurityPolicies', {
        task_id: task.id,
        code_changes: codeChanges
      });
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['remediationTasks']);
      queryClient.invalidateQueries(['vulnerabilityDetail']);
    }
  });

  const severityColors = {
    critical: "bg-red-500/10 text-red-400 border-red-500/20",
    high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    low: "bg-blue-500/10 text-blue-400 border-blue-500/20"
  };

  const statusIcons = {
    passed: ShieldCheck,
    warning: AlertTriangle,
    failed: ShieldAlert
  };

  const StatusIcon = statusIcons[task.policy_check_status] || AlertCircle;

  return (
    <div className="bg-slate-900/30 border border-slate-800 rounded-xl overflow-hidden">
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
          <div className="flex items-center gap-3">
            <StatusIcon className={cn("w-5 h-5",
              task.policy_check_status === 'passed' ? 'text-emerald-400' :
              task.policy_check_status === 'warning' ? 'text-amber-400' :
              task.policy_check_status === 'failed' ? 'text-red-400' : 'text-slate-400'
            )} />
            <div className="text-left">
              <p className="font-medium text-white">Security Policy Check</p>
              <p className="text-xs text-slate-500">
                {task.policy_check_status === 'pending' && 'Not yet checked'}
                {task.policy_check_status === 'passed' && 'All policies compliant'}
                {task.policy_check_status === 'warning' && `${task.policy_violations?.length || 0} warnings`}
                {task.policy_check_status === 'failed' && `${task.policy_violations?.length || 0} violations found`}
              </p>
            </div>
          </div>
          <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", expanded && "rotate-180")} />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            {/* Code Changes Input */}
            <div>
              <label className="text-xs text-slate-400 mb-2 block">
                Code Changes / Configuration (optional)
              </label>
              <Textarea
                value={codeChanges}
                onChange={(e) => setCodeChanges(e.target.value)}
                placeholder="Paste code changes or configuration to check against security policies..."
                className="min-h-24 bg-slate-800/50 border-slate-700 text-sm font-mono"
              />
            </div>

            {/* Run Check Button */}
            <Button
              onClick={() => checkPoliciesMutation.mutate()}
              disabled={checkPoliciesMutation.isPending}
              className="w-full bg-indigo-600 hover:bg-indigo-500"
            >
              {checkPoliciesMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking Policies...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run Policy Check
                </>
              )}
            </Button>

            {/* Violations List */}
            {task.policy_violations && task.policy_violations.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                  Violations Found
                </p>
                {task.policy_violations.map((violation, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-slate-800/50 border border-slate-700"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-medium text-white text-sm">{violation.policy}</p>
                      <Badge className={cn("text-xs border flex-shrink-0", severityColors[violation.severity])}>
                        {violation.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 mb-2">{violation.description}</p>
                    <div className="p-2 rounded bg-slate-900/50 border border-slate-700/50">
                      <p className="text-xs text-emerald-400 font-medium mb-1">Remediation:</p>
                      <p className="text-xs text-slate-300">{violation.remediation}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Last Checked */}
            {task.policy_checked_at && (
              <p className="text-xs text-slate-500 text-center">
                Last checked: {new Date(task.policy_checked_at).toLocaleString()}
              </p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
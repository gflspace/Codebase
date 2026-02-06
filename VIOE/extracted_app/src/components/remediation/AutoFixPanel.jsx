import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import RemediationWorkflowStatus from "./RemediationWorkflowStatus";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  Sparkles, 
  ChevronDown,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Code,
  FileCode,
  TestTube
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';

export default function AutoFixPanel({ task }) {
  const [expanded, setExpanded] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const queryClient = useQueryClient();

  const generateFixMutation = useMutation({
    mutationFn: async () => {
      const result = await base44.functions.invoke('generateAutoFix', { task_id: task.id });
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['remediationTasks']);
      queryClient.invalidateQueries(['vulnerabilityDetail']);
      setExpanded(true);
    }
  });

  const applyFixMutation = useMutation({
    mutationFn: async (approved) => {
      const result = await base44.functions.invoke('applyAutoFix', { 
        task_id: task.id,
        approved 
      });
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['remediationTasks']);
      queryClient.invalidateQueries(['vulnerabilityDetail']);
      setShowApprovalDialog(false);
      
      // If approved, trigger automated workflow
      if (data.approved) {
        executeWorkflowMutation.mutate();
      }
    }
  });

  const executeWorkflowMutation = useMutation({
    mutationFn: async () => {
      const result = await base44.functions.invoke('executeRemediationWorkflow', {
        task_id: task.id
      });
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['remediationTasks']);
      queryClient.invalidateQueries(['vulnerabilityDetail']);
    }
  });

  const riskColors = {
    low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    high: "bg-red-500/10 text-red-400 border-red-500/20"
  };

  const statusIcons = {
    not_available: null,
    proposed: Sparkles,
    approved: CheckCircle2,
    applied: CheckCircle2,
    rejected: XCircle
  };

  const StatusIcon = statusIcons[task.auto_fix_status] || Sparkles;
  const proposal = task.auto_fix_proposal;

  return (
    <>
      <div className="bg-slate-900/30 border border-slate-800 rounded-xl overflow-hidden">
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
            <div className="flex items-center gap-3">
              <Sparkles className={cn("w-5 h-5",
                task.auto_fix_status === 'approved' || task.auto_fix_status === 'applied' ? 'text-emerald-400' :
                task.auto_fix_status === 'rejected' ? 'text-red-400' :
                task.auto_fix_status === 'proposed' ? 'text-cyan-400' : 'text-slate-400'
              )} />
              <div className="text-left">
                <p className="font-medium text-white">AI Auto-Fix</p>
                <p className="text-xs text-slate-500">
                  {task.auto_fix_status === 'not_available' && 'Generate automated fix proposal'}
                  {task.auto_fix_status === 'proposed' && 'Fix proposal ready for review'}
                  {task.auto_fix_status === 'approved' && 'Fix approved and ready to apply'}
                  {task.auto_fix_status === 'applied' && 'Fix has been applied'}
                  {task.auto_fix_status === 'rejected' && 'Fix proposal rejected'}
                </p>
              </div>
            </div>
            <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", expanded && "rotate-180")} />
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-4">
              {/* Generate Fix Button */}
              {task.auto_fix_status === 'not_available' && (
                <Button
                  onClick={() => generateFixMutation.mutate()}
                  disabled={generateFixMutation.isPending}
                  className="w-full bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500"
                >
                  {generateFixMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Fix...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate AI Fix Proposal
                    </>
                  )}
                </Button>
              )}

              {/* Fix Proposal Details */}
              {proposal && task.auto_fix_status !== 'not_available' && (
                <div className="space-y-4">
                  {/* Metadata */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={cn("border", riskColors[proposal.risk_level])}>
                      {proposal.risk_level} risk
                    </Badge>
                    <Badge variant="outline" className="border-cyan-700 text-cyan-400">
                      {proposal.confidence}% confidence
                    </Badge>
                    <Badge variant="outline" className="border-slate-700 text-slate-400">
                      {proposal.fix_type.replace('_', ' ')}
                    </Badge>
                  </div>

                  {/* Reasoning */}
                  <div className="p-3 rounded-lg bg-cyan-950/20 border border-cyan-900/50">
                    <p className="text-xs font-medium text-cyan-400 mb-1 uppercase tracking-wide">AI Reasoning</p>
                    <p className="text-sm text-slate-300 leading-relaxed">{proposal.reasoning}</p>
                  </div>

                  {/* Changes */}
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Proposed Changes</p>
                    {proposal.changes?.map((change, idx) => (
                      <div key={idx} className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <FileCode className="w-4 h-4 text-indigo-400" />
                          <code className="text-sm text-indigo-400 font-mono">{change.file_path}</code>
                        </div>
                        <p className="text-xs text-slate-400">{change.description}</p>
                        
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs text-red-400 mb-1">- Original:</p>
                            <pre className="bg-slate-900 rounded p-2 text-xs text-red-300 overflow-x-auto border-l-2 border-red-500/50">
                              {change.original}
                            </pre>
                          </div>
                          <div>
                            <p className="text-xs text-emerald-400 mb-1">+ Fixed:</p>
                            <pre className="bg-slate-900 rounded p-2 text-xs text-emerald-300 overflow-x-auto border-l-2 border-emerald-500/50">
                              {change.fixed}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Testing Recommendations */}
                  {proposal.testing_recommendations?.length > 0 && (
                    <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <TestTube className="w-3.5 h-3.5" />
                        Testing Recommendations
                      </p>
                      <ul className="space-y-1">
                        {proposal.testing_recommendations.map((rec, idx) => (
                          <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                            <span className="text-cyan-400 mt-0.5">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Actions */}
                  {task.auto_fix_status === 'proposed' && (
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => applyFixMutation.mutate(false)}
                        disabled={applyFixMutation.isPending}
                        className="flex-1 border-red-800 text-red-400 hover:bg-red-950/30"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                      <Button
                        onClick={() => setShowApprovalDialog(true)}
                        disabled={applyFixMutation.isPending}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Approve & Apply
                      </Button>
                    </div>
                  )}

                  {task.auto_fix_status === 'approved' && (
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/50">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-2" />
                        <p className="text-sm font-medium text-emerald-400">Fix Approved</p>
                        <p className="text-xs text-slate-400 mt-1">Automated workflow initiated</p>
                      </div>
                      
                      <RemediationWorkflowStatus task={task} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Approval Confirmation Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Confirm Auto-Fix Application
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              You're about to approve this automated fix. Please review the changes carefully.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-900/50">
              <p className="text-sm text-slate-300">
                <strong className="text-amber-400">Important:</strong> After approval, you'll receive detailed instructions 
                to apply these changes to your codebase. Make sure to run all recommended tests.
              </p>
            </div>

            {proposal && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Risk Level:</span>
                  <Badge className={cn("text-xs border", riskColors[proposal.risk_level])}>
                    {proposal.risk_level}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Confidence:</span>
                  <span className="text-white">{proposal.confidence}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Files Affected:</span>
                  <span className="text-white">{proposal.changes?.length || 0}</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApprovalDialog(false)}
              className="border-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={() => applyFixMutation.mutate(true)}
              disabled={applyFixMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              {applyFixMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Approve Fix
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
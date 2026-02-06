import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles,
  Loader2,
  Clock,
  Users,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ExternalLink
} from "lucide-react";

export default function CreateTaskDialog({ vulnerability, open, onOpenChange, onSuccess }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [aiEstimation, setAiEstimation] = useState(null);
  const [createWithJira, setCreateWithJira] = useState(false);
  
  const [taskData, setTaskData] = useState({
    title: "",
    description: "",
    priority: "high",
    assigned_to: "",
    assigned_team: vulnerability?.assigned_team || "",
    due_date: "",
    estimated_hours: 0,
    complexity: "moderate",
    subtasks: [],
    blockers: []
  });

  const { data: team } = useQuery({
    queryKey: ['team', vulnerability?.assigned_team],
    queryFn: async () => {
      if (!vulnerability?.assigned_team) return null;
      const teams = await base44.entities.Team.filter({ name: vulnerability.assigned_team });
      return teams[0];
    },
    enabled: !!vulnerability?.assigned_team
  });

  useEffect(() => {
    if (vulnerability && open) {
      setTaskData(prev => ({
        ...prev,
        title: `Remediate: ${vulnerability.title}`,
        description: vulnerability.remediation || "",
        priority: vulnerability.severity === "critical" ? "critical" : 
                  vulnerability.severity === "high" ? "high" : "medium",
        assigned_team: vulnerability.assigned_team || ""
      }));
    }
  }, [vulnerability, open]);

  const getAIEstimation = async () => {
    setLoading(true);
    try {
      const result = await base44.functions.invoke('estimateRemediationEffort', {
        vulnerability,
        team_members: team?.members || []
      });

      if (result.data.success) {
        const estimation = result.data.estimation;
        setAiEstimation(estimation);
        setTaskData(prev => ({
          ...prev,
          estimated_hours: estimation.estimated_hours,
          complexity: estimation.complexity,
          priority: estimation.priority,
          subtasks: estimation.subtasks || [],
          blockers: estimation.blockers || [],
          assigned_to: estimation.recommended_assignee || prev.assigned_to
        }));
        setStep(2);
      }
    } catch (error) {
      console.error('AI estimation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTaskMutation = useMutation({
    mutationFn: async (data) => {
      const task = await base44.entities.RemediationTask.create({
        ...data,
        vulnerability_id: vulnerability.id,
        ai_reasoning: aiEstimation?.reasoning
      });

      if (createWithJira) {
        const jiraResult = await base44.functions.invoke('createJiraIssue', {
          task_id: task.id,
          vulnerability
        });
        
        if (jiraResult.data.success) {
          return { ...task, jira_created: true };
        }
      }
      
      return task;
    },
    onSuccess: (data) => {
      onSuccess?.(data);
      handleClose();
    }
  });

  const handleClose = () => {
    setStep(1);
    setAiEstimation(null);
    setTaskData({
      title: "",
      description: "",
      priority: "high",
      assigned_to: "",
      assigned_team: "",
      due_date: "",
      estimated_hours: 0,
      complexity: "moderate",
      subtasks: [],
      blockers: []
    });
    onOpenChange(false);
  };

  const complexityColors = {
    trivial: "text-slate-400",
    simple: "text-green-400",
    moderate: "text-amber-400",
    complex: "text-orange-400",
    critical: "text-red-400"
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Create Remediation Task</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-6 pt-4">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
                <div>
                  <p className="font-medium text-white">{vulnerability?.title}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="bg-red-500/10 text-red-400 border-red-500/20">
                      {vulnerability?.severity}
                    </Badge>
                    <span className="text-sm text-slate-500">{vulnerability?.asset}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-cyan-950/30 to-indigo-950/30 border border-cyan-900/50 rounded-xl p-6 text-center">
              <Sparkles className="w-12 h-12 mx-auto mb-4 text-cyan-400" />
              <h3 className="text-lg font-semibold text-white mb-2">
                AI-Powered Remediation Planning
              </h3>
              <p className="text-sm text-slate-400 mb-6">
                Let AI analyze the vulnerability and suggest:
              </p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span>Effort estimation</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span>Complexity analysis</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span>Optimal assignee</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  <span>Step-by-step plan</span>
                </div>
              </div>
              <Button 
                onClick={getAIEstimation}
                disabled={loading}
                className="w-full bg-cyan-600 hover:bg-cyan-500 h-12"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Get AI Recommendations
                  </>
                )}
              </Button>
            </div>

            <div className="text-center">
              <Button
                variant="ghost"
                onClick={() => setStep(2)}
                className="text-slate-400 hover:text-white"
              >
                Skip AI analysis and create manually
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 pt-4">
            {aiEstimation && (
              <div className="bg-cyan-950/20 border border-cyan-900/50 rounded-xl p-4">
                <div className="flex items-start gap-3 mb-4">
                  <Sparkles className="w-5 h-5 text-cyan-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-white mb-2">AI Analysis Complete</p>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      {aiEstimation.reasoning}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                    <Clock className="w-4 h-4 mx-auto mb-1 text-cyan-400" />
                    <p className="text-lg font-bold text-white">{aiEstimation.estimated_hours}h</p>
                    <p className="text-xs text-slate-500">Estimated</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                    <Zap className={`w-4 h-4 mx-auto mb-1 ${complexityColors[aiEstimation.complexity]}`} />
                    <p className="text-sm font-bold text-white capitalize">{aiEstimation.complexity}</p>
                    <p className="text-xs text-slate-500">Complexity</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                    <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-emerald-400" />
                    <p className="text-lg font-bold text-white">{taskData.subtasks.length}</p>
                    <p className="text-xs text-slate-500">Steps</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label className="text-slate-400">Task Title</Label>
                <Input
                  value={taskData.title}
                  onChange={(e) => setTaskData({ ...taskData, title: e.target.value })}
                  className="mt-1 bg-slate-800 border-slate-700"
                />
              </div>

              <div>
                <Label className="text-slate-400">Description</Label>
                <Textarea
                  value={taskData.description}
                  onChange={(e) => setTaskData({ ...taskData, description: e.target.value })}
                  className="mt-1 bg-slate-800 border-slate-700 h-24"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-400">Priority</Label>
                  <Select value={taskData.priority} onValueChange={(v) => setTaskData({ ...taskData, priority: v })}>
                    <SelectTrigger className="mt-1 bg-slate-800 border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800">
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-slate-400">Estimated Hours</Label>
                  <Input
                    type="number"
                    value={taskData.estimated_hours}
                    onChange={(e) => setTaskData({ ...taskData, estimated_hours: parseFloat(e.target.value) })}
                    className="mt-1 bg-slate-800 border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-400">Assigned To</Label>
                  <Input
                    value={taskData.assigned_to}
                    onChange={(e) => setTaskData({ ...taskData, assigned_to: e.target.value })}
                    placeholder="email@company.com"
                    className="mt-1 bg-slate-800 border-slate-700"
                  />
                </div>

                <div>
                  <Label className="text-slate-400">Due Date</Label>
                  <Input
                    type="date"
                    value={taskData.due_date}
                    onChange={(e) => setTaskData({ ...taskData, due_date: e.target.value })}
                    className="mt-1 bg-slate-800 border-slate-700"
                  />
                </div>
              </div>

              {taskData.subtasks.length > 0 && (
                <div>
                  <Label className="text-slate-400 mb-2 block">Remediation Steps</Label>
                  <div className="space-y-2 bg-slate-800/30 rounded-lg p-3">
                    {taskData.subtasks.map((subtask, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-slate-600" />
                        <span className="text-slate-300">{subtask.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 p-4 rounded-lg bg-indigo-950/30 border border-indigo-900/50">
                <Checkbox
                  id="jira"
                  checked={createWithJira}
                  onCheckedChange={setCreateWithJira}
                />
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-indigo-400" />
                  <Label htmlFor="jira" className="text-white cursor-pointer">
                    Create Jira issue and sync automatically
                  </Label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1 border-slate-700"
              >
                Cancel
              </Button>
              <Button
                onClick={() => createTaskMutation.mutate(taskData)}
                disabled={createTaskMutation.isPending || !taskData.title}
                className="flex-1 bg-cyan-600 hover:bg-cyan-500"
              >
                {createTaskMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>Create Task</>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
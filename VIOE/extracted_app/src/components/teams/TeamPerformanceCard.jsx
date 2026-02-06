import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Clock,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  AlertTriangle,
  Users,
  Target,
  Loader2,
  ChevronRight,
  BookOpen,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function TeamPerformanceCard({ team, onClick }) {
  const [showInsights, setShowInsights] = useState(false);

  const { data: performance, isLoading } = useQuery({
    queryKey: ['teamPerformance', team.id],
    queryFn: async () => {
      const result = await base44.functions.invoke('analyzeTeamPerformance', { team_id: team.id });
      return result.data;
    },
    enabled: showInsights,
  });

  const priorityColors = {
    high: "bg-red-500/10 text-red-400 border-red-500/20",
    medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    low: "bg-blue-500/10 text-blue-400 border-blue-500/20"
  };

  return (
    <>
      <div 
        className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-colors cursor-pointer"
        onClick={onClick}
      >
        <div className={`h-2 bg-gradient-to-r ${team.color ? `from-${team.color}-500 to-${team.color}-600` : 'from-cyan-500 to-blue-600'}`} />
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${team.color ? `from-${team.color}-500 to-${team.color}-600` : 'from-cyan-500 to-blue-600'} flex items-center justify-center text-white font-bold`}>
                {team.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-semibold text-white">{team.name}</h3>
                <p className="text-xs text-slate-500">{team.members?.length || 0} members</p>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              setShowInsights(true);
            }}
            className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 justify-between"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              View Performance Insights
            </span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Dialog open={showInsights} onOpenChange={setShowInsights}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${team.color ? `from-${team.color}-500 to-${team.color}-600` : 'from-cyan-500 to-blue-600'} flex items-center justify-center text-white font-bold`}>
                {team.name.charAt(0)}
              </div>
              {team.name} Performance
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="w-8 h-8 mx-auto mb-3 text-cyan-400 animate-spin" />
              <p className="text-slate-400">Analyzing team performance...</p>
            </div>
          ) : performance?.success ? (
            <div className="space-y-6 pt-4">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                  <Clock className="w-5 h-5 mx-auto mb-2 text-cyan-400" />
                  <p className="text-2xl font-bold text-white">{performance.metrics.avg_resolution_hours}h</p>
                  <p className="text-xs text-slate-500">Avg Resolution</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                  <CheckCircle2 className="w-5 h-5 mx-auto mb-2 text-emerald-400" />
                  <p className="text-2xl font-bold text-white">{performance.metrics.completion_rate}%</p>
                  <p className="text-xs text-slate-500">Completion Rate</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                  <Target className="w-5 h-5 mx-auto mb-2 text-indigo-400" />
                  <p className="text-2xl font-bold text-white">{performance.metrics.resolved_vulnerabilities}</p>
                  <p className="text-xs text-slate-500">Resolved</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                  <TrendingUp className="w-5 h-5 mx-auto mb-2 text-amber-400" />
                  <p className="text-2xl font-bold text-white">{performance.metrics.active_tasks}</p>
                  <p className="text-xs text-slate-500">Active Tasks</p>
                </div>
              </div>

              {/* AI Performance Summary */}
              {performance.ai_insights?.performance_summary && (
                <div className="bg-gradient-to-r from-cyan-950/30 to-indigo-950/30 border border-cyan-900/50 rounded-xl p-5">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-cyan-400 mb-2">AI Performance Assessment</p>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        {performance.ai_insights.performance_summary}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Task Progress */}
              <div className="bg-slate-800/30 rounded-xl p-5">
                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">
                  Task Progress
                </h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-slate-400">Completion Rate</span>
                      <span className="text-emerald-400 font-medium">{performance.metrics.completion_rate}%</span>
                    </div>
                    <Progress value={performance.metrics.completion_rate} className="h-2 bg-slate-800" />
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="text-center p-2 rounded-lg bg-slate-800/50">
                      <p className="text-sm font-bold text-white">{performance.metrics.total_tasks}</p>
                      <p className="text-xs text-slate-500">Total</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-blue-900/30 border border-blue-800/30">
                      <p className="text-sm font-bold text-blue-400">{performance.metrics.active_tasks}</p>
                      <p className="text-xs text-blue-500/70">Active</p>
                    </div>
                    {performance.metrics.blocked_tasks > 0 && (
                      <div className="text-center p-2 rounded-lg bg-red-900/30 border border-red-800/30">
                        <p className="text-sm font-bold text-red-400">{performance.metrics.blocked_tasks}</p>
                        <p className="text-xs text-red-500/70">Blocked</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Training Recommendations */}
              {performance.ai_insights?.training_recommendations?.length > 0 && (
                <div className="bg-slate-800/30 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Training Recommendations
                  </h4>
                  <div className="space-y-3">
                    {performance.ai_insights.training_recommendations.map((rec, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                        <Zap className={cn("w-4 h-4 mt-0.5 flex-shrink-0",
                          rec.priority === 'high' ? 'text-red-400' :
                          rec.priority === 'medium' ? 'text-amber-400' : 'text-blue-400'
                        )} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="font-medium text-white text-sm">{rec.area}</p>
                            <Badge className={cn("text-xs border flex-shrink-0", priorityColors[rec.priority])}>
                              {rec.priority}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed">{rec.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resource Allocation */}
              {performance.ai_insights?.resource_suggestions && (
                <div className="bg-indigo-950/30 border border-indigo-900/50 rounded-xl p-5">
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-indigo-400 mb-2">Resource Allocation</p>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        {performance.ai_insights.resource_suggestions}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Concerns */}
              {performance.ai_insights?.concerns?.length > 0 && (
                <div className="bg-amber-950/20 border border-amber-900/50 rounded-xl p-5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-amber-400 mb-2">Areas of Concern</p>
                      <ul className="space-y-1">
                        {performance.ai_insights.concerns.map((concern, idx) => (
                          <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                            <span className="text-amber-400 mt-1">•</span>
                            <span>{concern}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-red-400" />
              <p className="text-slate-400">Failed to load performance data</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ThreatAlertCard from "@/components/hunting/ThreatAlertCard";
import HuntingSessionCard from "@/components/hunting/HuntingSessionCard";
import CreateHuntDialog from "@/components/hunting/CreateHuntDialog";
import ProactiveInsightsPanel from "@/components/hunting/ProactiveInsightsPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ShieldAlert,
  Search,
  Play,
  Loader2,
  Target,
  AlertTriangle,
  Zap
} from "lucide-react";

export default function ThreatHunting() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showProactiveDialog, setShowProactiveDialog] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [proactiveInsights, setProactiveInsights] = useState(null);
  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ['threatAlerts'],
    queryFn: () => base44.entities.ThreatAlert.list('-detection_time', 100),
  });

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['huntingSessions'],
    queryFn: () => base44.entities.ThreatHuntingSession.list('-start_time', 50),
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const result = await base44.functions.invoke('analyzeThreatPatterns', {});
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['threatAlerts']);
      setIsAnalyzing(false);
    },
    onError: () => {
      setIsAnalyzing(false);
    }
  });

  const proactiveMutation = useMutation({
    mutationFn: async () => {
      const result = await base44.functions.invoke('proactiveThreatHunting', {});
      return result.data;
    },
    onSuccess: (data) => {
      setProactiveInsights(data);
      setShowProactiveDialog(true);
      queryClient.invalidateQueries(['vulnerabilities']);
      queryClient.invalidateQueries(['assets']);
    },
  });

  const newAlerts = alerts.filter(a => a.status === 'new').length;
  const criticalAlerts = alerts.filter(a => a.severity === 'critical' && a.status !== 'resolved').length;
  const activeSessions = sessions.filter(s => s.status === 'active').length;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800/50 bg-slate-900/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to={createPageUrl("Dashboard")} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">VIOE</h1>
                <p className="text-xs text-slate-500">Threat Hunting</p>
              </div>
            </Link>
            
            <nav className="flex items-center gap-1">
              <Link to={createPageUrl("Dashboard")}>
                <Button variant="ghost" className="text-slate-400 hover:text-white">Dashboard</Button>
              </Link>
              <Link to={createPageUrl("ThreatHunting")}>
                <Button variant="ghost" className="text-cyan-400 bg-cyan-500/10">Threat Hunting</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Target className="w-7 h-7 text-purple-400" />
              Proactive Threat Hunting
            </h2>
            <p className="text-slate-400 mt-1">AI-powered detection of APTs, zero-days, and suspicious patterns</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              onClick={() => proactiveMutation.mutate()}
              disabled={proactiveMutation.isPending}
              className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500"
            >
              {proactiveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Predicting...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Predict Vulnerabilities
                </>
              )}
            </Button>
            <Button
              onClick={() => {
                setIsAnalyzing(true);
                analyzeMutation.mutate();
              }}
              disabled={isAnalyzing}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Detect Threats
                </>
              )}
            </Button>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-cyan-600 hover:bg-cyan-500"
            >
              <Search className="w-4 h-4 mr-2" />
              New Hunt
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-5">
            <p className="text-sm text-red-400 mb-1">Critical Alerts</p>
            <p className="text-3xl font-bold text-white">{criticalAlerts}</p>
          </div>
          <div className="bg-orange-950/30 border border-orange-900/50 rounded-xl p-5">
            <p className="text-sm text-orange-400 mb-1">New Alerts</p>
            <p className="text-3xl font-bold text-white">{newAlerts}</p>
          </div>
          <div className="bg-indigo-950/30 border border-indigo-900/50 rounded-xl p-5">
            <p className="text-sm text-indigo-400 mb-1">Active Hunts</p>
            <p className="text-3xl font-bold text-white">{activeSessions}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
            <p className="text-sm text-slate-400 mb-1">Total Alerts</p>
            <p className="text-3xl font-bold text-white">{alerts.length}</p>
          </div>
        </div>

        {/* Threat Alerts */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            Threat Alerts ({alerts.length})
          </h3>
          {alertsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
          ) : alerts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {alerts.map(alert => (
                <ThreatAlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-slate-900/30 rounded-2xl border border-slate-800">
              <Target className="w-16 h-16 mx-auto mb-4 text-slate-700" />
              <h3 className="text-lg font-medium text-slate-400">No threat alerts</h3>
              <p className="text-slate-500 mt-1 mb-4">Run analysis to detect suspicious patterns</p>
              <Button onClick={() => analyzeMutation.mutate()} className="bg-purple-600 hover:bg-purple-500">
                <Play className="w-4 h-4 mr-2" />
                Run Analysis
              </Button>
            </div>
          )}
        </div>

        {/* Active Hunting Sessions */}
        {sessions.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Search className="w-5 h-5 text-cyan-400" />
              Hunting Sessions ({sessions.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessions.map(session => (
                <HuntingSessionCard key={session.id} session={session} />
              ))}
            </div>
          </div>
        )}
      </main>

      <CreateHuntDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      {/* Proactive Insights Dialog */}
      <Dialog open={showProactiveDialog} onOpenChange={setShowProactiveDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-red-400" />
              Proactive Vulnerability Predictions
            </DialogTitle>
          </DialogHeader>
          {proactiveInsights && (
            <div className="pt-4">
              {proactiveInsights.vulnerabilities_created > 0 && (
                <div className="mb-4 p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/50">
                  <p className="text-sm text-emerald-400">
                    ✓ Created {proactiveInsights.vulnerabilities_created} vulnerability record(s) for high-confidence predictions
                  </p>
                </div>
              )}
              <ProactiveInsightsPanel insights={proactiveInsights} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
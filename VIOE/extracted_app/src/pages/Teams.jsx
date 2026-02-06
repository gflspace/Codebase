import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import TeamPerformanceCard from "@/components/teams/TeamPerformanceCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  ShieldAlert, 
  Users,
  Plus,
  GitBranch,
  AlertTriangle,
  TrendingUp,
  Mail,
  Slack,
  MoreHorizontal,
  BarChart3
} from "lucide-react";

export default function Teams() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: "", lead_email: "", slack_channel: "" });
  const queryClient = useQueryClient();

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  const { data: vulnerabilities = [] } = useQuery({
    queryKey: ['vulnerabilities'],
    queryFn: () => base44.entities.Vulnerability.list('-created_date', 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Team.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['teams']);
      setShowAddDialog(false);
      setNewTeam({ name: "", lead_email: "", slack_channel: "" });
    },
  });

  const handleCreateTeam = () => {
    createMutation.mutate({
      ...newTeam,
      slug: newTeam.name.toLowerCase().replace(/\s+/g, '-'),
    });
  };

  const getTeamStats = (teamName) => {
    const teamVulns = vulnerabilities.filter(v => v.assigned_team === teamName);
    return {
      total: teamVulns.length,
      critical: teamVulns.filter(v => v.severity === 'critical' && v.status !== 'resolved').length,
      high: teamVulns.filter(v => v.severity === 'high' && v.status !== 'resolved').length,
      open: teamVulns.filter(v => v.status === 'open' || v.status === 'in_progress').length,
      resolved: teamVulns.filter(v => v.status === 'resolved').length,
    };
  };

  const teamColors = [
    "from-cyan-500 to-blue-600",
    "from-indigo-500 to-purple-600",
    "from-emerald-500 to-teal-600",
    "from-amber-500 to-orange-600",
    "from-rose-500 to-pink-600",
    "from-violet-500 to-fuchsia-600"
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800/50 bg-slate-900/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl("Dashboard")} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">VIOE</h1>
                  <p className="text-xs text-slate-500">Vulnerability Intelligence</p>
                </div>
              </Link>
            </div>
            
            <nav className="flex items-center gap-1">
              <Link to={createPageUrl("Dashboard")}>
                <Button variant="ghost" className="text-slate-400 hover:text-white">Dashboard</Button>
              </Link>
              <Link to={createPageUrl("Vulnerabilities")}>
                <Button variant="ghost" className="text-slate-400 hover:text-white">Vulnerabilities</Button>
              </Link>
              <Link to={createPageUrl("RemediationTasks")}>
                <Button variant="ghost" className="text-slate-400 hover:text-white">Tasks</Button>
              </Link>
              <Link to={createPageUrl("Teams")}>
                <Button variant="ghost" className="text-cyan-400 bg-cyan-500/10">Teams</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Teams</h2>
            <p className="text-slate-400 mt-1">Manage ownership and vulnerability assignments</p>
          </div>
          
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-cyan-600 hover:bg-cyan-500">
                <Plus className="w-4 h-4 mr-2" />
                Add Team
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 text-white">
              <DialogHeader>
                <DialogTitle>Create New Team</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label className="text-slate-400">Team Name</Label>
                  <Input
                    value={newTeam.name}
                    onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                    placeholder="e.g., Platform Engineering"
                    className="mt-1 bg-slate-800 border-slate-700"
                  />
                </div>
                <div>
                  <Label className="text-slate-400">Team Lead Email</Label>
                  <Input
                    value={newTeam.lead_email}
                    onChange={(e) => setNewTeam({ ...newTeam, lead_email: e.target.value })}
                    placeholder="lead@company.com"
                    className="mt-1 bg-slate-800 border-slate-700"
                  />
                </div>
                <div>
                  <Label className="text-slate-400">Slack Channel</Label>
                  <Input
                    value={newTeam.slack_channel}
                    onChange={(e) => setNewTeam({ ...newTeam, slack_channel: e.target.value })}
                    placeholder="#team-alerts"
                    className="mt-1 bg-slate-800 border-slate-700"
                  />
                </div>
                <Button 
                  onClick={handleCreateTeam} 
                  className="w-full bg-cyan-600 hover:bg-cyan-500"
                  disabled={!newTeam.name}
                >
                  Create Team
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Performance Overview */}
        <div className="mb-8 bg-gradient-to-r from-indigo-950/30 to-purple-950/30 border border-indigo-900/50 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-semibold text-white">Performance Analytics</h3>
          </div>
          <p className="text-sm text-slate-400">
            Click on any team card to view detailed performance metrics, AI-powered insights, and training recommendations.
          </p>
        </div>

        {/* Teams Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-64 rounded-2xl bg-slate-900/50 animate-pulse" />
            ))}
          </div>
        ) : teams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team, idx) => {
              const colorClass = teamColors[idx % teamColors.length];
              return (
                <TeamPerformanceCard
                  key={team.id}
                  team={{ ...team, color: colorClass }}
                  onClick={() => {}}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-slate-900/30 rounded-2xl border border-slate-800">
            <Users className="w-16 h-16 mx-auto mb-4 text-slate-700" />
            <h3 className="text-lg font-medium text-slate-400">No teams configured</h3>
            <p className="text-slate-500 mt-1 mb-4">Create teams to enable AI ownership resolution</p>
            <Button onClick={() => setShowAddDialog(true)} className="bg-cyan-600 hover:bg-cyan-500">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Team
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
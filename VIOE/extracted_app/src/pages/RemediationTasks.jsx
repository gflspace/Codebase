import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import TaskCard from "@/components/remediation/TaskCard";
import PolicyCheckPanel from "@/components/remediation/PolicyCheckPanel";
import AutoFixPanel from "@/components/remediation/AutoFixPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  ShieldAlert, 
  ListTodo,
  Search,
  Filter,
  LayoutGrid,
  List,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink
} from "lucide-react";

export default function RemediationTasks() {
  const [viewMode, setViewMode] = useState("grid");
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    priority: "all",
    team: "all",
    hasJira: "all",
    policyStatus: "all"
  });
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading, refetch } = useQuery({
    queryKey: ['allRemediationTasks'],
    queryFn: () => base44.entities.RemediationTask.list('-created_date', 200),
  });

  const { data: vulnerabilities = [] } = useQuery({
    queryKey: ['vulnerabilities'],
    queryFn: () => base44.entities.Vulnerability.list('-created_date', 200),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  // Create vulnerability lookup
  const vulnMap = vulnerabilities.reduce((acc, v) => {
    acc[v.id] = v;
    return acc;
  }, {});

  // Apply filters
  const filteredTasks = tasks.filter(task => {
    if (filters.search) {
      const search = filters.search.toLowerCase();
      if (!task.title?.toLowerCase().includes(search) && 
          !task.assigned_to?.toLowerCase().includes(search)) {
        return false;
      }
    }
    
    if (filters.status !== "all" && task.status !== filters.status) return false;
    if (filters.priority !== "all" && task.priority !== filters.priority) return false;
    if (filters.team !== "all" && task.assigned_team !== filters.team) return false;
    if (filters.hasJira === "yes" && !task.jira_issue_key) return false;
    if (filters.hasJira === "no" && task.jira_issue_key) return false;
    if (filters.policyStatus !== "all" && task.policy_check_status !== filters.policyStatus) return false;
    
    return true;
  });

  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
    with_jira: tasks.filter(t => t.jira_issue_key).length,
    policy_violations: tasks.filter(t => t.policy_check_status === 'failed').length
  };

  const handleStatusChange = async (task, newStatus) => {
    await base44.entities.RemediationTask.update(task.id, { status: newStatus });
    queryClient.invalidateQueries(['allRemediationTasks']);
  };

  const handleSyncJira = async (taskId) => {
    try {
      await base44.functions.invoke('syncJiraStatus', { task_id: taskId });
      queryClient.invalidateQueries(['allRemediationTasks']);
    } catch (error) {
      console.error('Jira sync error:', error);
    }
  };

  const handleSyncAll = async () => {
    const jiraTasks = tasks.filter(t => t.jira_issue_key);
    for (const task of jiraTasks) {
      try {
        await base44.functions.invoke('syncJiraStatus', { task_id: task.id });
      } catch (error) {
        console.error(`Failed to sync task ${task.id}:`, error);
      }
    }
    queryClient.invalidateQueries(['allRemediationTasks']);
  };

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
                <Button variant="ghost" className="text-cyan-400 bg-cyan-500/10">Tasks</Button>
              </Link>
              <Link to={createPageUrl("Teams")}>
                <Button variant="ghost" className="text-slate-400 hover:text-white">Teams</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Remediation Tasks</h2>
            <p className="text-slate-400 mt-1">
              {filteredTasks.length} tasks • {stats.with_jira} synced with Jira
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {stats.with_jira > 0 && (
              <Button 
                variant="outline" 
                onClick={handleSyncAll}
                className="border-slate-700 text-slate-300"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync All from Jira
              </Button>
            )}

            <div className="flex items-center rounded-lg border border-slate-800 p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded ${viewMode === "grid" ? "bg-slate-800 text-white" : "text-slate-500 hover:text-white"}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded ${viewMode === "list" ? "bg-slate-800 text-white" : "text-slate-500 hover:text-white"}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center gap-4 mb-6">
          <Badge className="bg-slate-500/10 text-slate-400 border border-slate-500/20 px-3 py-1">
            {stats.todo} To Do
          </Badge>
          <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1">
            {stats.in_progress} In Progress
          </Badge>
          <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1">
            {stats.completed} Completed
          </Badge>
          {stats.blocked > 0 && (
            <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1">
              {stats.blocked} Blocked
            </Badge>
          )}
          {stats.policy_violations > 0 && (
            <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1">
              {stats.policy_violations} Policy Violations
            </Badge>
          )}
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <ExternalLink className="w-4 h-4 text-indigo-400" />
            <span>{stats.with_jira} linked to Jira</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search tasks..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-10 bg-slate-900/50 border-slate-800"
            />
          </div>

          <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
            <SelectTrigger className="w-36 bg-slate-900/50 border-slate-800">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="review">In Review</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.priority} onValueChange={(v) => setFilters({ ...filters, priority: v })}>
            <SelectTrigger className="w-36 bg-slate-900/50 border-slate-800">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.hasJira} onValueChange={(v) => setFilters({ ...filters, hasJira: v })}>
            <SelectTrigger className="w-36 bg-slate-900/50 border-slate-800">
              <SelectValue placeholder="Jira" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="all">All Tasks</SelectItem>
              <SelectItem value="yes">With Jira</SelectItem>
              <SelectItem value="no">No Jira</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.policyStatus} onValueChange={(v) => setFilters({ ...filters, policyStatus: v })}>
            <SelectTrigger className="w-40 bg-slate-900/50 border-slate-800">
              <SelectValue placeholder="Policy" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="all">All Policies</SelectItem>
              <SelectItem value="passed">Passed</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Task List */}
        {isLoading ? (
          <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-3"}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-48 rounded-2xl bg-slate-900/50 animate-pulse" />
            ))}
          </div>
        ) : filteredTasks.length > 0 ? (
          <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-3"}>
            {filteredTasks.map(task => {
              const vuln = vulnMap[task.vulnerability_id];
              return (
                <div key={task.id} className="space-y-2">
                  <TaskCard 
                    task={task} 
                    compact={viewMode === "list"}
                    onStatusChange={handleStatusChange}
                    onSync={handleSyncJira}
                    onClick={() => {
                      if (vuln) {
                        window.location.href = createPageUrl(`VulnerabilityDetail?id=${vuln.id}`);
                      }
                    }}
                  />
                  {viewMode === "grid" && (
                    <>
                      <AutoFixPanel task={task} />
                      <PolicyCheckPanel task={task} />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <ListTodo className="w-16 h-16 mx-auto mb-4 text-slate-700" />
            <h3 className="text-lg font-medium text-slate-400">No tasks found</h3>
            <p className="text-slate-500 mt-1">Try adjusting your filters</p>
          </div>
        )}
      </main>
    </div>
  );
}
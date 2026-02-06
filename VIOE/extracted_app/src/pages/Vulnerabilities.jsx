import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import FilterBar from "@/components/filters/FilterBar";
import VulnerabilityCard from "@/components/vulnerability/VulnerabilityCard";
import PrioritizationInsights from "@/components/vulnerability/PrioritizationInsights";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldAlert,
  LayoutGrid,
  List,
  Download,
  Upload,
  RefreshCw,
  Sparkles
} from "lucide-react";

// PCE Planning Layer: Thresholds from planning/prioritization.md
import { CONFIDENCE_THRESHOLDS } from "@/config/planningConfig";

export default function Vulnerabilities() {
  const [viewMode, setViewMode] = useState("grid");
  const [filters, setFilters] = useState({
    search: "",
    severity: "all",
    status: "all",
    environment: "all",
    team: "all",
    confidence: "all"
  });

  const { data: vulnerabilities = [], isLoading, refetch } = useQuery({
    queryKey: ['vulnerabilities'],
    queryFn: () => base44.entities.Vulnerability.list('-created_date', 200),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  // Apply filters
  const filteredVulns = vulnerabilities.filter(vuln => {
    if (vuln.is_suppressed && filters.status !== "suppressed") return false;
    
    if (filters.search) {
      const search = filters.search.toLowerCase();
      if (!vuln.title?.toLowerCase().includes(search) && 
          !vuln.cve_id?.toLowerCase().includes(search) &&
          !vuln.asset?.toLowerCase().includes(search)) {
        return false;
      }
    }
    
    if (filters.severity !== "all" && vuln.severity !== filters.severity) return false;
    if (filters.status !== "all" && vuln.status !== filters.status) return false;
    if (filters.environment !== "all" && vuln.environment !== filters.environment) return false;
    if (filters.team !== "all" && vuln.assigned_team !== filters.team) return false;
    
    // PCE: Confidence thresholds from planning/prioritization.md Section 2.1
    if (filters.confidence !== "all") {
      if (filters.confidence === "high" && (!vuln.ownership_confidence || vuln.ownership_confidence < CONFIDENCE_THRESHOLDS.HIGH)) return false;
      if (filters.confidence === "medium" && (!vuln.ownership_confidence || vuln.ownership_confidence < CONFIDENCE_THRESHOLDS.MEDIUM || vuln.ownership_confidence >= CONFIDENCE_THRESHOLDS.HIGH)) return false;
      if (filters.confidence === "low" && (!vuln.ownership_confidence || vuln.ownership_confidence >= CONFIDENCE_THRESHOLDS.MEDIUM)) return false;
      if (filters.confidence === "unassigned" && vuln.assigned_team) return false;
    }
    
    return true;
  });

  const stats = {
    total: filteredVulns.length,
    critical: filteredVulns.filter(v => v.severity === "critical").length,
    high: filteredVulns.filter(v => v.severity === "high").length,
    assigned: filteredVulns.filter(v => v.assigned_team).length
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
                <Button variant="ghost" className="text-cyan-400 bg-cyan-500/10">Vulnerabilities</Button>
              </Link>
              <Link to={createPageUrl("RemediationTasks")}>
                <Button variant="ghost" className="text-slate-400 hover:text-white">Tasks</Button>
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
            <h2 className="text-2xl font-bold text-white">Vulnerabilities</h2>
            <p className="text-slate-400 mt-1">
              {stats.total} vulnerabilities • {stats.assigned} auto-assigned
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <PrioritizationInsights />

            <Button 
              variant="outline"
              onClick={async () => {
                await base44.functions.invoke('bulkTriageVulnerabilities', {});
                refetch();
              }}
              className="border-slate-700 text-slate-300"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Auto-Triage
            </Button>

            <Button 
              variant="outline" 
              size="icon"
              onClick={() => refetch()}
              className="border-slate-700 text-slate-400 hover:text-white"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            
            <Link to={createPageUrl("ImportVulnerabilities")}>
              <Button variant="outline" className="border-slate-700 text-slate-300">
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
            </Link>

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
          <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1">
            {stats.critical} Critical
          </Badge>
          <Badge className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-3 py-1">
            {stats.high} High
          </Badge>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>{Math.round((stats.assigned / Math.max(stats.total, 1)) * 100)}% AI-assigned</span>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <FilterBar 
            filters={filters} 
            onFiltersChange={setFilters}
            teams={teams}
          />
        </div>

        {/* Vulnerability List */}
        {isLoading ? (
          <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-3"}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-48 rounded-2xl bg-slate-900/50 animate-pulse" />
            ))}
          </div>
        ) : filteredVulns.length > 0 ? (
          <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-3"}>
            {filteredVulns.map(vuln => (
              <Link key={vuln.id} to={createPageUrl(`VulnerabilityDetail?id=${vuln.id}`)}>
                <VulnerabilityCard 
                  vulnerability={vuln} 
                  compact={viewMode === "list"}
                />
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <ShieldAlert className="w-16 h-16 mx-auto mb-4 text-slate-700" />
            <h3 className="text-lg font-medium text-slate-400">No vulnerabilities found</h3>
            <p className="text-slate-500 mt-1">Try adjusting your filters or import new scan results</p>
          </div>
        )}
      </main>
    </div>
  );
}
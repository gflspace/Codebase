import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, Filter, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

export default function FilterBar({ filters, onFiltersChange, teams = [] }) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateFilter = (key, value) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: "",
      severity: "all",
      status: "all",
      environment: "all",
      team: "all",
      confidence: "all"
    });
  };

  const activeFiltersCount = Object.entries(filters).filter(
    ([key, value]) => value && value !== "all" && key !== "search"
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Search vulnerabilities, CVEs, assets..."
            value={filters.search || ""}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-10 bg-slate-900/50 border-slate-800 text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:ring-cyan-500/20"
          />
        </div>

        <Select value={filters.severity || "all"} onValueChange={(v) => updateFilter("severity", v)}>
          <SelectTrigger className="w-36 bg-slate-900/50 border-slate-800 text-slate-300">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800">
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.status || "all"} onValueChange={(v) => updateFilter("status", v)}>
          <SelectTrigger className="w-36 bg-slate-900/50 border-slate-800 text-slate-300">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="suppressed">Suppressed</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={cn(
            "border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800",
            showAdvanced && "bg-slate-800 text-white border-slate-700"
          )}
        >
          <SlidersHorizontal className="w-4 h-4 mr-2" />
          Advanced
          {activeFiltersCount > 0 && (
            <Badge className="ml-2 bg-cyan-500/20 text-cyan-400 border-none">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>

        {(filters.search || activeFiltersCount > 0) && (
          <Button
            variant="ghost"
            size="icon"
            onClick={clearFilters}
            className="text-slate-500 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {showAdvanced && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-900/30 border border-slate-800">
          <Select value={filters.environment || "all"} onValueChange={(v) => updateFilter("environment", v)}>
            <SelectTrigger className="w-40 bg-slate-800/50 border-slate-700 text-slate-300">
              <SelectValue placeholder="Environment" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="all">All Environments</SelectItem>
              <SelectItem value="production">Production</SelectItem>
              <SelectItem value="staging">Staging</SelectItem>
              <SelectItem value="development">Development</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.team || "all"} onValueChange={(v) => updateFilter("team", v)}>
            <SelectTrigger className="w-40 bg-slate-800/50 border-slate-700 text-slate-300">
              <SelectValue placeholder="Team" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="all">All Teams</SelectItem>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.name}>{team.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.confidence || "all"} onValueChange={(v) => updateFilter("confidence", v)}>
            <SelectTrigger className="w-44 bg-slate-800/50 border-slate-700 text-slate-300">
              <SelectValue placeholder="AI Confidence" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="all">All Confidence</SelectItem>
              <SelectItem value="high">High (90%+)</SelectItem>
              <SelectItem value="medium">Medium (70-89%)</SelectItem>
              <SelectItem value="low">Low (&lt;70%)</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex-1" />
          
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Showing filtered results</span>
          </div>
        </div>
      )}
    </div>
  );
}
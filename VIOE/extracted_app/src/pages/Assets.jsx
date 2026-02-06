import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AssetCard from "@/components/assets/AssetCard";
import CreateAssetDialog from "@/components/assets/CreateAssetDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShieldAlert,
  Server,
  Plus,
  RefreshCw,
  Search,
  Filter
} from "lucide-react";

export default function Assets() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [criticalityFilter, setCriticalityFilter] = useState("all");
  const [environmentFilter, setEnvironmentFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: assets = [], isLoading, refetch } = useQuery({
    queryKey: ['assets'],
    queryFn: () => base44.entities.Asset.list('-risk_score', 200),
  });

  const updateRiskMutation = useMutation({
    mutationFn: async () => {
      const result = await base44.functions.invoke('updateAssetRiskScores', {});
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['assets']);
    },
  });

  // Apply filters
  const filteredAssets = assets.filter(asset => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (!asset.asset_name?.toLowerCase().includes(search) &&
          !asset.hostname?.toLowerCase().includes(search) &&
          !asset.asset_id?.toLowerCase().includes(search)) {
        return false;
      }
    }
    if (typeFilter !== "all" && asset.asset_type !== typeFilter) return false;
    if (criticalityFilter !== "all" && asset.criticality !== criticalityFilter) return false;
    if (environmentFilter !== "all" && asset.environment !== environmentFilter) return false;
    return true;
  });

  const stats = {
    total: assets.length,
    critical: assets.filter(a => a.criticality === 'critical').length,
    highRisk: assets.filter(a => a.risk_score >= 70).length,
    withVulns: assets.filter(a => a.vulnerability_count > 0).length
  };

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
                <p className="text-xs text-slate-500">Asset Management</p>
              </div>
            </Link>
            
            <nav className="flex items-center gap-1">
              <Link to={createPageUrl("Dashboard")}>
                <Button variant="ghost" className="text-slate-400 hover:text-white">Dashboard</Button>
              </Link>
              <Link to={createPageUrl("Assets")}>
                <Button variant="ghost" className="text-cyan-400 bg-cyan-500/10">Assets</Button>
              </Link>
              <Link to={createPageUrl("Vulnerabilities")}>
                <Button variant="ghost" className="text-slate-400 hover:text-white">Vulnerabilities</Button>
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
              <Server className="w-7 h-7 text-cyan-400" />
              IT Asset Inventory
            </h2>
            <p className="text-slate-400 mt-1">Manage and track all IT assets with risk scoring</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              onClick={() => updateRiskMutation.mutate()}
              variant="outline"
              className="border-slate-700 text-slate-300"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Update Risk Scores
            </Button>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Asset
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
            <p className="text-sm text-slate-400 mb-1">Total Assets</p>
            <p className="text-3xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-5">
            <p className="text-sm text-red-400 mb-1">Critical Assets</p>
            <p className="text-3xl font-bold text-white">{stats.critical}</p>
          </div>
          <div className="bg-orange-950/30 border border-orange-900/50 rounded-xl p-5">
            <p className="text-sm text-orange-400 mb-1">High Risk</p>
            <p className="text-3xl font-bold text-white">{stats.highRisk}</p>
          </div>
          <div className="bg-amber-950/30 border border-amber-900/50 rounded-xl p-5">
            <p className="text-sm text-amber-400 mb-1">With Vulnerabilities</p>
            <p className="text-3xl font-bold text-white">{stats.withVulns}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-400">Filters</span>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Search assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="bg-slate-800 border-slate-700">
                <SelectValue placeholder="Asset Type" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="server">Server</SelectItem>
                <SelectItem value="workstation">Workstation</SelectItem>
                <SelectItem value="cloud_resource">Cloud Resource</SelectItem>
                <SelectItem value="software_license">Software License</SelectItem>
                <SelectItem value="database">Database</SelectItem>
                <SelectItem value="application">Application</SelectItem>
              </SelectContent>
            </Select>
            <Select value={criticalityFilter} onValueChange={setCriticalityFilter}>
              <SelectTrigger className="bg-slate-800 border-slate-700">
                <SelectValue placeholder="Criticality" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800">
                <SelectItem value="all">All Criticality</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={environmentFilter} onValueChange={setEnvironmentFilter}>
              <SelectTrigger className="bg-slate-800 border-slate-700">
                <SelectValue placeholder="Environment" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800">
                <SelectItem value="all">All Environments</SelectItem>
                <SelectItem value="production">Production</SelectItem>
                <SelectItem value="staging">Staging</SelectItem>
                <SelectItem value="development">Development</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Assets Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-64 rounded-xl bg-slate-900/50 animate-pulse" />
            ))}
          </div>
        ) : filteredAssets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAssets.map(asset => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-slate-900/30 rounded-2xl border border-slate-800">
            <Server className="w-16 h-16 mx-auto mb-4 text-slate-700" />
            <h3 className="text-lg font-medium text-slate-400">No assets found</h3>
            <p className="text-slate-500 mt-1 mb-4">Start by adding your first asset</p>
            <Button onClick={() => setShowCreateDialog(true)} className="bg-cyan-600 hover:bg-cyan-500">
              <Plus className="w-4 h-4 mr-2" />
              Add Asset
            </Button>
          </div>
        )}
      </main>

      <CreateAssetDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  );
}
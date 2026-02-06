import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Server, 
  Monitor, 
  Cloud, 
  Key, 
  Database,
  Code,
  MapPin,
  User,
  AlertTriangle,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AssetCard({ asset }) {
  const typeIcons = {
    server: Server,
    workstation: Monitor,
    cloud_resource: Cloud,
    software_license: Key,
    database: Database,
    application: Code
  };

  const Icon = typeIcons[asset.asset_type] || Server;

  const criticalityColors = {
    critical: "bg-red-500/10 text-red-400 border-red-500/20",
    high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    low: "bg-blue-500/10 text-blue-400 border-blue-500/20"
  };

  const statusColors = {
    active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    inactive: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    maintenance: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    decommissioned: "bg-red-500/10 text-red-400 border-red-500/20"
  };

  const getRiskColor = (score) => {
    if (score >= 80) return "text-red-400";
    if (score >= 60) return "text-orange-400";
    if (score >= 40) return "text-amber-400";
    return "text-emerald-400";
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-white truncate">{asset.asset_name}</h4>
            <p className="text-xs text-slate-500 truncate">{asset.hostname || asset.asset_id}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Badge className={cn("text-xs border", criticalityColors[asset.criticality])}>
          {asset.criticality}
        </Badge>
        <Badge className={cn("text-xs border", statusColors[asset.status])}>
          {asset.status}
        </Badge>
        {asset.environment && (
          <Badge variant="outline" className="text-xs border-slate-700 text-slate-400">
            {asset.environment}
          </Badge>
        )}
      </div>

      {asset.description && (
        <p className="text-sm text-slate-400 mb-4 line-clamp-2">{asset.description}</p>
      )}

      <div className="space-y-2 mb-4 text-xs">
        {asset.location && (
          <div className="flex items-center gap-2 text-slate-400">
            <MapPin className="w-3 h-3" />
            <span>{asset.location}</span>
          </div>
        )}
        {asset.owner && (
          <div className="flex items-center gap-2 text-slate-400">
            <User className="w-3 h-3" />
            <span>{asset.owner.split('@')[0]}</span>
          </div>
        )}
      </div>

      {/* Risk & Vulnerability Info */}
      <div className="bg-slate-900/50 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-500">Risk Score</span>
          <span className={cn("text-lg font-bold", getRiskColor(asset.risk_score || 0))}>
            {asset.risk_score || 0}
          </span>
        </div>
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all",
              asset.risk_score >= 80 ? "bg-red-500" :
              asset.risk_score >= 60 ? "bg-orange-500" :
              asset.risk_score >= 40 ? "bg-amber-500" : "bg-emerald-500"
            )}
            style={{ width: `${asset.risk_score || 0}%` }}
          />
        </div>
      </div>

      {(asset.vulnerability_count > 0 || asset.incident_count > 0) && (
        <div className="flex items-center gap-4 mb-4 text-xs">
          {asset.vulnerability_count > 0 && (
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span className="text-slate-400">
                {asset.vulnerability_count} vuln{asset.vulnerability_count !== 1 ? 's' : ''}
              </span>
              {asset.critical_vuln_count > 0 && (
                <Badge className="bg-red-500/10 text-red-400 text-xs ml-1">
                  {asset.critical_vuln_count} critical
                </Badge>
              )}
            </div>
          )}
          {asset.incident_count > 0 && (
            <div className="flex items-center gap-1 text-orange-400">
              <span>{asset.incident_count} incident{asset.incident_count !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      )}

      <Button variant="outline" size="sm" className="w-full border-slate-700 text-slate-300 text-xs">
        View Details <ExternalLink className="w-3 h-3 ml-1" />
      </Button>
    </div>
  );
}
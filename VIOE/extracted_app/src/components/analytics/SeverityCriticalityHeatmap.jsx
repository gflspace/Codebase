import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SeverityCriticalityHeatmap({ data, criticalCombinations }) {
  const severities = ['critical', 'high', 'medium', 'low'];
  const criticalities = ['critical', 'high', 'medium', 'low', 'unknown'];

  const getCount = (severity, criticality) => {
    return data[`${severity}_${criticality}`] || 0;
  };

  const getHeatColor = (count) => {
    if (count === 0) return 'bg-slate-800/30';
    if (count >= 20) return 'bg-red-500/20 border-red-500/30';
    if (count >= 10) return 'bg-orange-500/20 border-orange-500/30';
    if (count >= 5) return 'bg-amber-500/20 border-amber-500/30';
    return 'bg-blue-500/20 border-blue-500/30';
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" />
        Severity × Asset Criticality Correlation
      </h3>

      <div className="space-y-4">
        {/* Heatmap */}
        <div className="overflow-x-auto">
          <div className="min-w-[500px]">
            <div className="grid grid-cols-6 gap-2 mb-2">
              <div></div>
              {criticalities.map(c => (
                <div key={c} className="text-xs text-center text-slate-400 capitalize">
                  {c}
                </div>
              ))}
            </div>
            {severities.map(severity => (
              <div key={severity} className="grid grid-cols-6 gap-2 mb-2">
                <div className="text-xs text-slate-400 capitalize flex items-center">
                  {severity}
                </div>
                {criticalities.map(criticality => {
                  const count = getCount(severity, criticality);
                  return (
                    <div
                      key={`${severity}_${criticality}`}
                      className={cn(
                        "h-12 rounded border flex items-center justify-center text-sm font-semibold transition-all hover:scale-105",
                        getHeatColor(count),
                        count > 0 ? 'text-white cursor-pointer' : 'text-slate-600'
                      )}
                      title={`${severity} severity, ${criticality} criticality: ${count} vulnerabilities`}
                    >
                      {count > 0 ? count : ''}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Critical Combinations */}
        {criticalCombinations?.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              High-Risk Combinations
            </p>
            {criticalCombinations.slice(0, 3).map((combo, idx) => (
              <div key={idx} className="p-2 rounded bg-red-950/20 border border-red-900/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-red-400">{combo.combination}</span>
                  <Badge className="bg-red-500/10 text-red-400 text-xs">{combo.count}</Badge>
                </div>
                <p className="text-xs text-slate-400">{combo.recommendation}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
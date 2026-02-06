import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { GitBranch, AlertCircle } from 'lucide-react';

export default function AssetTrendChart({ data }) {
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
          <p className="text-white font-medium">{payload[0].payload.asset}</p>
          <p className="text-orange-400 text-sm">{payload[0].value} vulnerabilities</p>
        </div>
      );
    }
    return null;
  };

  const topAsset = data[0];
  const totalVulns = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            Top Affected Assets
          </h3>
          <p className="text-xs text-slate-500 mt-1">Assets with most vulnerabilities</p>
        </div>
        {topAsset && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-900/30 border border-orange-800/50">
            <AlertCircle className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-sm font-medium text-orange-300">
              {((topAsset.count / totalVulns) * 100).toFixed(0)}% in {topAsset.asset}
            </span>
          </div>
        )}
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="horizontal">
            <XAxis 
              type="number"
              tick={{ fill: '#64748B', fontSize: 12 }}
            />
            <YAxis 
              type="category"
              dataKey="asset"
              tick={{ fill: '#64748B', fontSize: 11 }}
              width={140}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar 
              dataKey="count" 
              fill="#F59E0B"
              radius={[0, 8, 8, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex items-center justify-between p-4 rounded-xl bg-orange-950/20 border border-orange-900/50">
        <div>
          <p className="text-sm font-medium text-orange-300">Focus Area</p>
          <p className="text-xs text-slate-400 mt-1">Asset requiring immediate attention</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-orange-400">{topAsset?.count || 0}</p>
          <p className="text-xs text-slate-500">{topAsset?.asset || 'N/A'}</p>
        </div>
      </div>
    </div>
  );
}
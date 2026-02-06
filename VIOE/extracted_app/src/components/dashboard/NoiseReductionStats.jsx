import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Filter, TrendingDown } from 'lucide-react';

export default function NoiseReductionStats({ suppressedCount, totalCount }) {
  const reductionPercent = totalCount > 0 ? Math.round((suppressedCount / totalCount) * 100) : 0;
  
  const data = [
    { name: 'Dev', suppressed: 45, active: 12, env: 'development' },
    { name: 'Stage', suppressed: 28, active: 18, env: 'staging' },
    { name: 'Prod', suppressed: 8, active: 89, env: 'production' }
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
          <p className="text-white font-medium mb-1">{label} Environment</p>
          <p className="text-cyan-400 text-sm">Active: {payload[1]?.value || 0}</p>
          <p className="text-slate-500 text-sm">Suppressed: {payload[0]?.value || 0}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-900/50">
            <Filter className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">
              Noise Reduction
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Cross-environment correlation</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-900/30 border border-indigo-800/50">
          <TrendingDown className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-sm font-medium text-indigo-300">{reductionPercent}% reduced</span>
        </div>
      </div>

      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={2}>
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false}
              tick={{ fill: '#64748B', fontSize: 12 }}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false}
              tick={{ fill: '#64748B', fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="suppressed" stackId="a" fill="#334155" radius={[0, 0, 4, 4]} />
            <Bar dataKey="active" stackId="a" fill="#22D3EE" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="text-center p-3 rounded-xl bg-slate-800/50">
          <p className="text-lg font-bold text-slate-300">{data[0].suppressed}</p>
          <p className="text-xs text-slate-500">Dev Suppressed</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-slate-800/50">
          <p className="text-lg font-bold text-slate-300">{data[1].suppressed}</p>
          <p className="text-xs text-slate-500">Stage Suppressed</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-cyan-900/30 border border-cyan-800/30">
          <p className="text-lg font-bold text-cyan-400">{data[2].active}</p>
          <p className="text-xs text-cyan-500/70">Prod Active</p>
        </div>
      </div>
    </div>
  );
}
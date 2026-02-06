import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ShieldAlert, TrendingDown } from 'lucide-react';

export default function SeverityTrendChart({ current, previous }) {
  const data = [
    { name: 'Critical', value: current.critical, color: '#EF4444' },
    { name: 'High', value: current.high, color: '#F59E0B' },
    { name: 'Medium', value: current.medium, color: '#FBBF24' },
    { name: 'Low', value: current.low, color: '#3B82F6' }
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const prev = previous?.[payload[0].name.toLowerCase()] || 0;
      const change = payload[0].value - prev;
      const changePercent = prev > 0 ? ((change / prev) * 100).toFixed(0) : 0;
      
      return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
          <p className="text-white font-medium">{payload[0].name}</p>
          <p className="text-sm" style={{ color: payload[0].payload.color }}>
            Current: {payload[0].value}
          </p>
          {previous && (
            <p className="text-xs text-slate-400 mt-1">
              {change >= 0 ? '+' : ''}{change} ({changePercent >= 0 ? '+' : ''}{changePercent}%)
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const criticalPercent = total > 0 ? ((current.critical / total) * 100).toFixed(0) : 0;

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            Severity Distribution
          </h3>
          <p className="text-xs text-slate-500 mt-1">Current severity breakdown</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-900/30 border border-red-800/50">
          <span className="text-sm font-medium text-red-300">{criticalPercent}% Critical</span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="w-48 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-3">
          {data.map((item, index) => {
            const prev = previous?.[item.name.toLowerCase()] || 0;
            const change = item.value - prev;
            const isDecrease = change < 0;
            
            return (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-slate-300">{item.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  {previous && change !== 0 && (
                    <div className={`flex items-center gap-1 text-xs ${
                      isDecrease ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      <TrendingDown className={`w-3 h-3 ${isDecrease ? '' : 'rotate-180'}`} />
                      <span>{Math.abs(change)}</span>
                    </div>
                  )}
                  <span className="text-sm font-bold text-white min-w-8 text-right">
                    {item.value}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-800">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 rounded-xl bg-slate-800/50">
            <p className="text-2xl font-bold text-white">{total}</p>
            <p className="text-xs text-slate-500">Total Active</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-emerald-900/30 border border-emerald-800/30">
            <p className="text-2xl font-bold text-emerald-400">{current.resolved || 0}</p>
            <p className="text-xs text-emerald-500/70">Resolved</p>
          </div>
        </div>
      </div>
    </div>
  );
}
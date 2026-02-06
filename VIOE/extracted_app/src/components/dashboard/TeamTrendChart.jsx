import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { Users, TrendingUp } from 'lucide-react';

export default function TeamTrendChart({ data }) {
  const COLORS = ['#22D3EE', '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
          <p className="text-white font-medium">{payload[0].payload.team}</p>
          <p className="text-cyan-400 text-sm">{payload[0].value} vulnerabilities</p>
        </div>
      );
    }
    return null;
  };

  // Calculate trend (comparing last value to average)
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const avg = total / data.length;
  const topTeam = data[0];
  const trendPercent = topTeam ? (((topTeam.count - avg) / avg) * 100).toFixed(0) : 0;

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide flex items-center gap-2">
            <Users className="w-4 h-4" />
            Vulnerabilities by Team
          </h3>
          <p className="text-xs text-slate-500 mt-1">Distribution across teams</p>
        </div>
        {topTeam && (
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <div className="text-right">
              <p className="text-xs text-slate-500">Most Assigned</p>
              <p className="text-sm font-medium text-cyan-400">{topTeam.team}</p>
            </div>
          </div>
        )}
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="horizontal">
            <XAxis 
              type="number"
              tick={{ fill: '#64748B', fontSize: 12 }}
            />
            <YAxis 
              type="category"
              dataKey="team"
              tick={{ fill: '#64748B', fontSize: 12 }}
              width={120}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="count" radius={[0, 8, 8, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {data.slice(0, 3).map((team, idx) => (
          <div key={idx} className="text-center p-3 rounded-xl bg-slate-800/50">
            <p className="text-lg font-bold text-white">{team.count}</p>
            <p className="text-xs text-slate-500 truncate">{team.team}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
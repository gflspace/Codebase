import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Badge } from "@/components/ui/badge";
import { Target } from 'lucide-react';

export default function AttackVectorChart({ data, analysis }) {
  const chartData = Object.entries(data).map(([name, value]) => ({
    name,
    count: value
  })).sort((a, b) => b.count - a.count);

  const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#06b6d4', '#8b5cf6', '#ec4899'];

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-2">
        <Target className="w-4 h-4" />
        Attack Vector Distribution
      </h3>

      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis 
            dataKey="name" 
            stroke="#94a3b8"
            style={{ fontSize: '11px' }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            stroke="#94a3b8"
            style={{ fontSize: '12px' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#fff'
            }}
          />
          <Bar dataKey="count" radius={[8, 8, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* AI Analysis */}
      {analysis?.length > 0 && (
        <div className="space-y-2 mt-4 pt-4 border-t border-slate-800">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            AI Threat Analysis
          </p>
          {analysis.slice(0, 3).map((item, idx) => (
            <div key={idx} className="p-2 rounded bg-slate-800/50 border border-slate-700">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-white">{item.vector}</span>
                <Badge className={
                  item.threat_level === 'critical' ? 'bg-red-500/10 text-red-400' :
                  item.threat_level === 'high' ? 'bg-orange-500/10 text-orange-400' :
                  'bg-amber-500/10 text-amber-400'
                }>
                  {item.threat_level}
                </Badge>
              </div>
              <p className="text-xs text-slate-400">{item.architectural_component}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
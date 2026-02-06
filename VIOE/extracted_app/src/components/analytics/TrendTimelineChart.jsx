import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

export default function TrendTimelineChart({ data, summary }) {
  const chartData = data.map(snapshot => ({
    date: new Date(snapshot.snapshot_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    total: snapshot.total_count,
    open: snapshot.open_count,
    critical: snapshot.critical_count,
    resolved: snapshot.resolved_count
  }));

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Vulnerability Trends Over Time
          </h3>
          {summary && (
            <p className="text-xs text-slate-500 mt-1">{summary}</p>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis 
            dataKey="date" 
            stroke="#94a3b8"
            style={{ fontSize: '12px' }}
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
          <Legend />
          <Line type="monotone" dataKey="total" stroke="#06b6d4" strokeWidth={2} name="Total" />
          <Line type="monotone" dataKey="open" stroke="#f59e0b" strokeWidth={2} name="Open" />
          <Line type="monotone" dataKey="critical" stroke="#ef4444" strokeWidth={2} name="Critical" />
          <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} name="Resolved" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
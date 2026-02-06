import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, CartesianGrid } from 'recharts';
import { TrendingUp, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function TrendChart({ data, anomaly }) {
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 shadow-xl">
          <p className="text-white font-medium mb-2">
            {format(parseISO(label), 'MMM d, yyyy')}
          </p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Vulnerability Trends
          </h3>
          <p className="text-xs text-slate-500 mt-1">Historical counts over time</p>
        </div>
        
        {anomaly?.detected && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-900/30 border border-amber-800/50">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-300">
              {anomaly.spike_percent > 0 ? '+' : ''}{anomaly.spike_percent}% spike
            </span>
          </div>
        )}
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis 
              dataKey="date" 
              tick={{ fill: '#64748B', fontSize: 12 }}
              tickFormatter={(date) => format(parseISO(date), 'MMM d')}
            />
            <YAxis 
              tick={{ fill: '#64748B', fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
            />
            <Line 
              type="monotone" 
              dataKey="total" 
              stroke="#22D3EE" 
              strokeWidth={2}
              name="Total"
              dot={{ fill: '#22D3EE', r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line 
              type="monotone" 
              dataKey="open" 
              stroke="#6366F1" 
              strokeWidth={2}
              name="Open"
              dot={{ fill: '#6366F1', r: 3 }}
            />
            <Line 
              type="monotone" 
              dataKey="critical" 
              stroke="#EF4444" 
              strokeWidth={2}
              name="Critical"
              dot={{ fill: '#EF4444', r: 3 }}
            />
            <Line 
              type="monotone" 
              dataKey="high" 
              stroke="#F59E0B" 
              strokeWidth={2}
              name="High"
              dot={{ fill: '#F59E0B', r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {anomaly?.detected && anomaly?.details && (
        <div className="mt-4 p-4 rounded-xl bg-amber-950/20 border border-amber-900/50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-300 mb-1">Anomaly Detected</p>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {anomaly.details}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
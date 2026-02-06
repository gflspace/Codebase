import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp } from 'lucide-react';

export default function RiskPostureChart({ metrics }) {
  if (!metrics) return null;

  const chartData = [
    { name: 'Baseline', score: metrics.baseline_risk_score || 0 },
    { name: 'Current', score: metrics.current_risk_score || 0 },
    { name: '30d Projection', score: metrics.projected_score_30_days || 0 }
  ];

  const improvement = metrics.improvement_percentage || 0;
  const isImproving = improvement > 0;

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-2">
            {isImproving ? (
              <TrendingDown className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingUp className="w-4 h-4 text-red-400" />
            )}
            Risk Posture Reduction
          </h3>
        </div>
        <Badge className={isImproving ? 
          'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
          'bg-red-500/10 text-red-400 border-red-500/20'
        }>
          {isImproving ? '↓' : '↑'} {Math.abs(improvement)}% {isImproving ? 'Improvement' : 'Increase'}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-lg bg-slate-800/50">
          <p className="text-xs text-slate-500 mb-1">Baseline Risk</p>
          <p className="text-2xl font-bold text-slate-300">{metrics.baseline_risk_score}</p>
        </div>
        <div className="p-4 rounded-lg bg-slate-800/50">
          <p className="text-xs text-slate-500 mb-1">Current Risk</p>
          <p className="text-2xl font-bold text-cyan-400">{metrics.current_risk_score}</p>
        </div>
        <div className="p-4 rounded-lg bg-slate-800/50">
          <p className="text-xs text-slate-500 mb-1">Projected (30d)</p>
          <p className="text-2xl font-bold text-emerald-400">{metrics.projected_score_30_days}</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis 
            dataKey="name" 
            stroke="#94a3b8"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#94a3b8"
            style={{ fontSize: '12px' }}
            domain={[0, 100]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#fff'
            }}
          />
          <Area 
            type="monotone" 
            dataKey="score" 
            stroke="#06b6d4" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#riskGradient)" 
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="mt-4 p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/50">
        <p className="text-xs text-emerald-400 font-medium mb-1">Impact Summary</p>
        <p className="text-xs text-slate-300">
          {metrics.vulnerabilities_eliminated} vulnerabilities eliminated through remediation efforts, 
          reducing overall risk exposure by {improvement}%.
        </p>
      </div>
    </div>
  );
}
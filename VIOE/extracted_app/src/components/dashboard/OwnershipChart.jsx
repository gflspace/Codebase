import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function OwnershipChart({ data }) {
  const COLORS = ['#22D3EE', '#6366F1', '#F59E0B', '#EF4444'];
  
  const chartData = [
    { name: 'AI Assigned (High Conf)', value: data?.highConfidence || 72, color: '#22D3EE' },
    { name: 'AI Assigned (Med Conf)', value: data?.medConfidence || 18, color: '#6366F1' },
    { name: 'Manual Review Needed', value: data?.needsReview || 7, color: '#F59E0B' },
    { name: 'Unassigned', value: data?.unassigned || 3, color: '#EF4444' }
  ];

  const total = chartData.reduce((acc, item) => acc + item.value, 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
          <p className="text-white font-medium">{payload[0].name}</p>
          <p className="text-slate-400 text-sm">
            {payload[0].value}% ({Math.round(payload[0].value * total / 100)} vulns)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
      <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-4">
        Ownership Resolution
      </h3>
      
      <div className="flex items-center gap-6">
        <div className="w-40 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-3">
          {chartData.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="w-2.5 h-2.5 rounded-full" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-slate-300">{item.name}</span>
              </div>
              <span className="text-sm font-medium text-white">{item.value}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">Auto-Assignment Rate</span>
          <span className="text-lg font-bold text-cyan-400">
            {(chartData[0].value + chartData[1].value)}%
          </span>
        </div>
      </div>
    </div>
  );
}
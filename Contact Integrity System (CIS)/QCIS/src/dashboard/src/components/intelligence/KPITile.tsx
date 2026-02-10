'use client';

import type { KPIMetric } from '@/lib/api';

const STATUS_BORDER: Record<string, string> = {
  green: 'border-l-cis-green',
  amber: 'border-l-cis-orange',
  red: 'border-l-cis-red',
};

const STATUS_BADGE: Record<string, string> = {
  green: 'bg-cis-green-soft text-cis-green',
  amber: 'bg-cis-orange-soft text-cis-orange',
  red: 'bg-cis-red-soft text-cis-red',
};

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const w = 80;
  const h = 24;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 2) - 1}`)
    .join(' ');
  return (
    <svg width={w} height={h} className="inline-block mt-1">
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const SPARKLINE_COLORS: Record<string, string> = {
  green: '#32A402',
  amber: '#ffa500',
  red: '#ff0000',
};

interface KPITileProps {
  label: string;
  metric: KPIMetric;
}

export default function KPITile({ label, metric }: KPITileProps) {
  const { value, previous, sparkline, status, tooltip } = metric;

  const pctChange = previous !== 0
    ? Math.round(((value - previous) / previous) * 100)
    : 0;

  const changeArrow = pctChange > 0 ? '\u2191' : pctChange < 0 ? '\u2193' : '\u2192';
  const changeColor = status === 'red' ? 'text-cis-red' : status === 'amber' ? 'text-cis-orange' : 'text-gray-400';

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 border-l-4 ${STATUS_BORDER[status]} p-4 relative group`}
      title={tooltip}
    >
      <p className="text-xs text-gray-500 font-medium truncate">{label}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-2xl font-bold text-gray-900">
          {typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value}
        </span>
        {pctChange !== 0 && (
          <span className={`text-xs font-medium ${changeColor}`}>
            {changeArrow} {Math.abs(pctChange)}%
          </span>
        )}
      </div>
      <Sparkline data={sparkline} color={SPARKLINE_COLORS[status] || '#9CA3AF'} />

      {/* Tooltip overlay */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none max-w-[220px] z-10 whitespace-normal">
        {tooltip}
      </div>
    </div>
  );
}

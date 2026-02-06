'use client'

import { formatPrice } from '@/lib/utils'

interface TrendDataPoint {
  date: string
  amount: number
}

interface RevenueChartProps {
  data: {
    totalRevenue?: number
    count?: number
    averageTicket?: number
    trendData?: TrendDataPoint[]
    revenueLogs?: any[]
  } | null
}

export default function RevenueChart({ data }: RevenueChartProps) {
  // Get trend data from either trendData or revenueLogs
  let chartData: TrendDataPoint[] = []

  if (data?.trendData && data.trendData.length > 0) {
    chartData = data.trendData
  } else if (data?.revenueLogs && data.revenueLogs.length > 0) {
    // Fallback to revenueLogs if trendData not available
    const dailyRevenue: Record<string, number> = {}
    data.revenueLogs.forEach((log: any) => {
      const dateKey = new Date(log.date).toISOString().split('T')[0]
      dailyRevenue[dateKey] = (dailyRevenue[dateKey] || 0) + Number(log.amount)
    })
    chartData = Object.entries(dailyRevenue)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  // If no data at all
  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <span className="text-4xl mb-4">📊</span>
        <p className="text-brand-charcoal font-medium">No revenue data yet</p>
        <p className="text-brand-silver text-sm mt-1">
          Complete appointments to see revenue trends
        </p>
      </div>
    )
  }

  // Calculate max for scaling
  const maxAmount = Math.max(...chartData.map(d => d.amount))
  const minAmount = Math.min(...chartData.map(d => d.amount))

  // Calculate trend (compare first half vs second half)
  const midPoint = Math.floor(chartData.length / 2)
  const firstHalfAvg = chartData.slice(0, midPoint).reduce((sum, d) => sum + d.amount, 0) / (midPoint || 1)
  const secondHalfAvg = chartData.slice(midPoint).reduce((sum, d) => sum + d.amount, 0) / ((chartData.length - midPoint) || 1)
  const trendPercent = firstHalfAvg > 0 ? Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100) : 0
  const isPositiveTrend = trendPercent >= 0

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00')
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Calculate total for display
  const totalRevenue = chartData.reduce((sum, d) => sum + d.amount, 0)

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-display text-brand-black">{formatPrice(totalRevenue)}</p>
          <p className="text-sm text-brand-silver">Total revenue</p>
        </div>
        <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
          isPositiveTrend
            ? 'bg-green-100 text-green-700'
            : 'bg-red-100 text-red-700'
        }`}>
          <span>{isPositiveTrend ? '↑' : '↓'}</span>
          <span>{Math.abs(trendPercent)}%</span>
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-48">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-6 w-12 flex flex-col justify-between text-xs text-brand-silver">
          <span>{formatPrice(maxAmount)}</span>
          <span>{formatPrice(maxAmount / 2)}</span>
          <span>$0</span>
        </div>

        {/* Chart area */}
        <div className="ml-14 h-full flex items-end gap-1 pb-6">
          {chartData.map((point, index) => {
            const height = maxAmount > 0 ? (point.amount / maxAmount) * 100 : 0
            const isLast = index === chartData.length - 1

            return (
              <div
                key={point.date}
                className="flex-1 flex flex-col items-center group relative"
              >
                {/* Bar */}
                <div
                  className={`w-full rounded-t-sm transition-all duration-200 ${
                    isLast
                      ? 'bg-accent-gold'
                      : 'bg-accent-gold/40 group-hover:bg-accent-gold/60'
                  }`}
                  style={{ height: `${Math.max(height, 2)}%` }}
                />

                {/* Tooltip on hover */}
                <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                  <div className="bg-brand-black text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                    <p className="font-medium">{formatPrice(point.amount)}</p>
                    <p className="text-brand-silver">{formatDate(point.date)}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* X-axis labels */}
        <div className="ml-14 flex justify-between text-xs text-brand-silver">
          <span>{formatDate(chartData[0].date)}</span>
          {chartData.length > 1 && (
            <span>{formatDate(chartData[chartData.length - 1].date)}</span>
          )}
        </div>
      </div>

      {/* Trend Line Indicator */}
      <div className="flex items-center gap-4 pt-2 border-t border-brand-pearl">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-accent-gold"></div>
          <span className="text-xs text-brand-silver">Daily Revenue</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-brand-silver">
            {chartData.length} day{chartData.length !== 1 ? 's' : ''} of data
          </span>
        </div>
      </div>
    </div>
  )
}

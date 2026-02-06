'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton'
import { cn, formatPrice, formatTime } from '@/lib/utils'
import RevenueChart from '@/components/RevenueChart'

type TimeFrame = 'today' | 'week' | 'month'

interface KPIData {
  revenue: {
    totalRevenue: number
    count: number
    averageTicket: number
  }
  appointments: {
    upcoming: number
    completed: number
    noShows: number
    cancelled: number
  }
  clients: {
    newThisMonth: number
    returning: number
    rebookingRate: number
  }
}

interface TodayAppointment {
  id: string
  startTime: string
  endTime: string
  status: string
  client: {
    firstName: string
    lastName: string
    phone: string
  }
  hairstyleName?: string
  price?: number
}

export default function AdminDashboard() {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('month')
  const [kpiData, setKpiData] = useState<KPIData | null>(null)
  const [todayAppointments, setTodayAppointments] = useState<TodayAppointment[]>([])
  const [topStyle, setTopStyle] = useState<string>('Loading...')
  const [topClients, setTopClients] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [timeFrame])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const [revenueRes, appointmentsRes, todayRes, clientsRes] = await Promise.all([
        api.get(`/revenue/analytics?timeframe=${timeFrame}`),
        api.get('/appointments'),
        api.get(`/appointments?date=${new Date().toISOString().split('T')[0]}`),
        api.get('/clients'),
      ])

      const appointments = appointmentsRes.data.appointments || []
      const clients = clientsRes.data.clients || []
      const completedApts = appointments.filter((a: any) => a.status === 'COMPLETED')

      const upcoming = appointments.filter((a: any) =>
        a.status === 'CONFIRMED' && new Date(a.startTime) > new Date()
      ).length
      const completed = completedApts.length
      const noShows = appointments.filter((a: any) => a.status === 'NO_SHOW').length
      const cancelled = appointments.filter((a: any) => a.status === 'CANCELLED').length

      // Calculate TOP STYLE from completed appointments
      const styleCounts: Record<string, number> = {}
      completedApts.forEach((apt: any) => {
        const style = apt.hairstyleName || 'Custom'
        styleCounts[style] = (styleCounts[style] || 0) + 1
      })
      const topStyleEntry = Object.entries(styleCounts).sort((a, b) => b[1] - a[1])[0]
      setTopStyle(topStyleEntry ? topStyleEntry[0] : 'No data yet')

      // Calculate TOP CLIENTS from completed appointments
      const clientVisits: Record<string, { name: string; visits: number }> = {}
      completedApts.forEach((apt: any) => {
        const clientId = apt.client?.id
        if (!clientId) return
        const name = apt.client.firstName
        if (!clientVisits[clientId]) {
          clientVisits[clientId] = { name, visits: 0 }
        }
        clientVisits[clientId].visits++
      })
      const topClientsList = Object.values(clientVisits)
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 3)
        .map(c => c.name)
      setTopClients(topClientsList.length > 0 ? topClientsList : ['No data yet'])

      // Calculate real client stats
      const totalClients = clients.length
      const clientsWithMultipleVisits = Object.values(clientVisits).filter(c => c.visits > 1).length
      const rebookingRate = Object.keys(clientVisits).length > 0
        ? Math.round((clientsWithMultipleVisits / Object.keys(clientVisits).length) * 100)
        : 0

      // Calculate new clients this month
      const thisMonth = new Date()
      thisMonth.setDate(1)
      thisMonth.setHours(0, 0, 0, 0)
      const newThisMonth = clients.filter((c: any) =>
        new Date(c.createdAt) >= thisMonth
      ).length

      setKpiData({
        revenue: revenueRes.data || { totalRevenue: 0, count: 0, averageTicket: 0 },
        appointments: { upcoming, completed, noShows, cancelled },
        clients: {
          newThisMonth,
          returning: clientsWithMultipleVisits,
          rebookingRate,
        },
      })

      setTodayAppointments(todayRes.data.appointments || [])
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton variant="text" className="h-8 w-48" />
          <Skeleton variant="rounded" className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <SkeletonCard className="h-80" />
      </div>
    )
  }

  const noShowRate = kpiData?.appointments.completed
    ? Math.round((kpiData.appointments.noShows / (kpiData.appointments.completed + kpiData.appointments.noShows)) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-h2 font-display text-brand-black">Dashboard</h1>
          <p className="text-caption text-brand-silver mt-1">
            Welcome back! Here's what's happening today.
          </p>
        </div>

        {/* Time Frame Toggle */}
        <div className="flex items-center gap-1 bg-brand-pearl rounded-lg p-1">
          {(['today', 'week', 'month'] as TimeFrame[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeFrame(tf)}
              className={cn(
                'px-4 py-2 text-caption font-medium rounded-md transition-all',
                timeFrame === tf
                  ? 'bg-brand-white text-brand-black shadow-sm'
                  : 'text-brand-silver hover:text-brand-charcoal'
              )}
            >
              {tf.charAt(0).toUpperCase() + tf.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue Card */}
        <Card variant="elevated" className="bg-gradient-to-br from-accent-gold/10 to-accent-gold/5 border-accent-gold/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-caption text-brand-silver mb-1">Total Revenue</p>
                <p className="text-h2 font-display text-brand-black">
                  {formatPrice(kpiData?.revenue.totalRevenue || 0)}
                </p>
                <p className="text-micro text-brand-silver mt-1">
                  {kpiData?.revenue.count || 0} completed bookings
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-accent-gold/20 flex items-center justify-center">
                <span className="text-xl">💰</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appointments Card */}
        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-caption text-brand-silver mb-1">Upcoming</p>
                <p className="text-h2 font-display text-brand-black">
                  {kpiData?.appointments.upcoming || 0}
                </p>
                <p className="text-micro text-status-available mt-1">
                  {kpiData?.appointments.completed || 0} completed
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-status-available/20 flex items-center justify-center">
                <span className="text-xl">📅</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* No-Show Rate Card */}
        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-caption text-brand-silver mb-1">No-Show Rate</p>
                <p className={cn(
                  'text-h2 font-display',
                  noShowRate > 15 ? 'text-status-booked' : 'text-status-available'
                )}>
                  {noShowRate}%
                </p>
                <p className="text-micro text-brand-silver mt-1">
                  {kpiData?.appointments.noShows || 0} no-shows
                </p>
              </div>
              <div className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center',
                noShowRate > 15 ? 'bg-status-booked/20' : 'bg-status-available/20'
              )}>
                <span className="text-xl">{noShowRate > 15 ? '⚠️' : '✅'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rebooking Rate Card */}
        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-caption text-brand-silver mb-1">Rebooking Rate</p>
                <p className="text-h2 font-display text-accent-lavender">
                  {kpiData?.clients.rebookingRate || 0}%
                </p>
                <p className="text-micro text-brand-silver mt-1">
                  {kpiData?.clients.returning || 0} returning clients
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-accent-lavender/20 flex items-center justify-center">
                <span className="text-xl">💜</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card variant="elevated" className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={kpiData?.revenue} />
          </CardContent>
        </Card>

        {/* Business Performance */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>This Week</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Weekly Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-accent-gold/10 rounded-lg text-center">
                <p className="text-h3 font-display text-accent-gold-dark">
                  {todayAppointments.length}
                </p>
                <p className="text-micro text-brand-silver">Today</p>
              </div>
              <div className="p-3 bg-accent-lavender/10 rounded-lg text-center">
                <p className="text-h3 font-display text-accent-lavender">
                  {kpiData?.appointments.upcoming || 0}
                </p>
                <p className="text-micro text-brand-silver">Upcoming</p>
              </div>
            </div>

            {/* Revenue Target */}
            <div className="p-3 bg-brand-pearl rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-caption text-brand-silver">Monthly Goal</span>
                <span className="text-caption font-medium text-brand-black">
                  {Math.min(100, Math.round(((kpiData?.revenue.totalRevenue || 0) / 5000) * 100))}%
                </span>
              </div>
              <div className="w-full h-2 bg-brand-white rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent-gold to-accent-rose rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.round(((kpiData?.revenue.totalRevenue || 0) / 5000) * 100))}%` }}
                />
              </div>
              <p className="text-micro text-brand-silver mt-1">
                {formatPrice(kpiData?.revenue.totalRevenue || 0)} of $5,000
              </p>
            </div>

            {/* Pending Actions */}
            <div className="space-y-2">
              <p className="text-caption font-medium text-brand-charcoal">Needs Attention</p>

              {kpiData?.appointments.noShows && kpiData.appointments.noShows > 0 ? (
                <Link href="/admin/appointments?status=NO_SHOW" className="block">
                  <div className="flex items-center justify-between p-2 bg-status-limited/10 rounded-lg hover:bg-status-limited/20 transition">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">⚠️</span>
                      <span className="text-caption text-brand-charcoal">No-shows to review</span>
                    </div>
                    <Badge variant="warning">{kpiData.appointments.noShows}</Badge>
                  </div>
                </Link>
              ) : null}

              {kpiData?.clients.newThisMonth && kpiData.clients.newThisMonth > 0 ? (
                <div className="flex items-center justify-between p-2 bg-status-available/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">✨</span>
                    <span className="text-caption text-brand-charcoal">New clients this month</span>
                  </div>
                  <Badge variant="success">{kpiData.clients.newThisMonth}</Badge>
                </div>
              ) : null}

              {todayAppointments.filter(a => a.status === 'CONFIRMED').length > 0 ? (
                <div className="flex items-center justify-between p-2 bg-accent-gold/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">📅</span>
                    <span className="text-caption text-brand-charcoal">Appointments today</span>
                  </div>
                  <Badge variant="accent">{todayAppointments.filter(a => a.status === 'CONFIRMED').length}</Badge>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2 text-brand-silver">
                  <span className="text-sm">✅</span>
                  <span className="text-caption">All caught up!</span>
                </div>
              )}
            </div>

            {/* Quick Links */}
            <div className="pt-2 border-t border-brand-pearl grid grid-cols-4 gap-1">
              <Link href="/admin/calendar" className="flex flex-col items-center p-2 rounded-lg hover:bg-brand-pearl transition">
                <span className="text-lg">📅</span>
                <span className="text-micro text-brand-silver">Calendar</span>
              </Link>
              <Link href="/admin/hairstyles" className="flex flex-col items-center p-2 rounded-lg hover:bg-brand-pearl transition">
                <span className="text-lg">💇‍♀️</span>
                <span className="text-micro text-brand-silver">Styles</span>
              </Link>
              <Link href="/admin/feed" className="flex flex-col items-center p-2 rounded-lg hover:bg-brand-pearl transition">
                <span className="text-lg">📸</span>
                <span className="text-micro text-brand-silver">Feed</span>
              </Link>
              <Link href="/admin/insights" className="flex flex-col items-center p-2 rounded-lg hover:bg-brand-pearl transition">
                <span className="text-lg">💡</span>
                <span className="text-micro text-brand-silver">Insights</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule & AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <Card variant="elevated">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Today's Schedule</CardTitle>
            <Badge variant="accent">{todayAppointments.length} appointments</Badge>
          </CardHeader>
          <CardContent>
            {todayAppointments.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-4xl mb-4 block">📭</span>
                <p className="text-body text-brand-silver">No appointments today</p>
                <p className="text-caption text-brand-silver mt-1">Enjoy your day off!</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {todayAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between p-3 bg-brand-pearl rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent-gold/20 flex items-center justify-center text-accent-gold-dark font-medium text-caption">
                        {apt.client.firstName.charAt(0)}{apt.client.lastName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-body font-medium text-brand-black">
                          {apt.client.firstName} {apt.client.lastName}
                        </p>
                        <p className="text-caption text-brand-silver">
                          {formatTime(apt.startTime)} - {apt.hairstyleName || 'Custom'}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={apt.status as any} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Insights Preview */}
        <Card variant="elevated" className="bg-gradient-to-br from-accent-lavender/10 to-accent-rose/10 border-accent-lavender/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <span className="text-lg">🤖</span>
              AI Insights
            </CardTitle>
            <Link href="/admin/insights">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-brand-white/80 rounded-lg">
              <div className="flex items-start gap-3">
                <span className="text-xl">💰</span>
                <div>
                  <p className="text-body font-medium text-brand-black">Total Earned</p>
                  <p className="text-caption text-brand-silver">
                    You've earned <span className="text-status-available font-medium">{formatPrice(kpiData?.revenue.totalRevenue || 0)}</span> from {kpiData?.appointments.completed || 0} completed appointments
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-brand-white/80 rounded-lg">
              <div className="flex items-start gap-3">
                <span className="text-xl">⭐</span>
                <div>
                  <p className="text-body font-medium text-brand-black">Top Style</p>
                  <p className="text-caption text-brand-silver">
                    <span className="text-accent-gold-dark font-medium">{topStyle}</span> is your most popular style
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-brand-white/80 rounded-lg">
              <div className="flex items-start gap-3">
                <span className="text-xl">👥</span>
                <div>
                  <p className="text-body font-medium text-brand-black">Loyal Clients</p>
                  <p className="text-caption text-brand-silver">
                    <span className="text-accent-lavender font-medium">{topClients.join(', ')}</span> {topClients.length > 1 ? 'are' : 'is'} your most frequent {topClients.length > 1 ? 'returners' : 'client'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-brand-white/80 rounded-lg">
              <div className="flex items-start gap-3">
                <span className="text-xl">💵</span>
                <div>
                  <p className="text-body font-medium text-brand-black">Avg Ticket</p>
                  <p className="text-caption text-brand-silver">
                    Average appointment value is <span className="text-status-available font-medium">{formatPrice(kpiData?.revenue.averageTicket || 95)}</span>
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

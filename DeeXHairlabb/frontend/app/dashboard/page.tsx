'use client'

import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import api from '@/lib/api'
import RevenueChart from '@/components/RevenueChart'

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const [revenueRes, appointmentsRes] = await Promise.all([
        api.get('/revenue/analytics?timeframe=month'),
        api.get('/appointments?status=CONFIRMED'),
      ])

      setStats({
        revenue: revenueRes.data,
        appointments: appointmentsRes.data.appointments,
      })
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Revenue (Month)</h3>
            <p className="text-3xl font-bold text-primary-600 mt-2">
              ${stats?.revenue?.totalRevenue?.toFixed(2) || '0.00'}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Completed Appointments</h3>
            <p className="text-3xl font-bold text-primary-600 mt-2">
              {stats?.revenue?.count || 0}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Upcoming Appointments</h3>
            <p className="text-3xl font-bold text-primary-600 mt-2">
              {stats?.appointments?.length || 0}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-semibold mb-4">Revenue Analytics</h2>
          <RevenueChart data={stats?.revenue} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <a
                href="/dashboard/appointments"
                className="block p-3 bg-primary-50 rounded hover:bg-primary-100"
              >
                Manage Appointments
              </a>
              <a
                href="/dashboard/exports"
                className="block p-3 bg-primary-50 rounded hover:bg-primary-100"
              >
                Export Reports
              </a>
              <a
                href="/dashboard/content"
                className="block p-3 bg-primary-50 rounded hover:bg-primary-100"
              >
                Manage Content
              </a>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            <p className="text-gray-500">Activity feed coming soon...</p>
          </div>
        </div>
      </div>
    </Layout>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

export default function AdminExports() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [exportRequests, setExportRequests] = useState<any[]>([])
  const [formData, setFormData] = useState({
    reportType: 'customers',
    startDate: '',
    endDate: '',
  })

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/')
      return
    }
    fetchExports()
  }, [router])

  const handleExitAdmin = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  const fetchExports = async () => {
    try {
      const response = await api.get('/exports')
      setExportRequests(response.data.exportRequests || [])
    } catch (error) {
      console.error('Failed to fetch exports:', error)
    }
  }

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const filters: any = {}
      if (formData.startDate || formData.endDate) {
        filters.timeRange = {
          startDate: formData.startDate || undefined,
          endDate: formData.endDate || undefined,
        }
      }

      const response = await api.post('/exports/request', {
        reportType: formData.reportType,
        filters,
      })

      alert('Export request submitted! Check back in a moment.')
      fetchExports()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create export')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Dashboard
              </button>
              <h1 className="text-xl font-bold text-primary-700">Export Reports</h1>
            </div>
            <button
              onClick={handleExitAdmin}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            >
              Exit Admin Mode
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-semibold mb-4">Create Export</h2>
          <form onSubmit={handleExport} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Report Type
              </label>
              <select
                value={formData.reportType}
                onChange={(e) => setFormData({ ...formData, reportType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="customers">Customers</option>
                <option value="appointments">Appointments</option>
                <option value="revenue">Revenue</option>
                <option value="promotions">Promotions</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date (Optional)
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date (Optional)
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Export'}
            </button>
          </form>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Export History</h2>
          {exportRequests.length === 0 ? (
            <p className="text-gray-500">No exports yet</p>
          ) : (
            <div className="space-y-4">
              {exportRequests.map((req) => (
                <div
                  key={req.id}
                  className="border border-gray-200 rounded-lg p-4 flex justify-between items-center"
                >
                  <div>
                    <h3 className="font-semibold capitalize">{req.reportType} Report</h3>
                    <p className="text-sm text-gray-500">
                      Created: {new Date(req.createdAt).toLocaleString()}
                    </p>
                    <p className="text-sm">
                      Status:{' '}
                      <span
                        className={`font-semibold ${
                          req.status === 'completed'
                            ? 'text-green-600'
                            : req.status === 'failed'
                            ? 'text-red-600'
                            : 'text-yellow-600'
                        }`}
                      >
                        {req.status}
                      </span>
                    </p>
                  </div>
                  {req.status === 'completed' && req.googleSheetUrl && (
                    <a
                      href={req.googleSheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
                    >
                      Open Sheet
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

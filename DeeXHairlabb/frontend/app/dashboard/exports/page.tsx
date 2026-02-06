'use client'

import { useState } from 'react'
import Layout from '@/components/Layout'
import api from '@/lib/api'

export default function ExportsPage() {
  const [reportType, setReportType] = useState('customers')
  const [timeRange, setTimeRange] = useState({ startDate: '', endDate: '' })
  const [loading, setLoading] = useState(false)
  const [exportRequest, setExportRequest] = useState<any>(null)

  const handleExport = async () => {
    setLoading(true)
    try {
      const response = await api.post('/exports/request', {
        reportType,
        timeRange: timeRange.startDate || timeRange.endDate ? timeRange : undefined,
      })
      setExportRequest(response.data.exportRequest)
      alert('Export request submitted! Check back in a moment for the Google Sheets link.')
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create export')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Export Reports</h1>

        <div className="bg-white p-6 rounded-lg shadow space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Type
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="customers">Customers Report</option>
              <option value="appointments">Appointments Report</option>
              <option value="revenue">Revenue Report</option>
              <option value="promotions">Promotions Report</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date (Optional)
              </label>
              <input
                type="date"
                value={timeRange.startDate}
                onChange={(e) => setTimeRange({ ...timeRange, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date (Optional)
              </label>
              <input
                type="date"
                value={timeRange.endDate}
                onChange={(e) => setTimeRange({ ...timeRange, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <button
            onClick={handleExport}
            disabled={loading}
            className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Creating Export...' : 'Create Google Sheets Export'}
          </button>

          {exportRequest && (
            <div className="p-4 bg-green-50 rounded">
              <p className="text-sm text-green-800">
                Export request created! Status: {exportRequest.status}
              </p>
              <p className="text-xs text-green-600 mt-1">
                The export is being processed. Check the export requests list for the Google Sheets link when ready.
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Export Instructions</h2>
          <p className="text-gray-600 text-sm">
            The AI assistant can help you prepare export instructions. Use the chat feature to request exports in natural language.
          </p>
        </div>
      </div>
    </Layout>
  )
}

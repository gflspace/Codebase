'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Layout from '@/components/Layout'
import api from '@/lib/api'

const bookingSchema = z.object({
  serviceName: z.string().min(1, 'Service name is required'),
  servicePrice: z.number().positive('Price must be positive'),
  scheduledAt: z.string().min(1, 'Date and time is required'),
  duration: z.number().int().positive('Duration must be positive'),
  notes: z.string().optional(),
})

type BookingForm = z.infer<typeof bookingSchema>

export default function NewBookingPage() {
  const router = useRouter()
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      duration: 60,
      servicePrice: 50,
    },
  })

  const selectedDate = watch('scheduledAt')
  const selectedDuration = watch('duration')

  const checkAvailability = async () => {
    if (!selectedDate || !selectedDuration) {
      setError('Please select a date and duration first')
      return
    }

    setCheckingAvailability(true)
    try {
      const date = new Date(selectedDate).toISOString().split('T')[0]
      const response = await api.get(`/appointments/availability?date=${date}&duration=${selectedDuration}`)
      setAvailableSlots(response.data.availableSlots)
    } catch (error) {
      setError('Failed to check availability')
    } finally {
      setCheckingAvailability(false)
    }
  }

  const onSubmit = async (data: BookingForm) => {
    setLoading(true)
    setError(null)

    try {
      await api.post('/appointments', data)
      router.push('/bookings')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create appointment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Book New Appointment</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-lg shadow space-y-4">
          <div>
            <label htmlFor="serviceName" className="block text-sm font-medium text-gray-700 mb-1">
              Service Name
            </label>
            <input
              {...register('serviceName')}
              type="text"
              id="serviceName"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g., Box Braids, Cornrows"
            />
            {errors.serviceName && (
              <p className="mt-1 text-sm text-red-600">{errors.serviceName.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="servicePrice" className="block text-sm font-medium text-gray-700 mb-1">
                Price ($)
              </label>
              <input
                {...register('servicePrice', { valueAsNumber: true })}
                type="number"
                id="servicePrice"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {errors.servicePrice && (
                <p className="mt-1 text-sm text-red-600">{errors.servicePrice.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
                Duration (minutes)
              </label>
              <input
                {...register('duration', { valueAsNumber: true })}
                type="number"
                id="duration"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {errors.duration && (
                <p className="mt-1 text-sm text-red-600">{errors.duration.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="scheduledAt" className="block text-sm font-medium text-gray-700 mb-1">
              Date & Time
            </label>
            <input
              {...register('scheduledAt')}
              type="datetime-local"
              id="scheduledAt"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {errors.scheduledAt && (
              <p className="mt-1 text-sm text-red-600">{errors.scheduledAt.message}</p>
            )}
            <button
              type="button"
              onClick={checkAvailability}
              disabled={checkingAvailability || !selectedDate}
              className="mt-2 text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50"
            >
              {checkingAvailability ? 'Checking...' : 'Check Availability'}
            </button>
          </div>

          {availableSlots.length > 0 && (
            <div className="p-4 bg-green-50 rounded">
              <p className="text-sm font-medium text-green-800 mb-2">Available slots:</p>
              <div className="flex flex-wrap gap-2">
                {availableSlots.slice(0, 10).map((slot, idx) => (
                  <span key={idx} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                    {new Date(slot).toLocaleTimeString()}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              {...register('notes')}
              id="notes"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Booking...' : 'Book Appointment'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/lib/api'
import SwipeContainer from '@/components/SwipeContainer'

const bookingSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  hairstyleName: z.string().optional(),
  price: z.number().nonnegative('Price must be non-negative').optional(),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  notes: z.string().optional(),
})

type BookingForm = z.infer<typeof bookingSchema>

export default function BookPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [hairstyles, setHairstyles] = useState<any[]>([])
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null)
  const [selectedDuration, setSelectedDuration] = useState(120)
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [hairstyleMode, setHairstyleMode] = useState<'select' | 'custom'>('select')
  const [customHairstyle, setCustomHairstyle] = useState('')
  const [schedulePublished, setSchedulePublished] = useState<boolean | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [prefilledFromUrl, setPrefilledFromUrl] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
  })

  const selectedHairstyle = watch('hairstyleName')

  useEffect(() => {
    checkSchedulePublished()
    fetchHairstyles()

    // Check for URL parameters (date and time from availability calendar)
    const urlDate = searchParams.get('date')
    const urlTime = searchParams.get('time')

    if (urlDate && urlTime) {
      // Pre-fill the date
      setSelectedDate(urlDate)

      // Pre-fill the time slot
      const startTime = new Date(urlTime)
      const endTime = new Date(startTime)
      endTime.setMinutes(endTime.getMinutes() + selectedDuration)

      setValue('startTime', startTime.toISOString())
      setValue('endTime', endTime.toISOString())
      setSelectedTimeSlot(urlTime)
      setPrefilledFromUrl(true)
    }
  }, [searchParams, setValue, selectedDuration])

  const checkSchedulePublished = async () => {
    try {
      const response = await api.get('/business-hours/public')
      setSchedulePublished(response.data.isPublished ?? false)
    } catch (error) {
      console.error('Failed to check schedule status:', error)
      setSchedulePublished(false)
    } finally {
      setInitialLoading(false)
    }
  }

  useEffect(() => {
    if (selectedHairstyle && hairstyleMode === 'select') {
      const style = hairstyles.find((s) => s.name === selectedHairstyle)
      if (style) {
        setValue('price', Number(style.price) || 0)
        setSelectedDuration(style.duration || 120)
      }
    } else if (hairstyleMode === 'custom') {
      setValue('hairstyleName', customHairstyle)
      setValue('price', 0) // Default price for custom hairstyle
    }
  }, [selectedHairstyle, hairstyles, setValue, hairstyleMode, customHairstyle])

  const fetchHairstyles = async () => {
    try {
      const response = await api.get('/hairstyles/public')
      setHairstyles(response.data.hairstyles || [])
    } catch (error) {
      console.error('Failed to fetch hairstyles:', error)
    }
  }

  const checkAvailability = async () => {
    if (!selectedDate) {
      setError('Please select a date first')
      return
    }

    setCheckingAvailability(true)
    setError(null)
    setAvailableSlots([])
    setSelectedTimeSlot(null)

    try {
      const date = new Date(selectedDate).toISOString().split('T')[0]
      const response = await api.get(
        `/booking/availability?date=${date}&duration=${selectedDuration}`
      )

      // Check if schedule is published
      if (response.data.isPublished === false) {
        setSchedulePublished(false)
        return
      }

      setAvailableSlots(response.data.availableSlots || [])

      if (response.data.availableSlots.length === 0) {
        setError('No available slots for this date. Please try another date.')
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to check availability')
    } finally {
      setCheckingAvailability(false)
    }
  }

  const onSlotSelect = (slot: string) => {
    const startTime = new Date(slot)
    const endTime = new Date(startTime)
    endTime.setMinutes(endTime.getMinutes() + selectedDuration)

    setValue('startTime', startTime.toISOString())
    setValue('endTime', endTime.toISOString())
    setSelectedTimeSlot(slot)
  }

  const onSubmit = async (data: BookingForm) => {
    setLoading(true)
    setError(null)

    // Validate time slot is selected
    if (!data.startTime || !data.endTime) {
      setError('Please select a date and time slot')
      setLoading(false)
      return
    }

    // Validate times are in the future
    const startTime = new Date(data.startTime)
    const now = new Date()

    if (startTime <= now) {
      setError('Start time must be in the future')
      setLoading(false)
      return
    }

    // Set default values if hairstyle not provided
    const submitData = {
      ...data,
      hairstyleName: data.hairstyleName || 'Custom Service',
      price: data.price || 0,
    }

    try {
      await api.post('/booking', submitData)
      alert('Appointment booked successfully!')
      router.push('/')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to book appointment')
    } finally {
      setLoading(false)
    }
  }

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0]

  // Show loading state while checking schedule status
  if (initialLoading) {
    return (
      <SwipeContainer
        onSwipeRight={() => router.back()}
        className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-8 px-4"
      >
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-xl p-6 md:p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </SwipeContainer>
    )
  }

  // Show "Contact for availability" if schedule is not published
  if (schedulePublished === false) {
    return (
      <SwipeContainer
        onSwipeRight={() => router.back()}
        className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-8 px-4"
      >
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-xl p-8 md:p-12 text-center">
            <div className="text-6xl mb-6">📞</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Contact for Availability
            </h1>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Our booking schedule is currently being updated. Please contact us directly to check availability and book your appointment.
            </p>
            <div className="space-y-4">
              <a
                href="tel:+1234567890"
                className="block w-full max-w-xs mx-auto bg-primary-600 text-white py-3 px-6 rounded-md hover:bg-primary-700 font-semibold"
              >
                Call Us
              </a>
              <button
                type="button"
                onClick={() => router.back()}
                className="block w-full max-w-xs mx-auto bg-gray-200 text-gray-700 py-3 px-6 rounded-md hover:bg-gray-300 font-semibold"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </SwipeContainer>
    )
  }

  return (
    <SwipeContainer
      onSwipeRight={() => router.back()}
      className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-8 px-4"
    >
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-6 md:p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Book Your Appointment
          </h1>

          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  {...register('firstName')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  {...register('lastName')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone *
                </label>
                <input
                  {...register('phone')}
                  type="tel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email (Optional)
                </label>
                <input
                  {...register('email')}
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
            </div>

            {/* Date and Time Selection Section */}
            <div className={`p-4 rounded-lg border-2 ${prefilledFromUrl ? 'bg-green-50 border-green-200' : 'bg-primary-50 border-primary-200'}`}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {prefilledFromUrl ? '✓ Selected Date & Time' : 'Select Date & Time'}
              </h3>

              {/* Show pre-filled selection */}
              {prefilledFromUrl && selectedTimeSlot && (
                <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded-lg">
                  <p className="text-green-800 font-medium">
                    Appointment: {new Date(selectedTimeSlot).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })} at {new Date(selectedTimeSlot).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setPrefilledFromUrl(false)
                      setSelectedTimeSlot(null)
                      setAvailableSlots([])
                      setValue('startTime', '')
                      setValue('endTime', '')
                    }}
                    className="mt-2 text-sm text-green-700 underline hover:text-green-900"
                  >
                    Change date/time
                  </button>
                </div>
              )}

              {/* Date Selection - only show if not pre-filled or user wants to change */}
              {!prefilledFromUrl && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Appointment Date *
                  </label>
                  <input
                    type="date"
                    min={today}
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value)
                      setAvailableSlots([])
                      setSelectedTimeSlot(null)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    type="button"
                    onClick={checkAvailability}
                    disabled={checkingAvailability || !selectedDate}
                    className="mt-2 w-full bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {checkingAvailability ? 'Checking Availability...' : 'Check Available Times'}
                  </button>
                </div>
              )}

              {/* Available Time Slots - only show when not pre-filled */}
              {!prefilledFromUrl && (
                <>
                  {checkingAvailability && (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-600">Loading available slots...</p>
                    </div>
                  )}

                  {!checkingAvailability && availableSlots.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Time Slot *
                      </label>
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                        {availableSlots.map((slot, idx) => {
                          const time = new Date(slot)
                          const isSelected = selectedTimeSlot === slot
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => onSlotSelect(slot)}
                              className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                                isSelected
                                  ? 'bg-primary-600 text-white border-2 border-primary-700'
                                  : 'bg-white border-2 border-primary-200 text-primary-700 hover:bg-primary-100 hover:border-primary-300'
                              }`}
                            >
                              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </button>
                          )
                        })}
                      </div>
                      {selectedTimeSlot && (
                        <p className="mt-2 text-sm text-green-600 font-medium">
                          ✓ Selected: {new Date(selectedTimeSlot).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}

                  {!checkingAvailability && selectedDate && availableSlots.length === 0 && !error && (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-600">Click "Check Available Times" to see time slots</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Hairstyle Selection - Optional */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hairstyle (Optional)
              </label>
              
              {/* Mode Toggle */}
              <div className="flex space-x-2 mb-3">
                <button
                  type="button"
                  onClick={() => {
                    setHairstyleMode('select')
                    setCustomHairstyle('')
                    setValue('hairstyleName', '')
                  }}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition ${
                    hairstyleMode === 'select'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Select from List
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHairstyleMode('custom')
                    setValue('hairstyleName', '')
                  }}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition ${
                    hairstyleMode === 'custom'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Enter Custom
                </button>
              </div>

              {/* Hairstyle Input Based on Mode */}
              {hairstyleMode === 'select' ? (
                <select
                  {...register('hairstyleName')}
                  onChange={(e) => {
                    setValue('hairstyleName', e.target.value)
                    const style = hairstyles.find((s) => s.name === e.target.value)
                    if (style) {
                      setValue('price', Number(style.price) || 0)
                      setSelectedDuration(style.duration || 120)
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Choose a hairstyle (optional)...</option>
                  {hairstyles.map((style) => (
                    <option key={style.id} value={style.name}>
                      {style.name} - ${Number(style.price || 0).toFixed(2)} ({style.duration || 0} min)
                    </option>
                  ))}
                </select>
              ) : (
                <div>
                  <input
                    type="text"
                    value={customHairstyle}
                    onChange={(e) => {
                      setCustomHairstyle(e.target.value)
                      setValue('hairstyleName', e.target.value)
                    }}
                    placeholder="Enter hairstyle name (e.g., Box Braids, Knotless Braids)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Enter the hairstyle you'd like to book
                  </p>
                </div>
              )}
            </div>

            {/* Hidden time fields */}
            <input type="hidden" {...register('startTime')} />
            <input type="hidden" {...register('endTime')} />
            <input type="hidden" {...register('price')} />
            
            {/* Validation message for time slot */}
            {errors.startTime && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  Please select a date and time slot above
                </p>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                {...register('notes')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Submit */}
            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-primary-600 text-white py-3 px-6 rounded-md hover:bg-primary-700 disabled:opacity-50 font-semibold"
              >
                {loading ? 'Booking...' : 'Book Appointment'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-md hover:bg-gray-300 font-semibold"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </SwipeContainer>
  )
}

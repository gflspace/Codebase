'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

interface TimeSlot {
  startTime: string
  endTime: string
  status: 'open' | 'booked' | 'blocked' | 'not_available'
}

interface DayAvailability {
  date: string
  dayOfWeek: number
  isOpen: boolean
  openTime: string | null
  closeTime: string | null
  slots: TimeSlot[]
}

interface AvailabilityResponse {
  availability: { [key: string]: DayAvailability }
  isPublished?: boolean
  message?: string
}

export default function CalendarAvailability() {
  const router = useRouter()
  const [isExpanded, setIsExpanded] = useState(false)
  const [availability, setAvailability] = useState<{ [key: string]: DayAvailability } | null>(null)
  const [loading, setLoading] = useState(false)
  const [isPublished, setIsPublished] = useState<boolean | null>(null)
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    // Start from today, not Monday of current week
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  })

  const fetchAvailability = async () => {
    setLoading(true)
    try {
      // Fetch 14 days from today to ensure we have availability data
      const endDate = new Date(currentWeekStart)
      endDate.setDate(endDate.getDate() + 13)

      const response = await api.get<AvailabilityResponse>(
        `/availability/detailed?startDate=${currentWeekStart.toISOString()}&endDate=${endDate.toISOString()}&slotDuration=60`
      )

      if (response.data.isPublished === false) {
        setIsPublished(false)
        setAvailability(null)
      } else {
        setIsPublished(true)
        setAvailability(response.data.availability)
      }
    } catch (error) {
      console.error('Failed to fetch availability:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isExpanded) {
      fetchAvailability()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWeekStart, isExpanded])

  const handleCheckAvailability = () => {
    setIsExpanded(!isExpanded)
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const shortDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Get next 14 days from today
  const allDates: string[] = []
  for (let i = 0; i < 14; i++) {
    const date = new Date(currentWeekStart)
    date.setDate(date.getDate() + i)
    allDates.push(date.toISOString().split('T')[0])
  }

  // Filter to only show days that are open with available slots
  const openDaysWithSlots = availability
    ? allDates
        .map((dateKey) => availability[dateKey])
        .filter((day) => day && day.isOpen && day.slots && day.slots.some((s) => s.status === 'open'))
    : []

  const totalOpenSlots = openDaysWithSlots.reduce(
    (total, day) => total + day.slots.filter((s) => s.status === 'open').length,
    0
  )

  return (
    <div className="w-full">
      {/* Check Availability Button */}
      <button
        onClick={handleCheckAvailability}
        className="w-full bg-accent-gold text-brand-black py-4 px-6 rounded-xl font-semibold hover:bg-accent-gold/90 transition flex flex-col items-center justify-center gap-1 shadow-md"
      >
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-lg">{isExpanded ? 'Hide Availability' : 'Check Availability'}</span>
          <svg
            className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        <span className="text-sm font-normal opacity-80">See when we're open this week</span>
      </button>

      {/* Expanded Calendar View */}
      {isExpanded && (
        <div className="mt-6 bg-brand-white rounded-xl border border-brand-pearl p-6 shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-gold"></div>
            </div>
          ) : isPublished === false ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">📞</div>
              <h3 className="text-xl font-semibold text-brand-black mb-2">
                Contact for Availability
              </h3>
              <p className="text-brand-silver max-w-md mx-auto">
                Our booking schedule is currently being updated. Please contact us directly to check availability.
              </p>
            </div>
          ) : availability ? (
            <>
              {/* Header */}
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-brand-black">Available Appointments</h3>
                {totalOpenSlots > 0 ? (
                  <p className="text-sm text-green-600 font-medium mt-1">
                    {totalOpenSlots} time slots available in the next 2 weeks
                  </p>
                ) : (
                  <p className="text-sm text-brand-silver mt-1">
                    Showing availability for the next 2 weeks
                  </p>
                )}
              </div>

              {openDaysWithSlots.length > 0 ? (
                <div className="space-y-4">
                  {openDaysWithSlots.map((dayData) => {
                    const date = new Date(dayData.date + 'T12:00:00')
                    const dayName = dayNames[dayData.dayOfWeek]
                    const shortDay = shortDayNames[dayData.dayOfWeek]
                    const formattedDate = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
                    const openSlots = dayData.slots.filter((s) => s.status === 'open')

                    // Check if this is today
                    const today = new Date()
                    const isToday = date.toDateString() === today.toDateString()

                    return (
                      <div
                        key={dayData.date}
                        className="border border-brand-pearl rounded-xl overflow-hidden"
                      >
                        {/* Day Header */}
                        <div className="bg-brand-pearl/50 px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`${isToday ? 'bg-green-500' : 'bg-accent-gold'} text-${isToday ? 'white' : 'brand-black'} w-12 h-12 rounded-lg flex flex-col items-center justify-center`}>
                              <span className="text-xs font-medium leading-none">{shortDay}</span>
                              <span className="text-lg font-bold leading-none">{date.getDate()}</span>
                            </div>
                            <div>
                              <h4 className="font-semibold text-brand-black">
                                {isToday ? 'Today' : dayName}
                              </h4>
                              <p className="text-sm text-brand-silver">{formattedDate}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
                              {openSlots.length} Open
                            </span>
                            <p className="text-xs text-brand-silver mt-1">
                              {dayData.openTime} - {dayData.closeTime}
                            </p>
                          </div>
                        </div>

                        {/* Available Time Slots */}
                        <div className="p-4">
                          <p className="text-sm text-brand-charcoal mb-3 font-medium">Available Hours:</p>
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                            {openSlots.map((slot, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  // Pass the selected date and time to the booking page
                                  const params = new URLSearchParams({
                                    date: dayData.date,
                                    time: slot.startTime,
                                  })
                                  router.push(`/book?${params.toString()}`)
                                }}
                                className="px-3 py-2 rounded-lg border border-green-300 bg-green-50 text-green-800 text-sm font-medium hover:bg-green-100 hover:border-green-400 transition text-center"
                              >
                                {formatTime(slot.startTime)}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {/* Book Now Button */}
                  <button
                    onClick={() => router.push('/book')}
                    className="w-full bg-accent-gold text-brand-black py-3 px-6 rounded-xl font-semibold hover:bg-accent-gold/90 transition mt-4"
                  >
                    Book an Appointment
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-5xl mb-4">📅</div>
                  <h3 className="text-lg font-semibold text-brand-black mb-2">
                    No Available Slots
                  </h3>
                  <p className="text-brand-silver mb-4">
                    All time slots are currently booked. Please check back later or contact us directly.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-brand-silver">
              <p>No availability data found</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

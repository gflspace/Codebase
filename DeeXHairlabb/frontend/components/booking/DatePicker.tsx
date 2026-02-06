'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  selectedDate: string | null
  onDateSelect: (date: string) => void
  availableDates?: string[] // ISO date strings of available dates
  blockedDates?: string[] // ISO date strings of blocked dates
}

export function DatePicker({ selectedDate, onDateSelect, availableDates, blockedDates = [] }: DatePickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [dates, setDates] = useState<Date[]>([])

  useEffect(() => {
    // Generate next 14 days
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const nextDays: Date[] = []
    for (let i = 0; i < 14; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      nextDays.push(date)
    }
    setDates(nextDays)
  }, [])

  // Scroll to selected date on mount
  useEffect(() => {
    if (selectedDate && scrollRef.current) {
      const selectedElement = scrollRef.current.querySelector(`[data-date="${selectedDate}"]`)
      if (selectedElement) {
        selectedElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
      }
    }
  }, [selectedDate, dates])

  const formatDateISO = (date: Date) => date.toISOString().split('T')[0]

  const getDayName = (date: Date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return days[date.getDay()]
  }

  const getMonthName = (date: Date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return months[date.getMonth()]
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isBlocked = (date: Date) => {
    const dateStr = formatDateISO(date)
    return blockedDates.includes(dateStr)
  }

  const isAvailable = (date: Date) => {
    // If availableDates is provided, check against it
    if (availableDates) {
      const dateStr = formatDateISO(date)
      return availableDates.includes(dateStr)
    }
    // Otherwise, consider all non-blocked dates as available
    return !isBlocked(date)
  }

  const handleDateClick = (date: Date) => {
    if (isBlocked(date)) return
    onDateSelect(formatDateISO(date))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-body font-medium text-brand-black">Select Date</h3>
        <div className="flex items-center gap-2 text-micro">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-status-available"></span>
            Available
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-status-blocked"></span>
            Blocked
          </span>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 scroll-smooth snap-x snap-mandatory"
      >
        {dates.map((date) => {
          const dateStr = formatDateISO(date)
          const isSelected = selectedDate === dateStr
          const blocked = isBlocked(date)
          const available = isAvailable(date)
          const today = isToday(date)

          return (
            <button
              key={dateStr}
              data-date={dateStr}
              onClick={() => handleDateClick(date)}
              disabled={blocked}
              className={cn(
                'flex-shrink-0 w-16 py-3 rounded-xl text-center transition-all snap-center',
                'flex flex-col items-center gap-1',
                blocked && 'opacity-50 cursor-not-allowed bg-status-blocked/10',
                !blocked && !isSelected && 'bg-brand-pearl hover:bg-brand-pearl/80',
                isSelected && 'bg-accent-gold text-white shadow-md scale-105',
                !isSelected && available && !blocked && 'ring-2 ring-status-available/30'
              )}
            >
              <span className={cn(
                'text-micro font-medium uppercase',
                isSelected ? 'text-white/80' : 'text-brand-silver'
              )}>
                {getDayName(date)}
              </span>
              <span className={cn(
                'text-h3 font-display',
                isSelected ? 'text-white' : 'text-brand-black'
              )}>
                {date.getDate()}
              </span>
              <span className={cn(
                'text-micro',
                isSelected ? 'text-white/80' : 'text-brand-silver'
              )}>
                {getMonthName(date)}
              </span>
              {today && !isSelected && (
                <span className="absolute -top-1 left-1/2 -translate-x-1/2 text-micro text-accent-gold font-medium">
                  Today
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default DatePicker

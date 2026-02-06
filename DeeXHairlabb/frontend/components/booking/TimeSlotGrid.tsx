'use client'

import { useMemo } from 'react'
import { cn, formatTime } from '@/lib/utils'
import type { TimeSlot } from '@/types'

interface TimeSlotGridProps {
  slots: TimeSlot[]
  selectedSlot: TimeSlot | null
  onSlotSelect: (slot: TimeSlot) => void
  loading?: boolean
}

type Period = 'morning' | 'afternoon' | 'evening'

const periodConfig: Record<Period, { label: string; icon: string; range: string }> = {
  morning: { label: 'Morning', icon: '🌅', range: '9AM - 12PM' },
  afternoon: { label: 'Afternoon', icon: '☀️', range: '12PM - 5PM' },
  evening: { label: 'Evening', icon: '🌙', range: '5PM - 8PM' },
}

export function TimeSlotGrid({ slots, selectedSlot, onSlotSelect, loading }: TimeSlotGridProps) {
  const groupedSlots = useMemo(() => {
    const groups: Record<Period, TimeSlot[]> = {
      morning: [],
      afternoon: [],
      evening: [],
    }

    slots.forEach((slot) => {
      const hour = new Date(slot.startTime).getHours()
      if (hour < 12) {
        groups.morning.push(slot)
      } else if (hour < 17) {
        groups.afternoon.push(slot)
      } else {
        groups.evening.push(slot)
      }
    })

    return groups
  }, [slots])

  if (loading) {
    return (
      <div className="space-y-6">
        {(['morning', 'afternoon', 'evening'] as Period[]).map((period) => (
          <div key={period} className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-brand-pearl animate-pulse" />
              <div className="h-4 w-20 bg-brand-pearl rounded animate-pulse" />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 rounded-lg bg-brand-pearl animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (slots.length === 0) {
    return (
      <div className="text-center py-8">
        <span className="text-4xl mb-4 block">📅</span>
        <p className="text-body text-brand-silver">No available slots for this date</p>
        <p className="text-caption text-brand-silver mt-1">Please select another date</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-body font-medium text-brand-black">Select Time</h3>
        <span className="text-micro text-brand-silver">{slots.length} slots available</span>
      </div>

      {(['morning', 'afternoon', 'evening'] as Period[]).map((period) => {
        const periodSlots = groupedSlots[period]
        if (periodSlots.length === 0) return null

        const config = periodConfig[period]

        return (
          <div key={period} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">{config.icon}</span>
              <span className="text-caption font-medium text-brand-charcoal">{config.label}</span>
              <span className="text-micro text-brand-silver">({config.range})</span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {periodSlots.map((slot) => {
                const isSelected = selectedSlot?.startTime === slot.startTime
                const isBooked = !slot.available

                return (
                  <button
                    key={slot.startTime}
                    onClick={() => !isBooked && onSlotSelect(slot)}
                    disabled={isBooked}
                    className={cn(
                      'py-3 px-2 rounded-lg text-center transition-all',
                      'text-caption font-medium',
                      isBooked && 'bg-status-booked/10 text-status-booked/50 cursor-not-allowed line-through',
                      !isBooked && !isSelected && 'bg-brand-pearl text-brand-charcoal hover:bg-accent-gold/10 hover:text-accent-gold-dark',
                      isSelected && 'bg-accent-gold text-white shadow-md scale-105'
                    )}
                  >
                    {formatTime(slot.startTime)}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default TimeSlotGrid

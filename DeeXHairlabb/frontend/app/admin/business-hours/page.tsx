'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'

interface BusinessHour {
  id?: string
  dayOfWeek: number
  isOpen: boolean
  openTime: string | null
  closeTime: string | null
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const DEFAULT_HOURS: BusinessHour[] = DAYS.map((_, index) => ({
  dayOfWeek: index,
  isOpen: index !== 0, // Closed on Sunday by default
  openTime: '09:00',
  closeTime: '18:00',
}))

export default function AdminBusinessHours() {
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>(DEFAULT_HOURS)
  const [isPublished, setIsPublished] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishSaving, setPublishSaving] = useState(false)

  useEffect(() => {
    fetchBusinessHours()
  }, [])

  const fetchBusinessHours = async () => {
    try {
      const response = await api.get('/admin/business-hours')
      const hours = response.data.businessHours || []

      // Merge with defaults to ensure all days exist
      const mergedHours = DEFAULT_HOURS.map(defaultHour => {
        const existing = hours.find((h: BusinessHour) => h.dayOfWeek === defaultHour.dayOfWeek)
        return existing || defaultHour
      })

      setBusinessHours(mergedHours)
      setIsPublished(response.data.isPublished || false)
    } catch (error) {
      console.error('Failed to fetch business hours:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDayChange = async (dayOfWeek: number, updates: Partial<BusinessHour>) => {
    // Update local state immediately
    const updatedHours = businessHours.map(h =>
      h.dayOfWeek === dayOfWeek ? { ...h, ...updates } : h
    )
    setBusinessHours(updatedHours)

    // Save to API
    setSaving(true)
    try {
      await api.put('/admin/business-hours', { businessHours: updatedHours })
    } catch (error) {
      console.error('Failed to save business hours:', error)
      // Revert on error
      fetchBusinessHours()
    } finally {
      setSaving(false)
    }
  }

  const handlePublishToggle = async () => {
    const newPublished = !isPublished
    setPublishSaving(true)

    try {
      await api.put('/admin/business-hours/publish', { isPublished: newPublished })
      setIsPublished(newPublished)
    } catch (error) {
      console.error('Failed to update publish status:', error)
    } finally {
      setPublishSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton variant="text" className="h-8 w-48" />
          <Skeleton variant="rounded" className="h-10 w-32" />
        </div>
        <Skeleton variant="rectangular" className="h-96 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-h2 font-display text-brand-black">Business Hours</h1>
          <p className="text-caption text-brand-silver mt-1">
            Configure your weekly availability schedule
          </p>
        </div>

        {/* Published Toggle */}
        <button
          onClick={handlePublishToggle}
          disabled={publishSaving}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
            isPublished
              ? 'bg-status-available/10 border-2 border-status-available'
              : 'bg-brand-pearl border-2 border-brand-pearl',
            publishSaving && 'opacity-50 cursor-not-allowed'
          )}
        >
          <div className={cn(
            'w-12 h-6 rounded-full transition-colors relative',
            isPublished ? 'bg-status-available' : 'bg-brand-silver'
          )}>
            <div className={cn(
              'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform shadow-sm',
              isPublished ? 'right-1' : 'left-1'
            )} />
          </div>
          <span className={cn(
            'text-body font-medium',
            isPublished ? 'text-status-available' : 'text-brand-charcoal'
          )}>
            {publishSaving ? 'Saving...' : isPublished ? 'Published' : 'Unpublished'}
          </span>
        </button>
      </div>

      {/* Status Banner */}
      {!isPublished && (
        <div className="bg-accent-gold/10 border border-accent-gold/30 rounded-xl p-4 flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="text-body font-medium text-brand-black">Schedule Not Published</p>
            <p className="text-caption text-brand-charcoal mt-1">
              Your schedule is currently hidden from users. They will see a "Contact for availability" message.
              Toggle "Published" when you're ready to show your availability.
            </p>
          </div>
        </div>
      )}

      {/* Weekly Schedule */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Weekly Schedule</CardTitle>
          <CardDescription>
            Set your open and close times for each day. Changes save automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {businessHours.map((day) => (
            <DayRow
              key={day.dayOfWeek}
              day={day}
              dayName={DAYS[day.dayOfWeek]}
              onChange={(updates) => handleDayChange(day.dayOfWeek, updates)}
              saving={saving}
            />
          ))}
        </CardContent>
      </Card>

      {/* Preview */}
      <Card variant="outlined">
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>
            This is what users will see when booking
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isPublished ? (
            <div className="space-y-2">
              {businessHours.map((day) => (
                <div key={day.dayOfWeek} className="flex items-center justify-between py-2 border-b border-brand-pearl last:border-0">
                  <span className="text-body text-brand-black">{DAYS[day.dayOfWeek]}</span>
                  <span className={cn(
                    'text-body',
                    day.isOpen ? 'text-brand-charcoal' : 'text-brand-silver'
                  )}>
                    {day.isOpen ? `${formatTime(day.openTime)} - ${formatTime(day.closeTime)}` : 'Closed'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-brand-pearl rounded-lg">
              <span className="text-4xl mb-3 block">📞</span>
              <p className="text-body font-medium text-brand-black">Contact for Availability</p>
              <p className="text-caption text-brand-silver mt-1">
                This message is shown when your schedule is unpublished
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

interface DayRowProps {
  day: BusinessHour
  dayName: string
  onChange: (updates: Partial<BusinessHour>) => void
  saving: boolean
}

function DayRow({ day, dayName, onChange, saving }: DayRowProps) {
  return (
    <div className={cn(
      'flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 rounded-xl transition-colors',
      day.isOpen ? 'bg-status-available/5' : 'bg-brand-pearl'
    )}>
      {/* Day Name */}
      <span className="w-28 text-body font-medium text-brand-black">{dayName}</span>

      {/* Open/Closed Toggle */}
      <button
        onClick={() => onChange({ isOpen: !day.isOpen })}
        disabled={saving}
        className={cn(
          'px-4 py-2 rounded-lg text-caption font-medium transition-colors w-24',
          day.isOpen
            ? 'bg-status-available text-white'
            : 'bg-status-blocked/20 text-status-blocked',
          saving && 'opacity-50 cursor-not-allowed'
        )}
      >
        {day.isOpen ? 'Open' : 'Closed'}
      </button>

      {/* Time Inputs (only show when open) */}
      {day.isOpen && (
        <div className="flex items-center gap-2 flex-1">
          <input
            type="time"
            value={day.openTime || '09:00'}
            onChange={(e) => onChange({ openTime: e.target.value })}
            disabled={saving}
            className="px-3 py-2 rounded-lg border border-brand-pearl bg-brand-white text-body focus:outline-none focus:ring-2 focus:ring-accent-gold/50 focus:border-accent-gold disabled:opacity-50"
          />
          <span className="text-brand-silver text-body">to</span>
          <input
            type="time"
            value={day.closeTime || '18:00'}
            onChange={(e) => onChange({ closeTime: e.target.value })}
            disabled={saving}
            className="px-3 py-2 rounded-lg border border-brand-pearl bg-brand-white text-body focus:outline-none focus:ring-2 focus:ring-accent-gold/50 focus:border-accent-gold disabled:opacity-50"
          />
        </div>
      )}
    </div>
  )
}

function formatTime(time: string | null): string {
  if (!time) return '--:--'
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
}

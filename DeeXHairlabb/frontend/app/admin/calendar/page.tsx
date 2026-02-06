'use client'

import { useEffect, useState, useMemo } from 'react'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, SlotBadge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody, SheetFooter } from '@/components/ui/Sheet'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn, formatDate, formatTime } from '@/lib/utils'

interface CalendarBlock {
  id: string
  date: string
  startTime?: string
  endTime?: string
  isBlocked: boolean
  reason?: string
}

interface Appointment {
  id: string
  startTime: string
  endTime: string
  status: string
  client: {
    firstName: string
    lastName: string
  }
  hairstyleName?: string
}

type ViewMode = 'week' | 'month'

export default function AdminCalendarControl() {
  const [blocks, setBlocks] = useState<CalendarBlock[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showBlockSheet, setShowBlockSheet] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [formData, setFormData] = useState({
    startTime: '',
    endTime: '',
    isBlocked: true,
    reason: '',
    isFullDay: true,
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [currentDate, viewMode])

  const fetchData = async () => {
    setLoading(true)
    try {
      const startDate = getViewStartDate()
      const endDate = getViewEndDate()

      const [blocksRes, appointmentsRes] = await Promise.all([
        api.get(`/admin/calendar-blocks?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`),
        api.get(`/appointments?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`),
      ])

      setBlocks(blocksRes.data.blocks || [])
      setAppointments(appointmentsRes.data.appointments || [])
    } catch (error) {
      console.error('Failed to fetch calendar data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getViewStartDate = () => {
    const date = new Date(currentDate)
    if (viewMode === 'week') {
      const day = date.getDay()
      date.setDate(date.getDate() - day)
    } else {
      date.setDate(1)
    }
    date.setHours(0, 0, 0, 0)
    return date
  }

  const getViewEndDate = () => {
    const date = new Date(currentDate)
    if (viewMode === 'week') {
      const day = date.getDay()
      date.setDate(date.getDate() + (6 - day))
    } else {
      date.setMonth(date.getMonth() + 1)
      date.setDate(0)
    }
    date.setHours(23, 59, 59, 999)
    return date
  }

  const navigateCalendar = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
    }
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const days: Date[] = []
    const start = getViewStartDate()
    const end = getViewEndDate()

    const current = new Date(start)
    while (current <= end) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }

    return days
  }, [currentDate, viewMode])

  // Get blocks for a specific date
  const getBlocksForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return blocks.filter((block) => {
      const blockDate = new Date(block.date).toISOString().split('T')[0]
      return blockDate === dateStr
    })
  }

  // Get appointments for a specific date
  const getAppointmentsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return appointments.filter((apt) => {
      const aptDate = new Date(apt.startTime).toISOString().split('T')[0]
      return aptDate === dateStr
    })
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isPast = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  const handleDayClick = (date: Date) => {
    if (isPast(date)) return
    setSelectedDate(date)
    setFormData({
      startTime: '',
      endTime: '',
      isBlocked: true,
      reason: '',
      isFullDay: true,
    })
    setShowBlockSheet(true)
  }

  const handleSubmit = async () => {
    if (!selectedDate) return

    setSubmitting(true)
    try {
      const payload: any = {
        date: selectedDate.toISOString(),
        isBlocked: formData.isBlocked,
        reason: formData.reason || undefined,
      }

      if (!formData.isFullDay && formData.startTime && formData.endTime) {
        const dateStr = selectedDate.toISOString().split('T')[0]
        payload.startTime = new Date(`${dateStr}T${formData.startTime}`).toISOString()
        payload.endTime = new Date(`${dateStr}T${formData.endTime}`).toISOString()
      }

      await api.post('/admin/calendar-blocks', payload)
      setShowBlockSheet(false)
      fetchData()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create calendar block')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteBlock = async (id: string) => {
    if (!confirm('Are you sure you want to delete this block?')) return
    try {
      await api.delete(`/admin/calendar-blocks/${id}`)
      fetchData()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete block')
    }
  }

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  const getDayName = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short' })
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
          <h1 className="text-h2 font-display text-brand-black">Calendar Control</h1>
          <p className="text-caption text-brand-silver mt-1">
            Manage your availability and block time slots
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-brand-pearl rounded-lg p-1">
            {(['week', 'month'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  'px-4 py-2 text-caption font-medium rounded-md transition-all capitalize',
                  viewMode === mode
                    ? 'bg-brand-white text-brand-black shadow-sm'
                    : 'text-brand-silver hover:text-brand-charcoal'
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar Navigation */}
      <Card variant="elevated">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateCalendar('prev')}
              className="p-2 rounded-lg hover:bg-brand-pearl transition-colors"
            >
              <svg className="w-5 h-5 text-brand-charcoal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <CardTitle className="text-h3">{formatMonthYear(currentDate)}</CardTitle>
            <button
              onClick={() => navigateCalendar('next')}
              className="p-2 rounded-lg hover:bg-brand-pearl transition-colors"
            >
              <svg className="w-5 h-5 text-brand-charcoal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={goToToday}>
              Today
            </Button>
            <div className="flex items-center gap-3 text-micro text-brand-silver">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-status-available"></span>
                Available
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-status-booked"></span>
                Booked
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-status-blocked"></span>
                Blocked
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-caption font-medium text-brand-silver py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date) => {
              const dayBlocks = getBlocksForDate(date)
              const dayAppointments = getAppointmentsForDate(date)
              const hasBlockedDay = dayBlocks.some((b) => b.isBlocked && !b.startTime)
              const hasAppointments = dayAppointments.length > 0
              const past = isPast(date)
              const today = isToday(date)

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => handleDayClick(date)}
                  disabled={past}
                  className={cn(
                    'min-h-24 p-2 rounded-lg border transition-all text-left',
                    'flex flex-col',
                    past && 'opacity-50 cursor-not-allowed bg-brand-pearl/50',
                    !past && !hasBlockedDay && 'hover:border-accent-gold/50 hover:shadow-sm cursor-pointer',
                    today && 'ring-2 ring-accent-gold',
                    hasBlockedDay && 'bg-status-blocked/10 border-status-blocked/30',
                    !past && !hasBlockedDay && 'bg-brand-white border-brand-pearl'
                  )}
                >
                  <span className={cn(
                    'text-body font-medium mb-1',
                    today ? 'text-accent-gold' : 'text-brand-black'
                  )}>
                    {date.getDate()}
                  </span>

                  <div className="flex-1 space-y-1 overflow-hidden">
                    {/* Blocked indicator */}
                    {hasBlockedDay && (
                      <div className="text-micro text-status-booked bg-status-booked/10 rounded px-1 py-0.5 truncate">
                        Blocked
                      </div>
                    )}

                    {/* Time blocks */}
                    {dayBlocks.filter((b) => b.startTime).slice(0, 2).map((block) => (
                      <div
                        key={block.id}
                        className={cn(
                          'text-micro rounded px-1 py-0.5 truncate',
                          block.isBlocked
                            ? 'text-status-booked bg-status-booked/10'
                            : 'text-status-available bg-status-available/10'
                        )}
                      >
                        {formatTime(block.startTime!)}
                      </div>
                    ))}

                    {/* Appointments */}
                    {dayAppointments.slice(0, 2).map((apt) => (
                      <div
                        key={apt.id}
                        className="text-micro text-accent-gold-dark bg-accent-gold/10 rounded px-1 py-0.5 truncate"
                      >
                        {formatTime(apt.startTime)} - {apt.client.firstName}
                      </div>
                    ))}

                    {/* More indicator */}
                    {(dayBlocks.length + dayAppointments.length) > 3 && (
                      <div className="text-micro text-brand-silver">
                        +{dayBlocks.length + dayAppointments.length - 3} more
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Existing Blocks List */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Active Blocks</CardTitle>
        </CardHeader>
        <CardContent>
          {blocks.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl mb-4 block">📅</span>
              <p className="text-body text-brand-silver">No calendar blocks</p>
              <p className="text-caption text-brand-silver mt-1">Click on a day to block time</p>
            </div>
          ) : (
            <div className="space-y-2">
              {blocks.map((block) => (
                <div
                  key={block.id}
                  className="flex items-center justify-between p-3 bg-brand-pearl rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <SlotBadge status={block.isBlocked ? 'blocked' : 'open'} />
                    <div>
                      <p className="text-body font-medium text-brand-black">
                        {formatDate(block.date)}
                      </p>
                      <p className="text-caption text-brand-silver">
                        {block.startTime && block.endTime
                          ? `${formatTime(block.startTime)} - ${formatTime(block.endTime)}`
                          : 'Entire Day'}
                        {block.reason && ` - ${block.reason}`}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteBlock(block.id)}
                    className="text-status-booked hover:bg-status-booked/10"
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Block Sheet */}
      <Sheet open={showBlockSheet} onOpenChange={setShowBlockSheet}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {selectedDate && formatDate(selectedDate.toISOString())}
            </SheetTitle>
          </SheetHeader>

          <SheetBody className="space-y-4">
            {/* Block Type Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setFormData({ ...formData, isBlocked: true })}
                className={cn(
                  'flex-1 py-3 rounded-lg text-center transition-all',
                  formData.isBlocked
                    ? 'bg-status-booked text-white'
                    : 'bg-brand-pearl text-brand-charcoal'
                )}
              >
                <span className="block text-xl mb-1">🚫</span>
                <span className="text-caption font-medium">Block Time</span>
              </button>
              <button
                onClick={() => setFormData({ ...formData, isBlocked: false })}
                className={cn(
                  'flex-1 py-3 rounded-lg text-center transition-all',
                  !formData.isBlocked
                    ? 'bg-status-available text-white'
                    : 'bg-brand-pearl text-brand-charcoal'
                )}
              >
                <span className="block text-xl mb-1">✅</span>
                <span className="text-caption font-medium">Open Time</span>
              </button>
            </div>

            {/* Full Day Toggle */}
            <div
              className="flex items-center justify-between p-3 bg-brand-pearl rounded-lg cursor-pointer"
              onClick={() => setFormData({ ...formData, isFullDay: !formData.isFullDay })}
            >
              <span className="text-body text-brand-black">Entire Day</span>
              <div className={cn(
                'w-12 h-6 rounded-full transition-colors relative',
                formData.isFullDay ? 'bg-accent-gold' : 'bg-brand-silver'
              )}>
                <div className={cn(
                  'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                  formData.isFullDay ? 'right-1' : 'left-1'
                )} />
              </div>
            </div>

            {/* Time Range (if not full day) */}
            {!formData.isFullDay && (
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Start Time"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
                <Input
                  label="End Time"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            )}

            {/* Reason */}
            <Input
              label="Reason (Optional)"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="e.g., Holiday, Personal time, etc."
            />

            {/* Existing blocks for this day */}
            {selectedDate && getBlocksForDate(selectedDate).length > 0 && (
              <div className="pt-4 border-t border-brand-pearl">
                <p className="text-caption font-medium text-brand-charcoal mb-2">
                  Existing blocks for this day
                </p>
                <div className="space-y-2">
                  {getBlocksForDate(selectedDate).map((block) => (
                    <div
                      key={block.id}
                      className="flex items-center justify-between p-2 bg-brand-pearl/50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <SlotBadge status={block.isBlocked ? 'blocked' : 'open'} />
                        <span className="text-caption text-brand-charcoal">
                          {block.startTime ? formatTime(block.startTime) : 'All Day'}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteBlock(block.id)}
                        className="text-micro text-status-booked"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </SheetBody>

          <SheetFooter>
            <div className="flex gap-3 w-full">
              <Button variant="ghost" onClick={() => setShowBlockSheet(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                variant={formData.isBlocked ? 'danger' : 'primary'}
                onClick={handleSubmit}
                isLoading={submitting}
                className="flex-1"
              >
                {formData.isBlocked ? 'Block Time' : 'Open Time'}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

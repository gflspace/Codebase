'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sheet, SheetBackdrop, SheetContent, SheetHeader, SheetTitle, SheetBody, SheetFooter } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useBookingStore, type BookingStep, type ClientInfo } from '@/store/bookingStore'
import { cn, formatPrice, formatDuration, formatDate, formatTime, haptic } from '@/lib/utils'
import type { TimeSlot, Hairstyle } from '@/types'
import api from '@/lib/api'

import DatePicker from './DatePicker'
import TimeSlotGrid from './TimeSlotGrid'
import StyleSelector from './StyleSelector'
import ClientInfoForm from './ClientInfoForm'

const stepConfig: Record<BookingStep, { title: string; subtitle: string }> = {
  date: { title: 'Select Date', subtitle: 'Choose when you want to visit' },
  time: { title: 'Select Time', subtitle: 'Pick an available time slot' },
  style: { title: 'Choose Style', subtitle: 'Select your desired hairstyle' },
  info: { title: 'Your Details', subtitle: 'Almost there!' },
  confirm: { title: 'Confirm Booking', subtitle: 'Review and confirm' },
}

export function BookingSheet() {
  const router = useRouter()
  const {
    isSheetOpen,
    closeSheet,
    step,
    setStep,
    selectedDate,
    setDate,
    selectedSlot,
    setSlot,
    selectedStyle,
    setStyle,
    clientInfo,
    setClientInfo,
    reset,
    goBack,
    getTotalPrice,
    getTotalDuration,
  } = useBookingStore()

  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Fetch available slots when date changes
  useEffect(() => {
    if (selectedDate && step === 'time') {
      fetchAvailableSlots()
    }
  }, [selectedDate, step])

  const fetchAvailableSlots = async () => {
    if (!selectedDate) return

    setLoadingSlots(true)
    setError(null)
    try {
      const duration = selectedStyle?.duration || 120
      const response = await api.get(
        `/booking/availability?date=${selectedDate}&duration=${duration}`
      )

      const availableSlots = (response.data.availableSlots || []).map((slot: string) => ({
        startTime: slot,
        endTime: new Date(new Date(slot).getTime() + duration * 60000).toISOString(),
        available: true,
      }))

      setSlots(availableSlots)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load available times')
      setSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleDateSelect = (date: string) => {
    haptic('light')
    setDate(date)
  }

  const handleSlotSelect = (slot: TimeSlot) => {
    haptic('light')
    setSlot(slot)
  }

  const handleStyleSelect = (style: Hairstyle) => {
    haptic('light')
    setStyle(style)
  }

  const handleClientInfoSubmit = (info: ClientInfo) => {
    haptic('medium')
    setClientInfo(info)
  }

  const handleConfirmBooking = async () => {
    if (!selectedDate || !selectedSlot || !clientInfo) return

    setSubmitting(true)
    setError(null)
    haptic('medium')

    try {
      await api.post('/booking', {
        firstName: clientInfo.firstName,
        lastName: clientInfo.lastName,
        phone: clientInfo.phone,
        email: clientInfo.email || undefined,
        hairstyleName: selectedStyle?.name || 'Custom Service',
        price: getTotalPrice(),
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        notes: clientInfo.notes,
      })

      setSuccess(true)
      haptic('heavy')

      // Reset after delay
      setTimeout(() => {
        reset()
        closeSheet()
        router.refresh()
      }, 3000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to book appointment')
      haptic('heavy')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (success) {
      reset()
    }
    closeSheet()
  }

  const config = stepConfig[step]

  // Progress indicator
  const steps: BookingStep[] = ['date', 'time', 'style', 'info', 'confirm']
  const currentStepIndex = steps.indexOf(step)

  return (
    <Sheet open={isSheetOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetBackdrop />
      <SheetContent side="bottom" className="h-[85vh] max-h-[85vh]">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-brand-pearl">
          <div
            className="h-full bg-accent-gold transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
          />
        </div>

        <SheetHeader className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>{config.title}</SheetTitle>
              <p className="text-caption text-brand-silver mt-1">{config.subtitle}</p>
            </div>

            {/* Step Indicators */}
            <div className="flex items-center gap-1">
              {steps.map((s, i) => (
                <div
                  key={s}
                  className={cn(
                    'w-2 h-2 rounded-full transition-all',
                    i <= currentStepIndex ? 'bg-accent-gold' : 'bg-brand-pearl'
                  )}
                />
              ))}
            </div>
          </div>
        </SheetHeader>

        <SheetBody className="overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-status-booked-light rounded-lg border border-status-booked/20">
              <p className="text-caption text-status-booked">{error}</p>
            </div>
          )}

          {success ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-20 h-20 rounded-full bg-status-available/20 flex items-center justify-center mb-4 animate-bounce-in">
                <svg className="w-10 h-10 text-status-available" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-h3 font-display text-brand-black mb-2">Booking Confirmed!</h3>
              <p className="text-body text-brand-silver mb-4">
                We'll send you a confirmation text shortly.
              </p>
              <div className="bg-brand-pearl rounded-xl p-4 w-full max-w-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-caption text-brand-silver">Date</span>
                  <span className="text-body font-medium">{formatDate(selectedDate!)}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-caption text-brand-silver">Time</span>
                  <span className="text-body font-medium">{formatTime(selectedSlot!.startTime)}</span>
                </div>
                {selectedStyle && (
                  <div className="flex items-center justify-between">
                    <span className="text-caption text-brand-silver">Style</span>
                    <span className="text-body font-medium">{selectedStyle.name}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {step === 'date' && (
                <DatePicker
                  selectedDate={selectedDate}
                  onDateSelect={handleDateSelect}
                />
              )}

              {step === 'time' && (
                <TimeSlotGrid
                  slots={slots}
                  selectedSlot={selectedSlot}
                  onSlotSelect={handleSlotSelect}
                  loading={loadingSlots}
                />
              )}

              {step === 'style' && (
                <StyleSelector
                  selectedStyle={selectedStyle}
                  onStyleSelect={handleStyleSelect}
                />
              )}

              {step === 'info' && (
                <ClientInfoForm
                  defaultValues={clientInfo || undefined}
                  onSubmit={handleClientInfoSubmit}
                  onBack={goBack}
                  loading={submitting}
                />
              )}

              {step === 'confirm' && (
                <div className="space-y-4">
                  <h3 className="text-body font-medium text-brand-black">Booking Summary</h3>

                  {/* Summary Card */}
                  <div className="bg-brand-pearl rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-caption text-brand-silver">Date</span>
                      <span className="text-body font-medium text-brand-black">
                        {formatDate(selectedDate!)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-caption text-brand-silver">Time</span>
                      <span className="text-body font-medium text-brand-black">
                        {formatTime(selectedSlot!.startTime)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-caption text-brand-silver">Style</span>
                      <span className="text-body font-medium text-brand-black">
                        {selectedStyle?.name || 'Custom'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-caption text-brand-silver">Duration</span>
                      <span className="text-body text-brand-charcoal">
                        {formatDuration(getTotalDuration())}
                      </span>
                    </div>
                    <div className="border-t border-brand-silver/20 pt-3 flex items-center justify-between">
                      <span className="text-body font-medium text-brand-black">Total</span>
                      <span className="text-h3 font-display text-accent-gold">
                        {formatPrice(getTotalPrice())}
                      </span>
                    </div>
                  </div>

                  {/* Client Info */}
                  <div className="bg-brand-pearl rounded-xl p-4">
                    <h4 className="text-caption font-medium text-brand-charcoal mb-2">Contact Info</h4>
                    <p className="text-body text-brand-black">
                      {clientInfo?.firstName} {clientInfo?.lastName}
                    </p>
                    <p className="text-caption text-brand-silver">{clientInfo?.phone}</p>
                    {clientInfo?.email && (
                      <p className="text-caption text-brand-silver">{clientInfo.email}</p>
                    )}
                    {clientInfo?.notes && (
                      <p className="text-caption text-brand-silver mt-2 italic">"{clientInfo.notes}"</p>
                    )}
                  </div>

                  <p className="text-micro text-brand-silver text-center">
                    By confirming, you agree to our cancellation policy. We'll send a reminder 24 hours before your appointment.
                  </p>
                </div>
              )}
            </>
          )}
        </SheetBody>

        {!success && step !== 'info' && (
          <SheetFooter className="border-t border-brand-pearl pt-4">
            {step === 'confirm' ? (
              <div className="flex gap-3 w-full">
                <Button variant="ghost" onClick={goBack} className="flex-1">
                  Back
                </Button>
                <Button
                  variant="accent"
                  onClick={handleConfirmBooking}
                  isLoading={submitting}
                  className="flex-1"
                  hapticFeedback
                >
                  Confirm Booking
                </Button>
              </div>
            ) : (
              <div className="flex gap-3 w-full">
                {step !== 'date' && (
                  <Button variant="ghost" onClick={goBack} className="flex-1">
                    Back
                  </Button>
                )}
                <Button
                  variant="primary"
                  onClick={() => {
                    // Auto-advance based on current selection
                    if (step === 'date' && selectedDate) setStep('time')
                    else if (step === 'time' && selectedSlot) setStep('style')
                    else if (step === 'style' && selectedStyle) setStep('info')
                  }}
                  disabled={
                    (step === 'date' && !selectedDate) ||
                    (step === 'time' && !selectedSlot) ||
                    (step === 'style' && !selectedStyle)
                  }
                  className="flex-1"
                  hapticFeedback
                >
                  Continue
                </Button>
              </div>
            )}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}

export default BookingSheet

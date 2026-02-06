'use client'

import { useBookingStore } from '@/store/bookingStore'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface QuickBookButtonProps {
  className?: string
  size?: 'default' | 'large'
  variant?: 'fixed' | 'inline'
}

export function QuickBookButton({ className, size = 'default', variant = 'inline' }: QuickBookButtonProps) {
  const { openSheet, reset } = useBookingStore()

  const handleClick = () => {
    reset() // Start fresh
    openSheet()
  }

  if (variant === 'fixed') {
    return (
      <div className={cn(
        'fixed bottom-6 left-4 right-4 z-40 lg:hidden',
        className
      )}>
        <Button
          variant="accent"
          size="lg"
          fullWidth
          onClick={handleClick}
          className="shadow-elevated"
          hapticFeedback
        >
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Book Now
          </span>
        </Button>
      </div>
    )
  }

  return (
    <Button
      variant="accent"
      size={size === 'large' ? 'lg' : 'md'}
      onClick={handleClick}
      className={className}
      hapticFeedback
    >
      <span className="flex items-center gap-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Book Appointment
      </span>
    </Button>
  )
}

export default QuickBookButton

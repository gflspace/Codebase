'use client'

import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'accent'
  size?: 'sm' | 'md'
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'sm', children, ...props }, ref) => {
    const baseStyles = cn(
      'inline-flex items-center font-medium rounded-full',
      'transition-colors duration-200'
    )

    const variants = {
      default: 'bg-brand-pearl text-brand-charcoal',
      success: 'bg-status-available-light text-status-available',
      warning: 'bg-status-limited-light text-status-limited',
      error: 'bg-status-booked-light text-status-booked',
      info: 'bg-status-info-light text-status-info',
      accent: 'bg-accent-gold/10 text-accent-gold-dark',
    }

    const sizes = {
      sm: 'px-2 py-0.5 text-micro',
      md: 'px-2.5 py-1 text-caption',
    }

    return (
      <span
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

// Status Badge for appointments
export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
}

const statusConfig = {
  PENDING: { variant: 'warning' as const, label: 'Pending' },
  CONFIRMED: { variant: 'success' as const, label: 'Confirmed' },
  COMPLETED: { variant: 'info' as const, label: 'Completed' },
  CANCELLED: { variant: 'error' as const, label: 'Cancelled' },
  NO_SHOW: { variant: 'error' as const, label: 'No Show' },
}

const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, className, ...props }, ref) => {
    const config = statusConfig[status]
    return (
      <Badge ref={ref} variant={config.variant} className={className} {...props}>
        {config.label}
      </Badge>
    )
  }
)

StatusBadge.displayName = 'StatusBadge'

// Slot Status Badge for calendar
export interface SlotBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status: 'open' | 'booked' | 'blocked' | 'not_available'
}

const slotConfig = {
  open: { variant: 'success' as const, label: 'Available' },
  booked: { variant: 'error' as const, label: 'Booked' },
  blocked: { variant: 'default' as const, label: 'Blocked' },
  not_available: { variant: 'default' as const, label: 'Unavailable' },
}

const SlotBadge = forwardRef<HTMLSpanElement, SlotBadgeProps>(
  ({ status, className, ...props }, ref) => {
    const config = slotConfig[status]
    return (
      <Badge ref={ref} variant={config.variant} className={className} {...props}>
        {config.label}
      </Badge>
    )
  }
)

SlotBadge.displayName = 'SlotBadge'

export { Badge, StatusBadge, SlotBadge }

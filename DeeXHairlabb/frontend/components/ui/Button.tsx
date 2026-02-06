'use client'

import { forwardRef, ButtonHTMLAttributes } from 'react'
import { cn, haptic } from '@/lib/utils'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'accent' | 'danger'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  isLoading?: boolean
  fullWidth?: boolean
  hapticFeedback?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      fullWidth = false,
      hapticFeedback = true,
      disabled,
      children,
      onClick,
      ...props
    },
    ref
  ) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (hapticFeedback && !disabled && !isLoading) {
        haptic('light')
      }
      onClick?.(e)
    }

    const baseStyles = cn(
      'inline-flex items-center justify-center font-medium rounded-lg',
      'transition-all duration-200 ease-out',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold focus-visible:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'active:scale-[0.97]'
    )

    const variants = {
      primary: cn(
        'bg-brand-black text-brand-white',
        'hover:bg-brand-charcoal',
        'shadow-card hover:shadow-card-hover'
      ),
      secondary: cn(
        'bg-brand-pearl text-brand-black',
        'hover:bg-brand-silver/20',
        'border border-brand-graphite/10'
      ),
      ghost: cn(
        'bg-transparent text-brand-charcoal',
        'hover:bg-brand-pearl'
      ),
      accent: cn(
        'bg-accent-gold text-brand-white',
        'hover:bg-accent-gold-dark',
        'shadow-card hover:shadow-card-hover fab-shadow'
      ),
      danger: cn(
        'bg-status-booked text-brand-white',
        'hover:bg-red-700'
      ),
    }

    const sizes = {
      sm: 'h-8 px-3 text-caption gap-1.5',
      md: 'h-10 px-4 text-body gap-2',
      lg: 'h-12 px-6 text-body gap-2.5',
      icon: 'h-10 w-10 p-0',
    }

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className
        )}
        disabled={disabled || isLoading}
        onClick={handleClick}
        {...props}
      >
        {isLoading ? (
          <>
            <LoadingSpinner />
            <span className="ml-2">{children}</span>
          </>
        ) : (
          children
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

export { Button }

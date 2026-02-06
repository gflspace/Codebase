'use client'

import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, type = 'text', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-caption font-medium text-brand-charcoal mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={cn(
            'w-full h-11 px-4 rounded-lg',
            'bg-brand-white border border-brand-pearl',
            'text-body text-brand-black placeholder:text-brand-silver',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-accent-gold/50 focus:border-accent-gold',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-brand-pearl',
            error && 'border-status-booked focus:ring-status-booked/50 focus:border-status-booked',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-micro text-status-booked">{error}</p>
        )}
        {hint && !error && (
          <p className="mt-1.5 text-micro text-brand-silver">{hint}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

// Textarea variant
export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-caption font-medium text-brand-charcoal mb-1.5"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'w-full min-h-[100px] px-4 py-3 rounded-lg resize-y',
            'bg-brand-white border border-brand-pearl',
            'text-body text-brand-black placeholder:text-brand-silver',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-accent-gold/50 focus:border-accent-gold',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-brand-pearl',
            error && 'border-status-booked focus:ring-status-booked/50 focus:border-status-booked',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-micro text-status-booked">{error}</p>
        )}
        {hint && !error && (
          <p className="mt-1.5 text-micro text-brand-silver">{hint}</p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

export { Input, Textarea }

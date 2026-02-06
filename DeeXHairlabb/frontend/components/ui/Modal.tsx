'use client'

import {
  useEffect,
  useState,
  useCallback,
} from 'react'
import { cn, haptic } from '@/lib/utils'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  children: React.ReactNode
}

export function Modal({ isOpen, onClose, title, size = 'md', children }: ModalProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      requestAnimationFrame(() => setIsAnimating(true))
      document.body.style.overflow = 'hidden'
    } else {
      setIsAnimating(false)
      const timer = setTimeout(() => setIsVisible(false), 200)
      document.body.style.overflow = ''
      return () => clearTimeout(timer)
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleClose = useCallback(() => {
    haptic('light')
    onClose()
  }, [onClose])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, handleClose])

  if (!isVisible) return null

  const sizeStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-4xl',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 bg-black/50 transition-opacity duration-200',
          isAnimating ? 'opacity-100' : 'opacity-0'
        )}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Content */}
      <div
        className={cn(
          'relative bg-brand-white rounded-2xl shadow-xl w-full',
          'transition-all duration-200 ease-out',
          'max-h-[90vh] overflow-hidden flex flex-col',
          sizeStyles[size],
          isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-brand-pearl">
            <h2 className="text-lg font-semibold text-brand-black">{title}</h2>
            <button
              onClick={handleClose}
              className="p-2 rounded-full hover:bg-brand-pearl transition-colors"
              aria-label="Close"
            >
              <svg
                className="w-5 h-5 text-brand-charcoal"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState, useCallback, createContext, useContext } from 'react'
import { cn } from '@/lib/utils'

// Toast types
export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  description?: string
  duration?: number
}

// Toast Context
interface ToastContextValue {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

// Toast Provider
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2)}`
    setToasts((prev) => [...prev, { ...toast, id }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

// Toast Container
function ToastContainer() {
  const { toasts, removeToast } = useToast()

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] pointer-events-none flex flex-col gap-2 items-center md:bottom-8 md:right-8 md:left-auto md:items-end">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  )
}

// Toast Item
interface ToastItemProps {
  toast: Toast
  onClose: () => void
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setIsVisible(true))

    // Auto dismiss
    const duration = toast.duration || 4000
    const timer = setTimeout(() => {
      setIsLeaving(true)
      setTimeout(onClose, 300)
    }, duration)

    return () => clearTimeout(timer)
  }, [toast.duration, onClose])

  const handleClose = () => {
    setIsLeaving(true)
    setTimeout(onClose, 300)
  }

  const typeStyles = {
    success: {
      bg: 'bg-status-available',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    error: {
      bg: 'bg-status-booked',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    },
    warning: {
      bg: 'bg-status-limited',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    info: {
      bg: 'bg-status-info',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  }

  const config = typeStyles[toast.type]

  return (
    <div
      className={cn(
        'pointer-events-auto w-full max-w-sm bg-brand-white rounded-xl shadow-elevated overflow-hidden',
        'transform transition-all duration-300 ease-out',
        isVisible && !isLeaving ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <div className={cn('flex-shrink-0 p-1 rounded-full text-white', config.bg)}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-body font-medium text-brand-black">{toast.title}</p>
          {toast.description && (
            <p className="mt-1 text-caption text-brand-silver">{toast.description}</p>
          )}
        </div>
        <button
          onClick={handleClose}
          className="flex-shrink-0 p-1 rounded-full hover:bg-brand-pearl transition-colors"
        >
          <svg
            className="w-4 h-4 text-brand-silver"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// Convenience hooks
export function useSuccessToast() {
  const { addToast } = useToast()
  return (title: string, description?: string) =>
    addToast({ type: 'success', title, description })
}

export function useErrorToast() {
  const { addToast } = useToast()
  return (title: string, description?: string) =>
    addToast({ type: 'error', title, description })
}

export function useWarningToast() {
  const { addToast } = useToast()
  return (title: string, description?: string) =>
    addToast({ type: 'warning', title, description })
}

export function useInfoToast() {
  const { addToast } = useToast()
  return (title: string, description?: string) =>
    addToast({ type: 'info', title, description })
}

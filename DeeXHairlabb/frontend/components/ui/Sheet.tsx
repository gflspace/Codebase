'use client'

import {
  forwardRef,
  HTMLAttributes,
  useEffect,
  useState,
  useCallback,
  createContext,
  useContext,
} from 'react'
import { cn, haptic } from '@/lib/utils'

// Sheet Context
interface SheetContextValue {
  isOpen: boolean
  onClose: () => void
}

const SheetContext = createContext<SheetContextValue | null>(null)

function useSheetContext() {
  const context = useContext(SheetContext)
  if (!context) {
    throw new Error('Sheet components must be used within a Sheet')
  }
  return context
}

// Sheet Root
export interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

function Sheet({ open, onOpenChange, children }: SheetProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (open) {
      setIsVisible(true)
      requestAnimationFrame(() => setIsAnimating(true))
      // Prevent body scroll
      document.body.style.overflow = 'hidden'
    } else {
      setIsAnimating(false)
      const timer = setTimeout(() => setIsVisible(false), 300)
      document.body.style.overflow = ''
      return () => clearTimeout(timer)
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const handleClose = useCallback(() => {
    haptic('light')
    onOpenChange(false)
  }, [onOpenChange])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [open, handleClose])

  if (!isVisible) return null

  return (
    <SheetContext.Provider value={{ isOpen: isAnimating, onClose: handleClose }}>
      <div className="fixed inset-0 z-50">
        {children}
      </div>
    </SheetContext.Provider>
  )
}

// Sheet Backdrop
function SheetBackdrop() {
  const { isOpen, onClose } = useSheetContext()

  return (
    <div
      className={cn(
        'absolute inset-0 sheet-backdrop transition-opacity duration-300',
        isOpen ? 'opacity-100' : 'opacity-0'
      )}
      onClick={onClose}
      aria-hidden="true"
    />
  )
}

// Sheet Content
export interface SheetContentProps extends HTMLAttributes<HTMLDivElement> {
  side?: 'bottom' | 'right' | 'left'
}

const SheetContent = forwardRef<HTMLDivElement, SheetContentProps>(
  ({ className, side = 'bottom', children, ...props }, ref) => {
    const { isOpen } = useSheetContext()

    const sideStyles = {
      bottom: cn(
        'bottom-0 left-0 right-0',
        'sheet-content',
        isOpen ? 'translate-y-0' : 'translate-y-full'
      ),
      right: cn(
        'top-0 right-0 bottom-0 w-full max-w-md rounded-l-2xl',
        isOpen ? 'translate-x-0' : 'translate-x-full'
      ),
      left: cn(
        'top-0 left-0 bottom-0 w-full max-w-md rounded-r-2xl',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      ),
    }

    return (
      <div
        ref={ref}
        className={cn(
          'absolute bg-brand-white transition-transform duration-300 ease-out',
          'overflow-hidden flex flex-col',
          sideStyles[side],
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

SheetContent.displayName = 'SheetContent'

// Sheet Header
interface SheetHeaderProps extends HTMLAttributes<HTMLDivElement> {}

const SheetHeader = forwardRef<HTMLDivElement, SheetHeaderProps>(
  ({ className, children, ...props }, ref) => {
    const { onClose } = useSheetContext()

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-between p-4 border-b border-brand-pearl',
          className
        )}
        {...props}
      >
        {/* Drag handle for bottom sheets */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-brand-silver/50 rounded-full" />

        <div className="flex-1 pt-2">{children}</div>

        <button
          onClick={onClose}
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
    )
  }
)

SheetHeader.displayName = 'SheetHeader'

// Sheet Title
interface SheetTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

const SheetTitle = forwardRef<HTMLHeadingElement, SheetTitleProps>(
  ({ className, children, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn('text-h2 text-brand-black', className)}
      {...props}
    >
      {children}
    </h2>
  )
)

SheetTitle.displayName = 'SheetTitle'

// Sheet Body
interface SheetBodyProps extends HTMLAttributes<HTMLDivElement> {}

const SheetBody = forwardRef<HTMLDivElement, SheetBodyProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex-1 overflow-y-auto p-4', className)}
      {...props}
    >
      {children}
    </div>
  )
)

SheetBody.displayName = 'SheetBody'

// Sheet Footer
interface SheetFooterProps extends HTMLAttributes<HTMLDivElement> {}

const SheetFooter = forwardRef<HTMLDivElement, SheetFooterProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'p-4 border-t border-brand-pearl pb-safe',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)

SheetFooter.displayName = 'SheetFooter'

export {
  Sheet,
  SheetBackdrop,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
  SheetFooter,
}

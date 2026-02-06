'use client'

import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  width?: string | number
  height?: string | number
}

const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant = 'text', width, height, style, ...props }, ref) => {
    const baseStyles = 'skeleton animate-shimmer'

    const variants = {
      text: 'h-4 rounded',
      circular: 'rounded-full',
      rectangular: 'rounded-none',
      rounded: 'rounded-lg',
    }

    const sizeStyles = {
      width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
      height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
    }

    return (
      <div
        ref={ref}
        className={cn(baseStyles, variants[variant], className)}
        style={{ ...sizeStyles, ...style }}
        {...props}
      />
    )
  }
)

Skeleton.displayName = 'Skeleton'

// Common skeleton patterns
export function SkeletonCard() {
  return (
    <div className="bg-brand-white rounded-xl p-4 shadow-card space-y-3">
      <Skeleton variant="rounded" className="w-full h-40" />
      <Skeleton className="w-3/4" />
      <Skeleton className="w-1/2" />
    </div>
  )
}

export function SkeletonAvatar({ size = 40 }: { size?: number }) {
  return <Skeleton variant="circular" width={size} height={size} />
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-4',
            i === lines - 1 ? 'w-3/4' : 'w-full'
          )}
        />
      ))}
    </div>
  )
}

export function SkeletonButton() {
  return <Skeleton variant="rounded" className="h-10 w-24" />
}

export function SkeletonImage({ aspectRatio = '16/9' }: { aspectRatio?: string }) {
  return (
    <div style={{ aspectRatio }} className="w-full">
      <Skeleton variant="rounded" className="w-full h-full" />
    </div>
  )
}

export function SkeletonFeedPost() {
  return (
    <div className="w-full h-full bg-brand-charcoal relative">
      <Skeleton variant="rectangular" className="w-full h-full" />
      <div className="absolute bottom-4 left-4 right-16 space-y-2">
        <Skeleton className="w-1/2 bg-brand-graphite" />
        <Skeleton className="w-3/4 bg-brand-graphite" />
      </div>
      <div className="absolute bottom-4 right-4 space-y-4">
        <SkeletonAvatar size={32} />
        <SkeletonAvatar size={32} />
        <SkeletonAvatar size={32} />
      </div>
    </div>
  )
}

export function SkeletonTimeSlot() {
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-brand-pearl">
      <Skeleton variant="circular" width={12} height={12} />
      <Skeleton className="w-16" />
    </div>
  )
}

export function SkeletonCalendarDay() {
  return (
    <div className="space-y-2">
      <Skeleton className="w-20 h-6" />
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonTimeSlot key={i} />
        ))}
      </div>
    </div>
  )
}

export { Skeleton }

'use client'

import { useState, useRef, useEffect, ReactNode } from 'react'

interface SwipeContainerProps {
  children: ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  className?: string
}

export default function SwipeContainer({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  className = '',
}: SwipeContainerProps) {
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [touchStartY, setTouchStartY] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Minimum swipe distance (in pixels)
  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
    setTouchStartY(e.targetTouches[0].clientY)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const distanceY = touchStartY ? Math.abs(touchStartY - (touchEnd || touchStart)) : 0
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance
    const isVerticalSwipe = distanceY > Math.abs(distance)

    // Only trigger horizontal swipes if vertical movement is minimal
    if (!isVerticalSwipe) {
      if (isLeftSwipe && onSwipeLeft) {
        onSwipeLeft()
      }
      if (isRightSwipe && onSwipeRight) {
        onSwipeRight()
      }
    }

    // Vertical swipe (up)
    if (isVerticalSwipe && touchStartY && (touchStartY - (touchEnd || touchStart)) > minSwipeDistance && onSwipeUp) {
      onSwipeUp()
    }
  }

  return (
    <div
      ref={containerRef}
      className={`touch-pan-y ${className}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {children}
    </div>
  )
}

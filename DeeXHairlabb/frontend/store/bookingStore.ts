import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Hairstyle, TimeSlot } from '@/types'

export type BookingStep = 'date' | 'time' | 'style' | 'info' | 'confirm'

export interface ClientInfo {
  firstName: string
  lastName: string
  phone: string
  email?: string
  notes?: string
}

interface BookingState {
  // Current step in the booking flow
  step: BookingStep

  // Selected values
  selectedDate: string | null // ISO date string
  selectedSlot: TimeSlot | null
  selectedStyle: Hairstyle | null
  clientInfo: ClientInfo | null

  // UI state
  isSheetOpen: boolean

  // Actions
  setStep: (step: BookingStep) => void
  setDate: (date: string) => void
  setSlot: (slot: TimeSlot) => void
  setStyle: (style: Hairstyle) => void
  setClientInfo: (info: ClientInfo) => void
  openSheet: () => void
  closeSheet: () => void
  reset: () => void
  goBack: () => void

  // Computed helpers (not stored, just functions)
  canProceed: () => boolean
  getTotalDuration: () => number
  getTotalPrice: () => number
}

const initialState = {
  step: 'date' as BookingStep,
  selectedDate: null,
  selectedSlot: null,
  selectedStyle: null,
  clientInfo: null,
  isSheetOpen: false,
}

const stepOrder: BookingStep[] = ['date', 'time', 'style', 'info', 'confirm']

export const useBookingStore = create<BookingState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setStep: (step) => set({ step }),

      setDate: (date) =>
        set({
          selectedDate: date,
          selectedSlot: null, // Reset slot when date changes
          step: 'time',
        }),

      setSlot: (slot) =>
        set({
          selectedSlot: slot,
          step: 'style',
        }),

      setStyle: (style) =>
        set({
          selectedStyle: style,
          step: 'info',
        }),

      setClientInfo: (info) =>
        set({
          clientInfo: info,
          step: 'confirm',
        }),

      openSheet: () => set({ isSheetOpen: true }),

      closeSheet: () => set({ isSheetOpen: false }),

      reset: () => set(initialState),

      goBack: () => {
        const { step } = get()
        const currentIndex = stepOrder.indexOf(step)
        if (currentIndex > 0) {
          set({ step: stepOrder[currentIndex - 1] })
        }
      },

      canProceed: () => {
        const { step, selectedDate, selectedSlot, selectedStyle, clientInfo } = get()

        switch (step) {
          case 'date':
            return !!selectedDate
          case 'time':
            return !!selectedSlot
          case 'style':
            return !!selectedStyle
          case 'info':
            return !!(
              clientInfo?.firstName &&
              clientInfo?.lastName &&
              clientInfo?.phone
            )
          case 'confirm':
            return true
          default:
            return false
        }
      },

      getTotalDuration: () => {
        const { selectedStyle } = get()
        return selectedStyle?.duration || 60
      },

      getTotalPrice: () => {
        const { selectedStyle } = get()
        return selectedStyle?.price || 0
      },
    }),
    {
      name: 'booking-storage',
      partialize: (state) => ({
        // Only persist essential booking data, not UI state
        selectedDate: state.selectedDate,
        selectedSlot: state.selectedSlot,
        selectedStyle: state.selectedStyle,
        clientInfo: state.clientInfo,
      }),
    }
  )
)

// Selector hooks for performance optimization
export const useBookingStep = () => useBookingStore((state) => state.step)
export const useSelectedDate = () => useBookingStore((state) => state.selectedDate)
export const useSelectedSlot = () => useBookingStore((state) => state.selectedSlot)
export const useSelectedStyle = () => useBookingStore((state) => state.selectedStyle)
export const useClientInfo = () => useBookingStore((state) => state.clientInfo)
export const useIsSheetOpen = () => useBookingStore((state) => state.isSheetOpen)

import { create } from 'zustand'

interface UIState {
  // Navigation
  isMobileMenuOpen: boolean
  activeSection: string | null

  // Admin mode
  isAdminMode: boolean

  // Actions
  toggleMobileMenu: () => void
  closeMobileMenu: () => void
  setActiveSection: (section: string | null) => void
  enterAdminMode: () => void
  exitAdminMode: () => void
}

export const useUIStore = create<UIState>((set) => ({
  isMobileMenuOpen: false,
  activeSection: null,
  isAdminMode: false,

  toggleMobileMenu: () =>
    set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),

  closeMobileMenu: () => set({ isMobileMenuOpen: false }),

  setActiveSection: (section) => set({ activeSection: section }),

  enterAdminMode: () => set({ isAdminMode: true }),

  exitAdminMode: () => set({ isAdminMode: false }),
}))

// Selector hooks
export const useIsMobileMenuOpen = () => useUIStore((state) => state.isMobileMenuOpen)
export const useActiveSection = () => useUIStore((state) => state.activeSection)
export const useIsAdminMode = () => useUIStore((state) => state.isAdminMode)

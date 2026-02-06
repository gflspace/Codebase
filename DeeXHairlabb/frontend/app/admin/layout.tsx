'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/admin/calendar', label: 'Calendar', icon: '📅' },
  { href: '/admin/business-hours', label: 'Business Hours', icon: '🕐' },
  { href: '/admin/appointments', label: 'Appointments', icon: '📋' },
  { href: '/admin/hairstyles', label: 'Hairstyles', icon: '💇‍♀️' },
  { href: '/admin/feed', label: 'Social Feed', icon: '📸' },
  { href: '/admin/insights', label: 'Insights', icon: '💡' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<{ firstName: string; lastName: string } | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/login')
      return
    }

    try {
      setUser(JSON.parse(userData))
    } catch {
      router.push('/login')
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-pearl">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-gold" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-pearl">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 bg-brand-white border-b border-brand-pearl shadow-card">
        <div className="flex items-center justify-between px-4 h-16">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-brand-pearl"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-h3 font-display text-brand-black">Admin Panel</span>
          <div className="w-10" />
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-brand-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-brand-white border-r border-brand-pearl transform transition-transform duration-300 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-brand-pearl">
          <div className="w-10 h-10 relative rounded-full overflow-hidden bg-brand-black">
            <Image
              src="/DeeXHairlabb_Icon.jpeg"
              alt="DeeXHairlabb"
              fill
              className="object-cover"
            />
          </div>
          <div>
            <span className="text-h3 font-display text-brand-black block">DeeXHairlabb</span>
            <span className="text-micro text-brand-silver">Admin Panel</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                      isActive
                        ? 'bg-accent-gold/10 text-accent-gold-dark font-medium'
                        : 'text-brand-charcoal hover:bg-brand-pearl'
                    )}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-brand-pearl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-accent-gold/20 flex items-center justify-center text-accent-gold-dark font-medium">
              {user.firstName.charAt(0)}{user.lastName.charAt(0)}
            </div>
            <div>
              <p className="text-body font-medium text-brand-black">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-micro text-brand-silver">Administrator</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-caption text-brand-silver hover:text-status-booked hover:bg-status-booked-light rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Exit Admin Mode
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64">
        <div className="min-h-screen p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}

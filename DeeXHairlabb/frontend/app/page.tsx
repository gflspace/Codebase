'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { BookingSheet, QuickBookButton } from '@/components/booking'
import { cn, formatPrice, formatDuration } from '@/lib/utils'
import CalendarAvailability from '@/components/CalendarAvailability'
import HairstyleGallery from '@/components/HairstyleGallery'

// Helper to check if URL is a data URL (base64)
const isDataUrl = (url: string) => url?.startsWith('data:')

interface Hairstyle {
  id: string
  name: string
  price: number
  duration: number
  imageUrl?: string
}

interface FeedPost {
  id: string
  type: string
  mediaUrl?: string
  caption?: string
  likeCount: number
  commentCount: number
  published: boolean
}

interface NextAvailable {
  date: string
  time: string
}

export default function Home() {
  const router = useRouter()
  const [hairstyles, setHairstyles] = useState<Hairstyle[]>([])
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([])
  const [socialLinks, setSocialLinks] = useState<any[]>([])
  const [nextAvailable, setNextAvailable] = useState<NextAvailable | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [hairstylesRes, socialRes, availabilityRes, feedRes] = await Promise.all([
        api.get('/hairstyles/public'),
        api.get('/social/public'),
        api.get(`/booking/availability?date=${new Date().toISOString().split('T')[0]}&duration=60`),
        api.get('/admin/feed/feed?limit=50'), // Fetch all feed posts
      ])

      setHairstyles((hairstylesRes.data.hairstyles || []).slice(0, 6))
      setSocialLinks(socialRes.data.socialLinks || [])
      // Only show published image posts - synced with admin feed
      const publishedPosts = (feedRes.data.posts || []).filter((p: FeedPost) => p.published && p.type === 'image')
      setFeedPosts(publishedPosts)

      // Get next available slot
      const slots = availabilityRes.data.availableSlots || []
      if (slots.length > 0) {
        const nextSlot = new Date(slots[0])
        setNextAvailable({
          date: nextSlot.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          time: nextSlot.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        })
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdminClick = () => {
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-pearl flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-gold" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-pearl">
      {/* Header */}
      <header className="bg-brand-white sticky top-0 z-50 border-b border-brand-pearl shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 relative rounded-full overflow-hidden bg-brand-black ring-2 ring-accent-gold/20 shadow-lg">
                <Image
                  src="/DeeXHairlabb_Icon.jpeg"
                  alt="DeeXHairlabb"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xl sm:text-2xl font-display text-brand-black font-bold tracking-tight">DeeXHairlabb</span>
                <span className="text-xs text-brand-silver hidden sm:block">Professional Hair Braiding</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleAdminClick}
                className="text-caption text-brand-silver hover:text-brand-charcoal transition-colors"
              >
                Admin
              </button>
              <QuickBookButton className="hidden sm:flex" />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-16 px-4 bg-gradient-to-br from-brand-black via-brand-charcoal to-brand-black overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent-gold/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-lavender/10 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="accent" className="mb-6 animate-fade-in">
              Professional Hair Braiding
            </Badge>
            <h1 className="text-4xl md:text-6xl font-display text-brand-white mb-6 animate-slide-up">
              Your Crown, <span className="text-accent-gold">Our Craft</span>
            </h1>
            <p className="text-xl text-brand-silver mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              Book your appointment in seconds. No account needed.
            </p>

            {/* Next Available */}
            {nextAvailable && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-white/10 rounded-full mb-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <span className="w-2 h-2 rounded-full bg-status-available animate-pulse" />
                <span className="text-caption text-brand-white">
                  Next available: <span className="text-accent-gold font-medium">{nextAvailable.date} at {nextAvailable.time}</span>
                </span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <QuickBookButton size="large" />
              <Link href="#styles">
                <Button variant="ghost" className="text-brand-white border-brand-white/20 hover:bg-brand-white/10">
                  View Styles
                </Button>
              </Link>
            </div>
          </div>

          {/* Trust Signals */}
          <div className="flex flex-wrap justify-center gap-8 mt-12 pt-12 border-t border-brand-white/10">
            <div className="text-center">
              <p className="text-3xl font-display text-accent-gold">500+</p>
              <p className="text-caption text-brand-silver">Happy Clients</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-display text-accent-gold">4.9</p>
              <p className="text-caption text-brand-silver">Star Rating</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-display text-accent-gold">50+</p>
              <p className="text-caption text-brand-silver">Styles Available</p>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Styles - Synced with Social Feed */}
      <section id="styles" className="py-16 px-4 bg-brand-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-h2 font-display text-brand-black">Popular Styles</h2>
              <p className="text-caption text-brand-silver mt-1">
                {feedPosts.length > 0 ? `${feedPosts.length} styles available` : 'Our most requested looks'}
              </p>
            </div>
            <Link href="/book">
              <Button variant="ghost" size="small">
                Book Now
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {feedPosts.length > 0 ? (
              feedPosts.map((post) => (
                <Card key={post.id} variant="elevated" hoverable className="overflow-hidden group">
                  <div className="aspect-square relative bg-brand-pearl">
                    {post.mediaUrl ? (
                      isDataUrl(post.mediaUrl) ? (
                        <img
                          src={post.mediaUrl}
                          alt={post.caption || 'Hairstyle'}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <Image
                          src={post.mediaUrl}
                          alt={post.caption || 'Hairstyle'}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      )
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-6xl">💇‍♀️</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="text-body font-medium text-white line-clamp-2">{post.caption}</p>
                      <div className="flex items-center gap-3 mt-2 text-white/80 text-caption">
                        <span>❤️ {post.likeCount}</span>
                        <span>💬 {post.commentCount}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            ) : hairstyles.length > 0 ? (
              hairstyles.map((style) => (
                <Card key={style.id} variant="elevated" hoverable className="overflow-hidden group">
                  <div className="aspect-square relative bg-brand-pearl">
                    {style.imageUrl ? (
                      isDataUrl(style.imageUrl) ? (
                        <img
                          src={style.imageUrl}
                          alt={style.name}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <Image
                          src={style.imageUrl}
                          alt={style.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      )
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-6xl">💇‍♀️</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="text-body font-medium text-white">{style.name}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-caption text-white/80">{formatDuration(style.duration)}</span>
                        <span className="text-body font-bold text-accent-gold">{formatPrice(style.price)}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12 bg-brand-pearl rounded-xl">
                <span className="text-4xl mb-4 block">💇‍♀️</span>
                <p className="text-brand-charcoal">Styles coming soon!</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Availability Teaser */}
      <section className="py-16 px-4 bg-brand-pearl">
        <div className="max-w-7xl mx-auto">
          <CalendarAvailability />
        </div>
      </section>

      {/* From Our Chair - Hairstyle Gallery */}
      <section className="py-16 px-4 bg-brand-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-h2 font-display text-brand-black">From Our Chair</h2>
              <p className="text-caption text-brand-silver mt-1">Real work, real clients, real results</p>
            </div>
          </div>
          <HairstyleGallery />
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 px-4 bg-gradient-to-br from-accent-gold/5 to-accent-lavender/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-h2 font-display text-brand-black">Why DeeXHairlabb</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card variant="elevated" className="text-center p-8">
              <span className="text-4xl mb-4 block">⚡</span>
              <h3 className="text-h3 font-display text-brand-black mb-2">3-Tap Booking</h3>
              <p className="text-caption text-brand-silver">
                Book in seconds. No account required. Just pick a date, time, and you're done.
              </p>
            </Card>

            <Card variant="elevated" className="text-center p-8">
              <span className="text-4xl mb-4 block">💪</span>
              <h3 className="text-h3 font-display text-brand-black mb-2">Expert Braider</h3>
              <p className="text-caption text-brand-silver">
                Years of experience. Perfect tension. Styles that last. Your hair is in good hands.
              </p>
            </Card>

            <Card variant="elevated" className="text-center p-8">
              <span className="text-4xl mb-4 block">💜</span>
              <h3 className="text-h3 font-display text-brand-black mb-2">Personal Touch</h3>
              <p className="text-caption text-brand-silver">
                We remember your preferences. Every visit feels like coming home.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Social Links */}
      <section className="py-12 px-4 bg-brand-white border-t border-brand-pearl">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-caption text-brand-silver mb-4">Follow the journey</p>
          <div className="flex justify-center gap-4">
            {/* Deduplicate by platform - only show one icon per platform */}
            {socialLinks
              .filter((link, index, self) =>
                index === self.findIndex((l) => l.platform === link.platform)
              )
              .map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 rounded-full bg-brand-pearl flex items-center justify-center hover:bg-accent-gold/10 hover:scale-110 transition-all text-2xl"
                title={link.platform}
              >
                {link.platform === 'Instagram' && '📸'}
                {link.platform === 'Facebook' && '👥'}
                {link.platform === 'TikTok' && '🎵'}
                {link.platform === 'Twitter' && '🐦'}
                {link.platform === 'YouTube' && '▶️'}
                {!['Instagram', 'Facebook', 'TikTok', 'Twitter', 'YouTube'].includes(link.platform) && '🔗'}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-brand-black text-brand-silver py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 relative rounded-full overflow-hidden ring-2 ring-accent-gold/30">
                <Image
                  src="/DeeXHairlabb_Icon.jpeg"
                  alt="DeeXHairlabb"
                  fill
                  className="object-cover"
                />
              </div>
              <span className="text-lg font-display text-brand-white font-bold">DeeXHairlabb</span>
            </div>
            <p className="text-caption text-center">
              &copy; {new Date().getFullYear()} DeeXHairlabb. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <Link href="/book" className="text-caption hover:text-brand-white transition-colors">
                Book Now
              </Link>
              <Link href="/styles" className="text-caption hover:text-brand-white transition-colors">
                Styles
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Book Button (Mobile) */}
      <QuickBookButton variant="fixed" />

      {/* Booking Sheet */}
      <BookingSheet />
    </div>
  )
}

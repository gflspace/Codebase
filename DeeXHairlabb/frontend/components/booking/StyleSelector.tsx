'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { cn, formatPrice, formatDuration } from '@/lib/utils'
import type { Hairstyle } from '@/types'
import api from '@/lib/api'
import { Badge } from '@/components/ui/Badge'

interface StyleSelectorProps {
  selectedStyle: Hairstyle | null
  onStyleSelect: (style: Hairstyle) => void
}

export function StyleSelector({ selectedStyle, onStyleSelect }: StyleSelectorProps) {
  const [hairstyles, setHairstyles] = useState<Hairstyle[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'popular' | 'quick'>('all')

  useEffect(() => {
    fetchHairstyles()
  }, [])

  const fetchHairstyles = async () => {
    try {
      const response = await api.get('/hairstyles/public')
      setHairstyles(response.data.hairstyles || [])
    } catch (error) {
      console.error('Failed to fetch hairstyles:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredStyles = hairstyles.filter((style) => {
    if (filter === 'quick') return style.duration <= 120
    if (filter === 'popular') return style.isPublished // Could be popularity based in future
    return true
  })

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-20 rounded-full bg-brand-pearl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-square rounded-xl bg-brand-pearl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-body font-medium text-brand-black">Choose Your Style</h3>
        <span className="text-micro text-brand-silver">{filteredStyles.length} styles</span>
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-2">
        {[
          { key: 'all', label: 'All Styles' },
          { key: 'popular', label: 'Popular' },
          { key: 'quick', label: 'Under 2hrs' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key as typeof filter)}
            className={cn(
              'flex-shrink-0 px-4 py-2 rounded-full text-caption font-medium transition-all',
              filter === key
                ? 'bg-accent-gold text-white'
                : 'bg-brand-pearl text-brand-charcoal hover:bg-accent-gold/10'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Style Grid */}
      <div className="grid grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pb-4">
        {filteredStyles.map((style) => {
          const isSelected = selectedStyle?.id === style.id
          const hasPromotion = style.promotionPercentage && style.promotionPercentage > 0

          return (
            <button
              key={style.id}
              onClick={() => onStyleSelect(style)}
              className={cn(
                'relative rounded-xl overflow-hidden transition-all text-left',
                'ring-2 ring-transparent',
                isSelected && 'ring-accent-gold shadow-lg scale-[1.02]',
                !isSelected && 'hover:ring-accent-gold/50'
              )}
            >
              {/* Image */}
              <div className="aspect-square relative bg-brand-pearl">
                {style.imageUrl ? (
                  <Image
                    src={style.imageUrl}
                    alt={style.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-4xl">💇‍♀️</span>
                  </div>
                )}

                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Selected Checkmark */}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-accent-gold flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}

                {/* Promotion Badge */}
                {hasPromotion && (
                  <Badge variant="warning" className="absolute top-2 left-2">
                    {style.promotionPercentage}% OFF
                  </Badge>
                )}

                {/* Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-body font-medium text-white truncate">{style.name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-caption text-white/80">
                      {formatDuration(style.duration)}
                    </p>
                    <p className="text-body font-display text-white">
                      {formatPrice(style.price)}
                    </p>
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Custom Option */}
      <button
        onClick={() => onStyleSelect({
          id: 'custom',
          name: 'Custom Style',
          description: 'Describe your desired hairstyle',
          price: 0,
          duration: 120,
          isPublished: true,
        })}
        className={cn(
          'w-full p-4 rounded-xl border-2 border-dashed transition-all',
          selectedStyle?.id === 'custom'
            ? 'border-accent-gold bg-accent-gold/10'
            : 'border-brand-pearl hover:border-accent-gold/50'
        )}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">✨</span>
          <div className="text-left">
            <p className="text-body font-medium text-brand-black">Custom Style</p>
            <p className="text-caption text-brand-silver">Have something specific in mind?</p>
          </div>
        </div>
      </button>
    </div>
  )
}

export default StyleSelector

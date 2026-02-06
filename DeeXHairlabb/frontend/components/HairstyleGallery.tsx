'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import api from '@/lib/api'

// Helper to check if URL is a data URL (base64)
const isDataUrl = (url: string) => url?.startsWith('data:')

interface Hairstyle {
  id: string
  name: string
  imageUrl?: string
  galleryUrls: string[]
}

interface GalleryImage {
  url: string
  hairstyleName: string
  hairstyleId: string
}

export default function HairstyleGallery() {
  const [images, setImages] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null)

  useEffect(() => {
    fetchGalleryImages()
  }, [])

  const fetchGalleryImages = async () => {
    try {
      console.log('[HairstyleGallery] Fetching from /hairstyles/public...')
      const response = await api.get('/hairstyles/public')
      const hairstyles: Hairstyle[] = response.data.hairstyles || []
      console.log('[HairstyleGallery] Got', hairstyles.length, 'hairstyles')

      // Collect all images from hairstyles
      const allImages: GalleryImage[] = []

      hairstyles.forEach((style) => {
        // Add main image if exists
        if (style.imageUrl) {
          console.log('[HairstyleGallery] Found image for:', style.name)
          allImages.push({
            url: style.imageUrl,
            hairstyleName: style.name,
            hairstyleId: style.id,
          })
        }

        // Add gallery images
        if (style.galleryUrls && style.galleryUrls.length > 0) {
          console.log('[HairstyleGallery] Found', style.galleryUrls.length, 'gallery images for:', style.name)
          style.galleryUrls.forEach((url) => {
            allImages.push({
              url,
              hairstyleName: style.name,
              hairstyleId: style.id,
            })
          })
        }
      })

      console.log('[HairstyleGallery] Total images to display:', allImages.length)
      setImages(allImages)
    } catch (error) {
      console.error('[HairstyleGallery] Failed to fetch gallery images:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-gold"></div>
      </div>
    )
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-12 bg-brand-pearl rounded-xl">
        <span className="text-4xl mb-4 block">📸</span>
        <p className="text-brand-charcoal">Gallery coming soon!</p>
        <p className="text-caption text-brand-silver mt-1">Check back for photos of our work</p>
      </div>
    )
  }

  return (
    <>
      {/* Image Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((image, index) => (
          <div
            key={`${image.hairstyleId}-${index}`}
            className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group"
            onClick={() => setSelectedImage(image)}
          >
            {isDataUrl(image.url) ? (
              <img
                src={image.url}
                alt={image.hairstyleName}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
            ) : (
              <Image
                src={image.url}
                alt={image.hairstyleName}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-110"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-white text-sm font-medium truncate">{image.hairstyleName}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white p-2 hover:bg-white/20 rounded-full transition"
            onClick={() => setSelectedImage(null)}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="relative max-w-4xl max-h-[80vh] w-full">
            {isDataUrl(selectedImage.url) ? (
              <img
                src={selectedImage.url}
                alt={selectedImage.hairstyleName}
                className="object-contain w-full h-full rounded-lg max-h-[80vh]"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <Image
                src={selectedImage.url}
                alt={selectedImage.hairstyleName}
                width={800}
                height={800}
                className="object-contain w-full h-full rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 rounded-b-lg">
              <p className="text-white text-lg font-medium">{selectedImage.hairstyleName}</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

export default function AdminHairstyles() {
  const router = useRouter()
  const [hairstyles, setHairstyles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    imageUrl: '',
    price: '',
    duration: '',
    featured: false,
    published: true,
  })
  const [galleryUrls, setGalleryUrls] = useState<string[]>([])
  const [uploadingGallery, setUploadingGallery] = useState(false)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/')
      return
    }
    fetchHairstyles()
  }, [router])

  const handleExitAdmin = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  const fetchHairstyles = async () => {
    try {
      const response = await api.get('/admin/hairstyles')
      setHairstyles(response.data.hairstyles || [])
    } catch (error) {
      console.error('Failed to fetch hairstyles:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        price: formData.price ? parseFloat(formData.price) : undefined,
        duration: formData.duration ? parseInt(formData.duration) : undefined,
        galleryUrls: galleryUrls,
      }

      if (editingId) {
        await api.patch(`/admin/hairstyles/${editingId}`, payload)
      } else {
        await api.post('/admin/hairstyles', payload)
      }

      setShowForm(false)
      setEditingId(null)
      setPreviewUrl(null)
      setMediaType(null)
      setGalleryUrls([])
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (galleryInputRef.current) galleryInputRef.current.value = ''
      setFormData({
        name: '',
        description: '',
        imageUrl: '',
        price: '',
        duration: '',
        featured: false,
        published: true,
      })
      fetchHairstyles()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save hairstyle')
    }
  }

  const handleEdit = (hairstyle: any) => {
    setEditingId(hairstyle.id)
    setFormData({
      name: hairstyle.name,
      description: hairstyle.description || '',
      imageUrl: hairstyle.imageUrl || '',
      price: hairstyle.price ? hairstyle.price.toString() : '',
      duration: hairstyle.duration ? hairstyle.duration.toString() : '',
      featured: hairstyle.featured || false,
      published: hairstyle.published !== false,
    })
    // Load existing gallery images
    setGalleryUrls(hairstyle.galleryUrls || [])
    // Set preview for existing image/video
    if (hairstyle.imageUrl) {
      setPreviewUrl(hairstyle.imageUrl)
      // Detect if it's a video based on URL or data type
      const isVideo = hairstyle.imageUrl.includes('video') ||
                      hairstyle.imageUrl.match(/\.(mp4|webm|mov|avi)$/i)
      setMediaType(isVideo ? 'video' : 'image')
    } else {
      setPreviewUrl(null)
      setMediaType(null)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (galleryInputRef.current) galleryInputRef.current.value = ''
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this hairstyle?')) return
    try {
      await api.delete(`/admin/hairstyles/${id}`)
      fetchHairstyles()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete hairstyle')
    }
  }

  // Compress image using canvas
  const compressImage = (file: File, maxWidth = 1920, maxHeight = 1920, quality = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img

        // Calculate new dimensions while maintaining aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }

        // Create canvas and draw resized image
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)

        // Convert to base64 with compression
        const base64 = canvas.toDataURL('image/jpeg', quality)
        resolve(base64)
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }

  // Process video (basic - just convert to base64)
  const processVideo = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (file.size > 50 * 1024 * 1024) {
        reject(new Error('Video too large. Please use a video under 50MB.'))
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Failed to read video'))
      reader.readAsDataURL(file)
    })
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)

    try {
      // Create preview URL
      const objectUrl = URL.createObjectURL(file)
      setPreviewUrl(objectUrl)
      setMediaType(file.type.startsWith('video/') ? 'video' : 'image')

      let base64: string
      if (file.type.startsWith('image/')) {
        // Compress images automatically
        base64 = await compressImage(file)
      } else if (file.type.startsWith('video/')) {
        base64 = await processVideo(file)
      } else {
        throw new Error('Unsupported file type')
      }

      setFormData(prev => ({ ...prev, imageUrl: base64 }))
      setUploading(false)
    } catch (error: any) {
      console.error('File upload error:', error)
      alert(error.message || 'Failed to process file')
      setUploading(false)
      setPreviewUrl(null)
      setMediaType(null)
    }
  }

  const clearMediaPreview = () => {
    setPreviewUrl(null)
    setMediaType(null)
    setFormData(prev => ({ ...prev, imageUrl: '' }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingGallery(true)

    try {
      const newUrls: string[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        let base64: string
        if (file.type.startsWith('image/')) {
          // Compress images automatically
          base64 = await compressImage(file)
        } else if (file.type.startsWith('video/')) {
          if (file.size > 50 * 1024 * 1024) {
            alert(`Video "${file.name}" is too large. Maximum size is 50MB.`)
            continue
          }
          base64 = await processVideo(file)
        } else {
          continue // Skip unsupported files
        }

        newUrls.push(base64)
      }

      setGalleryUrls(prev => [...prev, ...newUrls])
    } catch (error) {
      console.error('Gallery upload error:', error)
      alert('Failed to process some files')
    } finally {
      setUploadingGallery(false)
      if (galleryInputRef.current) galleryInputRef.current.value = ''
    }
  }

  const removeGalleryImage = (index: number) => {
    setGalleryUrls(prev => prev.filter((_, i) => i !== index))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Dashboard
              </button>
              <h1 className="text-xl font-bold text-primary-700">Manage Hairstyles</h1>
            </div>
            <button
              onClick={handleExitAdmin}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            >
              Exit Admin Mode
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Hairstyles</h2>
          <button
            onClick={() => {
              setShowForm(true)
              setEditingId(null)
              setPreviewUrl(null)
              setMediaType(null)
              setGalleryUrls([])
              setFormData({
                name: '',
                description: '',
                imageUrl: '',
                price: '',
                duration: '',
                featured: false,
                published: true,
              })
              if (fileInputRef.current) fileInputRef.current.value = ''
              if (galleryInputRef.current) galleryInputRef.current.value = ''
            }}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
          >
            Add Hairstyle
          </button>
        </div>

        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h3 className="text-xl font-semibold mb-4">
              {editingId ? 'Edit' : 'Add'} Hairstyle
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image / Video
                </label>

                {/* Preview Section */}
                {(previewUrl || formData.imageUrl) && (
                  <div className="mb-4 relative inline-block">
                    {mediaType === 'video' ? (
                      <video
                        src={previewUrl || formData.imageUrl}
                        className="max-w-xs max-h-48 rounded-lg border border-gray-200"
                        controls
                        muted
                      />
                    ) : (
                      <img
                        src={previewUrl || formData.imageUrl}
                        alt="Preview"
                        className="max-w-xs max-h-48 rounded-lg border border-gray-200 object-cover"
                      />
                    )}
                    <button
                      type="button"
                      onClick={clearMediaPreview}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 text-sm font-bold"
                    >
                      ×
                    </button>
                  </div>
                )}

                {/* File Upload Section */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="media-upload"
                    />
                    <label
                      htmlFor="media-upload"
                      className={`flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-500 hover:bg-gray-50 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      {uploading ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span className="text-sm text-gray-600">Processing...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm text-gray-600">Browse from device</span>
                        </>
                      )}
                    </label>
                    <p className="text-xs text-gray-500 mt-1">Images (max 10MB) or Videos (max 50MB)</p>
                  </div>

                  <div className="flex items-center text-gray-400 text-sm">or</div>

                  <div className="flex-1">
                    <input
                      type="url"
                      value={formData.imageUrl.startsWith('data:') ? '' : formData.imageUrl}
                      onChange={(e) => {
                        setFormData({ ...formData, imageUrl: e.target.value })
                        setPreviewUrl(e.target.value || null)
                        setMediaType(e.target.value ? 'image' : null)
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }}
                      placeholder="Paste image/video URL"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>

              {/* Gallery Images Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gallery Images (Multiple)
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Add multiple photos to showcase this hairstyle in "From Our Chair"
                </p>

                {/* Gallery Preview */}
                {galleryUrls.length > 0 && (
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    {galleryUrls.map((url, index) => {
                      const isVideo = url.includes('video') || url.startsWith('data:video/')
                      return (
                        <div key={index} className="relative group">
                          {isVideo ? (
                            <video
                              src={url}
                              className="w-full h-24 object-cover rounded-lg border border-gray-200"
                              muted
                            />
                          ) : (
                            <img
                              src={url}
                              alt={`Gallery ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg border border-gray-200"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => removeGalleryImage(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Gallery Upload Button */}
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleGalleryUpload}
                  className="hidden"
                  id="gallery-upload"
                />
                <label
                  htmlFor="gallery-upload"
                  className={`flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-500 hover:bg-gray-50 transition-colors ${uploadingGallery ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  {uploadingGallery ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-sm text-gray-600">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span className="text-sm text-gray-600">
                        {galleryUrls.length > 0 ? 'Add more photos/videos' : 'Add gallery photos/videos'}
                      </span>
                    </>
                  )}
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                    className="mr-2"
                  />
                  Featured
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.published}
                    onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                    className="mr-2"
                  />
                  Published
                </label>
              </div>

              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700"
                >
                  {editingId ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingId(null)
                    setPreviewUrl(null)
                    setMediaType(null)
                    setGalleryUrls([])
                    if (fileInputRef.current) fileInputRef.current.value = ''
                    if (galleryInputRef.current) galleryInputRef.current.value = ''
                  }}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hairstyles.map((style) => {
            const isVideo = style.imageUrl && (
              style.imageUrl.includes('video') ||
              style.imageUrl.match(/\.(mp4|webm|mov|avi)$/i) ||
              style.imageUrl.startsWith('data:video/')
            )
            return (
            <div key={style.id} className="bg-white rounded-lg shadow overflow-hidden">
              {style.imageUrl && (
                isVideo ? (
                  <video
                    src={style.imageUrl}
                    className="w-full h-48 object-cover"
                    muted
                    loop
                    playsInline
                    onMouseEnter={(e) => e.currentTarget.play()}
                    onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0 }}
                  />
                ) : (
                  <img
                    src={style.imageUrl}
                    alt={style.name}
                    className="w-full h-48 object-cover"
                  />
                )
              )}
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold">{style.name}</h3>
                  <div className="flex space-x-1">
                    {style.featured && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        Featured
                      </span>
                    )}
                    {!style.published && (
                      <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                        Draft
                      </span>
                    )}
                  </div>
                </div>
                {style.description && (
                  <p className="text-sm text-gray-600 mb-2">{style.description}</p>
                )}
                <div className="flex justify-between items-center mb-2">
                  {style.price && (
                    <span className="text-lg font-bold text-primary-600">
                      ${Number(style.price).toFixed(2)}
                    </span>
                  )}
                  {style.duration && (
                    <span className="text-sm text-gray-500">{style.duration} min</span>
                  )}
                </div>
                <div className="flex space-x-2 mt-4">
                  <button
                    onClick={() => handleEdit(style)}
                    className="flex-1 bg-primary-600 text-white px-3 py-2 rounded-md hover:bg-primary-700 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(style.id)}
                    className="flex-1 bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )})}
        </div>
      </div>
    </div>
  )
}

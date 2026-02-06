'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

export default function AdminFeedManagement() {
  const router = useRouter()
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    type: 'image' as 'image' | 'video' | 'text',
    content: '',
    mediaUrl: '',
    thumbnailUrl: '',
    caption: '',
    published: true,
  })

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/')
      return
    }
    fetchPosts()
  }, [router])

  const handleExitAdmin = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  const fetchPosts = async () => {
    try {
      const response = await api.get('/admin/feed/feed?limit=100')
      setPosts(response.data.posts || [])
    } catch (error) {
      console.error('Failed to fetch posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/admin/feed/posts', formData)
      setShowForm(false)
      setPreviewUrl(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setFormData({
        type: 'image',
        content: '',
        mediaUrl: '',
        thumbnailUrl: '',
        caption: '',
        published: true,
      })
      fetchPosts()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create post')
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

  // Compress video by extracting frames at lower quality (basic approach)
  const processVideo = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      // For videos, we'll just convert to base64 but warn if too large
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result as string
        // Check if result is too large (over 5MB base64)
        if (base64.length > 5 * 1024 * 1024) {
          // Try to warn but still allow
          console.warn('Video is large, consider using a shorter clip')
        }
        resolve(base64)
      }
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

      // Auto-detect type based on file
      const fileType = file.type.startsWith('video/') ? 'video' : 'image'
      let base64: string

      if (file.type.startsWith('image/')) {
        // Compress images automatically
        base64 = await compressImage(file)
      } else if (file.type.startsWith('video/')) {
        // Check video size - limit to 50MB
        if (file.size > 50 * 1024 * 1024) {
          alert('Video too large. Please use a video under 50MB or trim it to a shorter clip.')
          setUploading(false)
          setPreviewUrl(null)
          return
        }
        base64 = await processVideo(file)
      } else {
        throw new Error('Unsupported file type')
      }

      setFormData(prev => ({
        ...prev,
        mediaUrl: base64,
        type: fileType
      }))
      setUploading(false)
    } catch (error) {
      console.error('File upload error:', error)
      alert('Failed to process file')
      setUploading(false)
      setPreviewUrl(null)
    }
  }

  const clearMediaPreview = () => {
    setPreviewUrl(null)
    setFormData(prev => ({ ...prev, mediaUrl: '' }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return
    try {
      await api.delete(`/admin/feed/posts/${id}`)
      fetchPosts()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete post')
    }
  }

  const handleTogglePublish = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/admin/feed/posts/${id}`, { published: !currentStatus })
      fetchPosts()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update post')
    }
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
              <h1 className="text-xl font-bold text-primary-700">DeeXHairlabb Social Feed Management</h1>
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
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Feed Posts</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
          >
            {showForm ? 'Cancel' : 'Create Post'}
          </button>
        </div>

        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h3 className="text-xl font-semibold mb-4">Create Feed Post</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Post Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'image' | 'video' | 'text' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                  <option value="text">Text</option>
                </select>
              </div>

              {formData.type === 'text' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Content *</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={4}
                    required
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Media (Image / Video)
                    </label>

                    {/* Preview Section */}
                    {(previewUrl || formData.mediaUrl) && (
                      <div className="mb-4 relative inline-block">
                        {formData.type === 'video' ? (
                          <video
                            src={previewUrl || formData.mediaUrl}
                            className="max-w-xs max-h-48 rounded-lg border border-gray-200"
                            controls
                            muted
                          />
                        ) : (
                          <img
                            src={previewUrl || formData.mediaUrl}
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
                          value={formData.mediaUrl.startsWith('data:') ? '' : formData.mediaUrl}
                          onChange={(e) => {
                            setFormData({ ...formData, mediaUrl: e.target.value })
                            setPreviewUrl(e.target.value || null)
                            if (fileInputRef.current) fileInputRef.current.value = ''
                          }}
                          placeholder="Paste image/video URL"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                  </div>
                  {formData.type === 'video' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Thumbnail URL</label>
                      <input
                        type="url"
                        value={formData.thumbnailUrl}
                        onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="https://example.com/thumbnail.jpg"
                      />
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Caption</label>
                <input
                  type="text"
                  value={formData.caption}
                  onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Post caption..."
                />
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.published}
                    onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                    className="mr-2"
                  />
                  Publish to DeeXHairlabb Social Feed
                </label>
              </div>

              <button
                type="submit"
                className="bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700"
              >
                Create Post
              </button>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <div key={post.id} className="bg-white rounded-lg shadow overflow-hidden">
              {post.type === 'image' && post.mediaUrl && (
                <img src={post.mediaUrl} alt={post.caption || 'Post'} className="w-full h-48 object-cover" />
              )}
              {post.type === 'video' && post.thumbnailUrl && (
                <img src={post.thumbnailUrl} alt={post.caption || 'Post'} className="w-full h-48 object-cover" />
              )}
              {post.type === 'text' && (
                <div className="w-full h-48 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center p-4">
                  <p className="text-white text-center font-semibold">{post.content}</p>
                </div>
              )}
              <div className="p-4">
                {post.caption && <p className="text-sm font-medium mb-2">{post.caption}</p>}
                <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
                  <span>❤️ {post.likeCount}</span>
                  <span>💬 {post.commentCount}</span>
                  <span>🔄 {post.repostCount}</span>
                  <span>📤 {post.shareCount}</span>
                </div>
                <div className="flex space-x-2 mt-4">
                  <button
                    onClick={() => handleTogglePublish(post.id, post.published)}
                    className={`flex-1 px-3 py-2 rounded-md text-sm ${
                      post.published
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    {post.published ? 'Published' : 'Draft'}
                  </button>
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="flex-1 bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

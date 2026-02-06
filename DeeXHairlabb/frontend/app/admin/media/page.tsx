'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

export default function AdminMedia() {
  const router = useRouter()
  const [media, setMedia] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    type: 'image' as 'image' | 'video',
    url: '',
    thumbnailUrl: '',
    caption: '',
    description: '',
    hairstyleId: '',
    clientId: '',
    order: '0',
    featured: false,
    published: true,
  })

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/')
      return
    }
    fetchMedia()
  }, [router])

  const handleExitAdmin = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  const fetchMedia = async () => {
    try {
      const response = await api.get('/admin/media')
      setMedia(response.data.media || [])
    } catch (error) {
      console.error('Failed to fetch media:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        order: parseInt(formData.order) || 0,
        hairstyleId: formData.hairstyleId || undefined,
        clientId: formData.clientId || undefined,
        thumbnailUrl: formData.thumbnailUrl || undefined,
      }

      if (editingId) {
        await api.patch(`/admin/media/${editingId}`, payload)
      } else {
        await api.post('/admin/media', payload)
      }

      setShowForm(false)
      setEditingId(null)
      setFormData({
        type: 'image',
        url: '',
        thumbnailUrl: '',
        caption: '',
        description: '',
        hairstyleId: '',
        clientId: '',
        order: '0',
        featured: false,
        published: true,
      })
      fetchMedia()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save media')
    }
  }

  const handleEdit = (item: any) => {
    setEditingId(item.id)
    setFormData({
      type: item.type,
      url: item.url,
      thumbnailUrl: item.thumbnailUrl || '',
      caption: item.caption || '',
      description: item.description || '',
      hairstyleId: item.hairstyleId || '',
      clientId: item.clientId || '',
      order: item.order?.toString() || '0',
      featured: item.featured || false,
      published: item.published !== false,
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this media?')) return
    try {
      await api.delete(`/admin/media/${id}`)
      fetchMedia()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete media')
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
              <h1 className="text-xl font-bold text-primary-700">Manage Media</h1>
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
          <h2 className="text-2xl font-bold">Media Library</h2>
          <button
            onClick={() => {
              setShowForm(true)
              setEditingId(null)
              setFormData({
                type: 'image',
                url: '',
                thumbnailUrl: '',
                caption: '',
                description: '',
                hairstyleId: '',
                clientId: '',
                order: '0',
                featured: false,
                published: true,
              })
            }}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
          >
            Add Media
          </button>
        </div>

        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h3 className="text-xl font-semibold mb-4">{editingId ? 'Edit' : 'Add'} Media</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'image' | 'video' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Media URL *</label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="https://example.com/image.jpg"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Upload your image/video to a hosting service (e.g., Cloudinary, AWS S3) and paste the URL here
                </p>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Caption</label>
                <input
                  type="text"
                  value={formData.caption}
                  onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Short caption for the media"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  placeholder="Detailed description (optional)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Display Order</label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: e.target.value })}
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
          {media.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow overflow-hidden">
              {item.type === 'image' ? (
                <img
                  src={item.url}
                  alt={item.caption || 'Media'}
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="w-full h-48 bg-gray-900 flex items-center justify-center">
                  <video
                    src={item.url}
                    poster={item.thumbnailUrl}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded capitalize">
                    {item.type}
                  </span>
                  <div className="flex space-x-1">
                    {item.featured && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        Featured
                      </span>
                    )}
                    {!item.published && (
                      <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                        Draft
                      </span>
                    )}
                  </div>
                </div>
                {item.caption && (
                  <p className="text-sm font-medium mb-1">{item.caption}</p>
                )}
                {item.description && (
                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">{item.description}</p>
                )}
                <div className="flex space-x-2 mt-4">
                  <button
                    onClick={() => handleEdit(item)}
                    className="flex-1 bg-primary-600 text-white px-3 py-2 rounded-md hover:bg-primary-700 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
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

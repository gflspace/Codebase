'use client'

import { useState, useEffect, useRef } from 'react'
import api from '@/lib/api'

interface Post {
  id: string
  type: 'image' | 'video' | 'text'
  content?: string
  mediaUrl?: string
  thumbnailUrl?: string
  caption?: string
  likeCount: number
  commentCount: number
  shareCount: number
  repostCount: number
  viewCount: number
  createdAt: string
}

export default function SocialFeed() {
  const [posts, setPosts] = useState<Post[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [sessionId, setSessionId] = useState<string>('')
  const [postStatuses, setPostStatuses] = useState<{ [key: string]: { liked: boolean; reposted: boolean } }>({})
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Get or create session ID
    let session = localStorage.getItem('feedSessionId')
    if (!session) {
      session = `feed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('feedSessionId', session)
    }
    setSessionId(session)
    fetchFeed()
  }, [])

  const fetchFeed = async () => {
    try {
      const response = await api.get('/feed/feed?limit=50')
      const fetchedPosts = response.data.posts || []
      setPosts(fetchedPosts)

      // Fetch statuses for all posts (only if sessionId is available)
      if (sessionId) {
        const statusPromises = fetchedPosts.map((post: Post) =>
          api.get(`/feed/posts/${post.id}/status?sessionId=${sessionId}`).catch(() => ({ data: { liked: false, reposted: false } }))
        )
        const statuses = await Promise.all(statusPromises)
        const statusMap: { [key: string]: { liked: boolean; reposted: boolean } } = {}
        fetchedPosts.forEach((post: Post, idx: number) => {
          statusMap[post.id] = statuses[idx].data
        })
        setPostStatuses(statusMap)
      }
    } catch (error) {
      console.error('Failed to fetch feed:', error)
    } finally {
      setLoading(false)
    }
  }

  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(0)
    setTouchStart(e.targetTouches[0].clientY)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientY)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isUpSwipe = distance > minSwipeDistance
    const isDownSwipe = distance < -minSwipeDistance

    if (isUpSwipe && currentIndex < posts.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
    if (isDownSwipe && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleLike = async (postId: string) => {
    try {
      const response = await api.post('/feed/like', { postId, sessionId })
      const liked = response.data.liked

      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, likeCount: liked ? post.likeCount + 1 : post.likeCount - 1 }
            : post
        )
      )

      setPostStatuses((prev) => ({
        ...prev,
        [postId]: { ...prev[postId], liked },
      }))
    } catch (error) {
      console.error('Failed to like post:', error)
    }
  }

  const handleRepost = async (postId: string) => {
    try {
      const response = await api.post('/feed/repost', { postId, sessionId })
      const reposted = response.data.reposted

      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, repostCount: reposted ? post.repostCount + 1 : post.repostCount - 1 }
            : post
        )
      )

      setPostStatuses((prev) => ({
        ...prev,
        [postId]: { ...prev[postId], reposted },
      }))
    } catch (error) {
      console.error('Failed to repost:', error)
    }
  }

  const handleShare = async (postId: string) => {
    try {
      await api.post('/feed/share', { postId, sessionId, shareType: 'link' })

      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId ? { ...post, shareCount: post.shareCount + 1 } : post
        )
      )

      // Copy link to clipboard
      const url = `${window.location.origin}/feed/post/${postId}`
      navigator.clipboard.writeText(url)
      alert('Link copied to clipboard!')
    } catch (error) {
      console.error('Failed to share post:', error)
    }
  }

  const trackView = async (postId: string) => {
    try {
      await api.post('/feed/track', {
        postId,
        sessionId,
        action: 'view',
      })
    } catch (error) {
      // Silent fail
    }
  }

  useEffect(() => {
    if (posts[currentIndex]) {
      trackView(posts[currentIndex].id)
    }
  }, [currentIndex, posts])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No posts in the DeeXHairlabb Social Feed yet</p>
      </div>
    )
  }

  const currentPost = posts[currentIndex]
  const status = postStatuses[currentPost.id] || { liked: false, reposted: false }

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">DeeXHairlabb Social Feed</h2>

      <div
        ref={containerRef}
        className="relative w-full bg-black rounded-lg overflow-hidden"
        style={{ aspectRatio: '9/16', maxHeight: '80vh' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Media Display */}
        {currentPost.type === 'image' && currentPost.mediaUrl && (
          <img
            src={currentPost.mediaUrl}
            alt={currentPost.caption || 'Post'}
            className="w-full h-full object-cover"
          />
        )}

        {currentPost.type === 'video' && currentPost.mediaUrl && (
          <video
            src={currentPost.mediaUrl}
            poster={currentPost.thumbnailUrl}
            controls
            className="w-full h-full object-cover"
            autoPlay
            loop
          />
        )}

        {currentPost.type === 'text' && (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 p-8">
            <p className="text-white text-2xl font-semibold text-center">{currentPost.content}</p>
          </div>
        )}

        {/* Caption Overlay */}
        {currentPost.caption && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <p className="text-white text-sm font-medium">{currentPost.caption}</p>
          </div>
        )}

        {/* Interaction Buttons */}
        <div className="absolute right-4 bottom-20 flex flex-col space-y-4">
          <button
            onClick={() => handleLike(currentPost.id)}
            className={`p-3 rounded-full transition ${
              status.liked ? 'bg-red-500 text-white' : 'bg-white/80 text-gray-800 hover:bg-white'
            }`}
            aria-label="Like"
          >
            <svg className="w-6 h-6" fill={status.liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span className="text-xs block mt-1">{currentPost.likeCount}</span>
          </button>

          <button
            onClick={() => handleRepost(currentPost.id)}
            className={`p-3 rounded-full transition ${
              status.reposted ? 'bg-green-500 text-white' : 'bg-white/80 text-gray-800 hover:bg-white'
            }`}
            aria-label="Repost"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-xs block mt-1">{currentPost.repostCount}</span>
          </button>

          <button
            onClick={() => handleShare(currentPost.id)}
            className="p-3 rounded-full bg-white/80 text-gray-800 hover:bg-white transition"
            aria-label="Share"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span className="text-xs block mt-1">{currentPost.shareCount}</span>
          </button>
        </div>

        {/* Post Counter */}
        <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
          {currentIndex + 1} / {posts.length}
        </div>

        {/* Swipe Hint */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white/70 text-xs">
          Swipe up/down to navigate
        </div>
      </div>

      {/* Engagement Stats */}
      <div className="mt-4 flex justify-center space-x-6 text-sm text-gray-600">
        <span>❤️ {currentPost.likeCount}</span>
        <span>💬 {currentPost.commentCount}</span>
        <span>🔄 {currentPost.repostCount}</span>
        <span>📤 {currentPost.shareCount}</span>
      </div>
    </div>
  )
}

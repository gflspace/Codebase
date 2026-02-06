// Hairstyle types
export interface Hairstyle {
  id: string
  name: string
  description?: string
  imageUrl?: string
  galleryUrls: string[]
  price?: number
  duration?: number
  tags: string[]
  featured: boolean
  published: boolean
  createdAt: string
  updatedAt: string
}

// Client types
export interface Client {
  id: string
  firstName: string
  lastName: string
  phone: string
  email?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

// Appointment types
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'

export interface Appointment {
  id: string
  clientId: string
  adminId?: string
  hairstyleName: string
  price: number
  startTime: string
  endTime: string
  duration: number
  status: AppointmentStatus
  notes?: string
  createdAt: string
  updatedAt: string
  client?: Client
}

// Time slot types
export type SlotStatus = 'open' | 'booked' | 'blocked' | 'not_available'

export interface TimeSlot {
  time: string
  status: SlotStatus
  appointment?: Appointment
}

export interface DayAvailability {
  date: string
  slots: TimeSlot[]
  isOpen: boolean
}

// Feed types
export type FeedPostType = 'image' | 'video' | 'text'

export interface FeedPost {
  id: string
  type: FeedPostType
  content?: string
  mediaUrl?: string
  thumbnailUrl?: string
  caption?: string
  postedBy?: string
  published: boolean
  engagementScore: number
  likeCount: number
  commentCount: number
  shareCount: number
  repostCount: number
  viewCount: number
  createdAt: string
  updatedAt: string
  isLiked?: boolean
  isReposted?: boolean
}

export interface PostComment {
  id: string
  postId: string
  parentId?: string
  sessionId: string
  content: string
  createdAt: string
  updatedAt: string
  replies?: PostComment[]
}

// Business hours
export interface BusinessHours {
  id: string
  dayOfWeek: number
  isOpen: boolean
  openTime?: string
  closeTime?: string
}

// Calendar block
export interface CalendarBlock {
  id: string
  date: string
  startTime?: string
  endTime?: string
  isBlocked: boolean
  reason?: string
  createdBy: string
  createdAt: string
}

// Revenue analytics
export interface RevenueAnalytics {
  totalRevenue: number
  count: number
  averageRevenue: number
  byService: {
    service: string
    revenue: number
    count: number
  }[]
  byClient: {
    clientId: string
    clientName: string
    revenue: number
    visits: number
  }[]
}

// Promotion types
export type PromotionStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'PAUSED'

export interface Promotion {
  id: string
  name: string
  description: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  startDate: string
  endDate: string
  status: PromotionStatus
  applicableServices: string[]
}

// Social media links
export interface SocialMediaLink {
  id: string
  platform: string
  url: string
  icon?: string
  order: number
  active: boolean
}

// Booking form data
export interface BookingFormData {
  date: Date | null
  timeSlot: TimeSlot | null
  hairstyle: Hairstyle | null
  clientInfo: {
    firstName: string
    lastName: string
    phone: string
    email?: string
    notes?: string
  } | null
}

// User and auth types
export type UserRole = 'ADMIN'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  role: UserRole
}

// API response types
export interface ApiResponse<T> {
  data: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

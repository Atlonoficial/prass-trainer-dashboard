// ============= UNIFIED MARKETING TYPES =============
// Fase 1: Unificação de Dados e Tipos

export interface UnifiedBanner {
  // Core fields
  id: string
  title: string
  description: string // Unified field (was 'message' in database)
  imageUrl: string | null
  
  // Status and visibility
  isActive: boolean
  startDate: string
  endDate: string
  
  // Action and targeting
  actionText: string | null
  actionUrl: string | null
  targetAudience: TargetAudience
  priority: number
  
  // Metadata
  createdBy: string
  createdAt: string
  updatedAt: string
  
  // Analytics (computed)
  analytics: BannerAnalytics
}

export interface BannerAnalytics {
  impressions: number
  clicks: number
  conversions: number
  uniqueUsers: number
  ctr: number
  
  // Trends (optional)
  trends?: {
    impressionsTrend: number
    clicksTrend: number
    ctrTrend: number
  }
}

export interface BannerInteraction {
  id: string
  bannerId: string
  userId: string
  interactionType: 'view' | 'click' | 'conversion'
  metadata: Record<string, any>
  createdAt: string
  
  // Context
  placement?: string
  userAgent?: string
  sessionId?: string
}

export type TargetAudience = 
  | 'todos' 
  | 'iniciantes' 
  | 'intermediarios' 
  | 'avancados'
  | 'usuarios-ativos'
  | 'usuarios-especificos'
  | 'usuarios-premium'
  | 'specific' // Para targeting específico por usuários

export interface MarketingMetrics {
  totalImpressions: number
  totalClicks: number
  totalConversions: number
  totalUniqueUsers: number
  averageCtr: number
  
  // Period comparison
  periodComparison?: {
    impressionsChange: number
    clicksChange: number
    ctrChange: number
  }
}

// Forms and UI interfaces
export interface CreateBannerForm {
  title: string
  description: string
  imageUrl?: string
  imageFile?: File | null
  actionText?: string
  actionUrl?: string
  targetAudience: TargetAudience
  startDate: string
  endDate: string
  priority?: number
}

export interface UpdateBannerForm extends Partial<CreateBannerForm> {
  id: string
}

// Database mapping interfaces
export interface BannerDbRow {
  id: string
  title: string
  message: string | null // Database field name
  image_url: string | null
  is_active: boolean
  start_date: string | null
  end_date: string | null
  action_text: string | null
  action_url: string | null
  target_users: string[] | null
  priority: number | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface BannerAnalyticsDbRow {
  id: string
  banner_id: string
  user_id: string
  date: string
  impressions: number
  clicks: number
  conversions: number
  created_at: string
  updated_at: string
}

// Utility types
export type BannerStatus = 'active' | 'inactive' | 'scheduled' | 'expired'

export interface BannerFilters {
  status?: BannerStatus
  targetAudience?: TargetAudience
  dateRange?: {
    start: string
    end: string
  }
  searchTerm?: string
}

export interface MarketingError {
  code: string
  message: string
  field?: string
  details?: any
}

// Analytics types
export interface AnalyticsDateRange {
  startDate?: string
  endDate?: string
}

export interface DetailedBannerAnalytics extends BannerAnalytics {
  bannerId: string
  bannerTitle: string
  dailyMetrics: Array<{
    date: string
    impressions: number
    clicks: number
    conversions: number
    ctr: number
  }>
  topPerformingDays: Array<{
    date: string
    metric: 'impressions' | 'clicks' | 'ctr'
    value: number
  }>
}
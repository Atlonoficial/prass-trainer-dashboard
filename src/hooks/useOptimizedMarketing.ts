// ============= OPTIMIZED MARKETING HOOK =============
// Fase 2: Performance Optimization com Cache Inteligente

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { 
  UnifiedBanner, 
  BannerDbRow, 
  BannerAnalytics,
  CreateBannerForm, 
  UpdateBannerForm,
  MarketingMetrics,
  BannerFilters,
  DetailedBannerAnalytics,
  AnalyticsDateRange,
  TargetAudience
} from '@/types/marketing'
import { MarketingService } from '@/services/marketingService'

// ============= CACHE KEYS =============
const CACHE_KEYS = {
  banners: (userId: string) => ['marketing', 'banners', userId],
  analytics: (userId: string, dateRange?: AnalyticsDateRange) => 
    ['marketing', 'analytics', userId, dateRange],
  metrics: (userId: string) => ['marketing', 'metrics', userId],
  interactions: (bannerId?: string) => ['marketing', 'interactions', bannerId],
} as const

// ============= HELPER FUNCTIONS =============
async function getBannerIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('banners')
    .select('id')
    .eq('created_by', userId)
  
  if (error) return []
  return data?.map(b => b.id) || []
}

// ============= DATA MAPPING =============
const mapDbRowToUnified = (row: BannerDbRow, analytics?: BannerAnalytics): UnifiedBanner => ({
  id: row.id,
  title: row.title || '',
  description: row.message || '', // FIXED: message -> description mapping
  imageUrl: row.image_url,
  isActive: !!row.is_active,
  startDate: row.start_date ? new Date(row.start_date).toISOString().slice(0, 16) : '',
  endDate: row.end_date ? new Date(row.end_date).toISOString().slice(0, 16) : '',
  actionText: row.action_text,
  actionUrl: row.action_url,
  targetAudience: mapTargetAudience(row.target_users),
  priority: row.priority || 0,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  analytics: analytics || {
    impressions: 0,
    clicks: 0,
    conversions: 0,
    uniqueUsers: 0,
    ctr: 0
  }
})

const mapTargetAudience = (targetUsers: string[] | null): TargetAudience => {
  if (!targetUsers || targetUsers.length === 0) return 'todos'
  
  // Real logic based on actual target users
  if (targetUsers.length > 50) return 'todos'
  if (targetUsers.length > 10) return 'usuarios-ativos'
  if (targetUsers.length > 1) return 'usuarios-especificos'
  return 'usuarios-premium'
}

// ============= MAIN HOOK =============
export function useOptimizedMarketing(filters?: BannerFilters) {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // ============= QUERIES =============
  
  // Banners with analytics
  const bannersQuery = useQuery({
    queryKey: CACHE_KEYS.banners(user?.id || ''),
    queryFn: async (): Promise<UnifiedBanner[]> => {
      if (!user) throw new Error('User not authenticated')

      // Fetch banners first
      const { data: bannersData, error } = await supabase
        .from('banners')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Then fetch analytics for each banner
      const bannersWithAnalytics = await Promise.all((bannersData || []).map(async (banner) => {
        try {
          const { data: analyticsData, error: analyticsError } = await supabase
            .from('banner_analytics')
            .select('impressions, clicks, conversions')
            .eq('banner_id', banner.id)

          if (analyticsError) {
            console.warn(`Analytics error for banner ${banner.id}:`, analyticsError)
            return mapDbRowToUnified(banner)
          }

          // Calculate analytics from banner_interactions directly for accuracy
          const { data: interactionsData, error: interactionsError } = await supabase
            .from('banner_interactions')
            .select('interaction_type, user_id')
            .eq('banner_id', banner.id)

          if (interactionsError) {
            console.warn(`Interactions error for banner ${banner.id}:`, interactionsError)
            return mapDbRowToUnified(banner)
          }

          const interactions = interactionsData || []
          const impressions = interactions.filter(i => i.interaction_type === 'view').length
          const clicks = interactions.filter(i => i.interaction_type === 'click').length  
          const conversions = interactions.filter(i => i.interaction_type === 'conversion').length
          const uniqueUsers = new Set(interactions.map(i => i.user_id)).size

          const analytics: BannerAnalytics = {
            impressions,
            clicks,
            conversions,
            uniqueUsers,
            ctr: 0
          }
          
          // Calculate CTR
          analytics.ctr = analytics.impressions > 0 
            ? (analytics.clicks / analytics.impressions) * 100 
            : 0

          return mapDbRowToUnified(banner, analytics)
        } catch (err) {
          console.warn(`Failed to fetch analytics for banner ${banner.id}:`, err)
          return mapDbRowToUnified(banner)
        }
      }))

      return bannersWithAnalytics
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  // Marketing metrics
  const metricsQuery = useQuery({
    queryKey: CACHE_KEYS.metrics(user?.id || ''),
    queryFn: async (): Promise<MarketingMetrics> => {
      if (!user) throw new Error('User not authenticated')

      // Calculate metrics from banners data since we don't have the RPC function yet
      const bannerIds = await getBannerIds(user.id)
      if (bannerIds.length === 0) {
        return {
          totalImpressions: 0,
          totalClicks: 0,
          totalConversions: 0,
          totalUniqueUsers: 0,
          averageCtr: 0
        }
      }

      // Query banner_interactions directly for accurate metrics  
      const { data: interactionsData, error } = await supabase
        .from('banner_interactions')
        .select('interaction_type, user_id, banner_id')
        .in('banner_id', bannerIds)

      if (error) throw error

      const interactions = interactionsData || []
      const totalImpressions = interactions.filter(i => i.interaction_type === 'view').length
      const totalClicks = interactions.filter(i => i.interaction_type === 'click').length
      const totalConversions = interactions.filter(i => i.interaction_type === 'conversion').length
      const totalUniqueUsers = new Set(interactions.map(i => i.user_id)).size
      const averageCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0

      return {
        totalImpressions,
        totalClicks,
        totalConversions,
        totalUniqueUsers,
        averageCtr
      }
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })

  // ============= MUTATIONS =============
  
  const createBannerMutation = useMutation({
    mutationFn: async (form: CreateBannerForm): Promise<UnifiedBanner> => {
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('banners')
        .insert([{
          title: form.title,
          message: form.description, // FIXED: description -> message for DB
          image_url: form.imageUrl || null,
          action_text: form.actionText || null,
          action_url: form.actionUrl || null,
          is_active: false, // Start inactive
          start_date: form.startDate ? new Date(form.startDate).toISOString() : null,
          end_date: form.endDate ? new Date(form.endDate).toISOString() : null,
          priority: form.priority || 0,
          created_by: user.id,
        }])
        .select()
        .single()

      if (error) throw error

      return mapDbRowToUnified(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.banners(user?.id || '') })
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.metrics(user?.id || '') })
      toast({ title: 'Sucesso', description: 'Banner criado com sucesso!' })
    },
    onError: (error) => {
      console.error('Create banner error:', error)
      toast({ 
        title: 'Erro', 
        description: 'Não foi possível criar o banner', 
        variant: 'destructive' 
      })
    }
  })

  const updateBannerMutation = useMutation({
    mutationFn: async (form: UpdateBannerForm): Promise<UnifiedBanner> => {
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('banners')
        .update({
          title: form.title,
          message: form.description, // FIXED: description -> message for DB
          image_url: form.imageUrl || null,
          action_text: form.actionText || null,
          action_url: form.actionUrl || null,
          start_date: form.startDate ? new Date(form.startDate).toISOString() : null,
          end_date: form.endDate ? new Date(form.endDate).toISOString() : null,
          priority: form.priority,
        })
        .eq('id', form.id)
        .eq('created_by', user.id) // Security check
        .select()
        .single()

      if (error) throw error

      return mapDbRowToUnified(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.banners(user?.id || '') })
      toast({ title: 'Salvo', description: 'Banner atualizado com sucesso!' })
    },
    onError: (error) => {
      console.error('Update banner error:', error)
      toast({ 
        title: 'Erro', 
        description: 'Não foi possível atualizar o banner', 
        variant: 'destructive' 
      })
    }
  })

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string, isActive: boolean }) => {
      if (!user) throw new Error('User not authenticated')

      const now = new Date().toISOString()
      
      // Prepare update payload based on action
      const updatePayload: any = { is_active: isActive }
      
      if (isActive) {
        // ATIVANDO: Define start_date para agora
        updatePayload.start_date = now
        console.log(`[toggleStatus] 🟢 ATIVANDO banner ${id} - start_date: ${now}`)
      } else {
        // DESATIVANDO: Define end_date para agora
        updatePayload.end_date = now
        console.log(`[toggleStatus] 🔴 DESATIVANDO banner ${id} - end_date: ${now}`)
      }

      const { error } = await supabase
        .from('banners')
        .update(updatePayload)
        .eq('id', id)
        .eq('created_by', user.id) // Security check

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.banners(user?.id || '') })
      toast({ title: 'Status alterado', description: 'Banner atualizado!' })
    },
    onError: (error) => {
      console.error('Toggle status error:', error)
      toast({ 
        title: 'Erro', 
        description: 'Não foi possível alterar o status', 
        variant: 'destructive' 
      })
    }
  })

  const deleteBannerMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('banners')
        .delete()
        .eq('id', id)
        .eq('created_by', user.id) // Security check

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.banners(user?.id || '') })
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.metrics(user?.id || '') })
      toast({ title: 'Excluído', description: 'Banner removido com sucesso!' })
    },
    onError: (error) => {
      console.error('Delete banner error:', error)
      toast({ 
        title: 'Erro', 
        description: 'Não foi possível excluir o banner', 
        variant: 'destructive' 
      })
    }
  })

  // ============= COMPUTED VALUES =============
  const filteredBanners = useMemo(() => {
    const banners = bannersQuery.data || []
    if (!filters) return banners

    return banners.filter(banner => {
      if (filters.status) {
        const status = getBannerStatus(banner)
        if (status !== filters.status) return false
      }

      if (filters.targetAudience && banner.targetAudience !== filters.targetAudience) {
        return false
      }

      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase()
        if (!banner.title.toLowerCase().includes(term) && 
            !banner.description.toLowerCase().includes(term)) {
          return false
        }
      }

      return true
    })
  }, [bannersQuery.data, filters])

  // ============= HELPER FUNCTIONS =============
  const getBannerStatus = (banner: UnifiedBanner) => {
    if (!banner.isActive) return 'inactive'
    
    const now = new Date()
    const start = new Date(banner.startDate)
    const end = new Date(banner.endDate)
    
    if (now < start) return 'scheduled'
    if (now > end) return 'expired'
    return 'active'
  }

  // ============= ANALYTICS FUNCTIONS =============
  const getBannerAnalytics = useCallback(async (
    bannerId: string, 
    dateRange?: AnalyticsDateRange
  ): Promise<DetailedBannerAnalytics | null> => {
    if (!user) return null

    // Since RPC function doesn't exist yet, return mock data
    const { data: analyticsData, error } = await supabase
      .from('banner_analytics')
      .select('*')
      .eq('banner_id', bannerId)

    if (error) {
      console.error('Analytics error:', error)
      return null
    }

    // Mock detailed analytics response
    return {
      bannerId,
      bannerTitle: 'Banner Analytics',
      impressions: analyticsData?.reduce((sum, row) => sum + (row.impressions || 0), 0) || 0,
      clicks: analyticsData?.reduce((sum, row) => sum + (row.clicks || 0), 0) || 0,
      conversions: analyticsData?.reduce((sum, row) => sum + (row.conversions || 0), 0) || 0,
      uniqueUsers: analyticsData?.length || 0,
      ctr: 0,
      dailyMetrics: [],
      topPerformingDays: []
    } as DetailedBannerAnalytics
  }, [user])

  // ============= REAL-TIME SUBSCRIPTIONS =============
  useEffect(() => {
    if (!user) return

    // Subscribe to banner changes for current user only
    const bannerSubscription = supabase
      .channel('banner-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'banners',
          filter: `created_by=eq.${user.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: CACHE_KEYS.banners(user.id) })
        }
      )
      .subscribe()

    // Subscribe to analytics changes
    const analyticsSubscription = supabase
      .channel('analytics-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'banner_analytics'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: CACHE_KEYS.analytics(user.id) })
          queryClient.invalidateQueries({ queryKey: CACHE_KEYS.metrics(user.id) })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(bannerSubscription)
      supabase.removeChannel(analyticsSubscription)
    }
  }, [user, queryClient])

  return {
    // Data
    banners: filteredBanners,
    metrics: metricsQuery.data,
    
    // Loading states
    loading: bannersQuery.isLoading || metricsQuery.isLoading,
    isCreating: createBannerMutation.isPending,
    isUpdating: updateBannerMutation.isPending,
    isDeleting: deleteBannerMutation.isPending,
    
    // Actions
    createBanner: createBannerMutation.mutate,
    updateBanner: updateBannerMutation.mutate,
    toggleStatus: (id: string, isActive: boolean) => 
      toggleStatusMutation.mutate({ id, isActive }),
    deleteBanner: deleteBannerMutation.mutate,
    
    // Analytics
    getBannerAnalytics,
    
    // Utilities
    getBannerStatus,
    refreshData: () => {
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.banners(user?.id || '') })
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.metrics(user?.id || '') })
    },
    
    // Service integration
    marketingService: MarketingService.getInstance()
  }
}
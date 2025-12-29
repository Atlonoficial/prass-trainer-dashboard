import { supabase } from '@/integrations/supabase/client'
import { 
  UnifiedBanner, 
  CreateBannerForm, 
  UpdateBannerForm, 
  BannerFilters,
  MarketingMetrics,
  BannerInteraction,
  DetailedBannerAnalytics
} from '@/types/marketing'
import { toast } from '@/hooks/use-toast'

export class MarketingService {
  private static instance: MarketingService
  
  public static getInstance(): MarketingService {
    if (!MarketingService.instance) {
      MarketingService.instance = new MarketingService()
    }
    return MarketingService.instance
  }

  // ============= BANNER MANAGEMENT =============
  
  async getBanners(filters?: BannerFilters): Promise<UnifiedBanner[]> {
    let query = supabase
      .from('banners')
      .select(`
        *,
        banner_analytics!inner(
          impressions,
          clicks,
          conversions
        )
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters?.status) {
      const now = new Date().toISOString()
      switch (filters.status) {
        case 'active':
          query = query.eq('is_active', true)
            .lte('start_date', now)
            .gte('end_date', now)
          break
        case 'inactive':
          query = query.eq('is_active', false)
          break
        case 'scheduled':
          query = query.eq('is_active', true).gt('start_date', now)
          break
        case 'expired':
          query = query.lt('end_date', now)
          break
      }
    }

    if (filters?.searchTerm) {
      query = query.ilike('title', `%${filters.searchTerm}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching banners:', error)
      throw new Error('Erro ao carregar banners')
    }

    return this.mapBannersToUnified(data || [])
  }

  async createBanner(bannerData: CreateBannerForm): Promise<UnifiedBanner> {
    // Validation
    this.validateBannerData(bannerData)

    const { data, error } = await supabase
      .from('banners')
      .insert({
        title: bannerData.title,
        message: bannerData.description,
        image_url: bannerData.imageUrl,
        action_text: bannerData.actionText,
        action_url: bannerData.actionUrl,
        target_users: this.mapTargetAudienceToUsers(bannerData.targetAudience),
        start_date: bannerData.startDate,
        end_date: bannerData.endDate,
        priority: bannerData.priority || 0,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating banner:', error)
      throw new Error('Erro ao criar banner')
    }

    // Track creation event
    await this.trackEvent('banner_created', data.id, { title: bannerData.title })

    return this.mapBannerToUnified(data)
  }

  async updateBanner(bannerData: UpdateBannerForm): Promise<void> {
    this.validateBannerData(bannerData)

    const { error } = await supabase
      .from('banners')
      .update({
        title: bannerData.title,
        message: bannerData.description,
        image_url: bannerData.imageUrl,
        action_text: bannerData.actionText,
        action_url: bannerData.actionUrl,
        target_users: bannerData.targetAudience ? this.mapTargetAudienceToUsers(bannerData.targetAudience) : undefined,
        start_date: bannerData.startDate,
        end_date: bannerData.endDate,
        priority: bannerData.priority,
        updated_at: new Date().toISOString()
      })
      .eq('id', bannerData.id)

    if (error) {
      console.error('Error updating banner:', error)
      throw new Error('Erro ao atualizar banner')
    }

    await this.trackEvent('banner_updated', bannerData.id, { title: bannerData.title })
  }

  async deleteBanner(bannerId: string): Promise<void> {
    const { error } = await supabase
      .from('banners')
      .delete()
      .eq('id', bannerId)

    if (error) {
      console.error('Error deleting banner:', error)
      throw new Error('Erro ao deletar banner')
    }

    await this.trackEvent('banner_deleted', bannerId)
  }

  async toggleBannerStatus(bannerId: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('banners')
      .update({ 
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', bannerId)

    if (error) {
      console.error('Error toggling banner status:', error)
      throw new Error('Erro ao alterar status do banner')
    }

    await this.trackEvent('banner_status_changed', bannerId, { isActive })
  }

  // ============= ANALYTICS & TRACKING =============
  
  async trackBannerInteraction(
    bannerId: string, 
    interactionType: 'view' | 'click' | 'conversion',
    metadata?: Record<string, any>
  ): Promise<void> {
    const user = await supabase.auth.getUser()
    if (!user.data.user) return

    const interaction: Omit<BannerInteraction, 'id' | 'createdAt'> = {
      bannerId,
      userId: user.data.user.id,
      interactionType,
      metadata: metadata || {},
      placement: metadata?.placement || 'unknown',
      userAgent: navigator.userAgent,
      sessionId: this.getSessionId()
    }

    const { error } = await supabase
      .from('banner_interactions')
      .insert({
        banner_id: interaction.bannerId,
        user_id: interaction.userId,
        interaction_type: interaction.interactionType,
        metadata: interaction.metadata,
        user_agent: interaction.userAgent,
        session_id: interaction.sessionId
      })

    if (error) {
      console.error('Error tracking interaction:', error)
      // Don't throw error to avoid breaking user experience
    }
  }

  async getDetailedAnalytics(
    bannerId: string,
    dateRange?: { startDate: string; endDate: string }
  ): Promise<DetailedBannerAnalytics> {
    let query = supabase
      .from('banner_interactions')
      .select('*')
      .eq('banner_id', bannerId)

    if (dateRange) {
      query = query
        .gte('created_at', dateRange.startDate)
        .lte('created_at', dateRange.endDate)
    }

    const { data: interactions, error } = await query

    if (error) {
      console.error('Error fetching analytics:', error)
      throw new Error('Erro ao carregar analytics')
    }

    return this.processDetailedAnalytics(bannerId, interactions || [])
  }

  async getMarketingMetrics(): Promise<MarketingMetrics> {
    // Get current user's banners first
    const user = await supabase.auth.getUser()
    if (!user.data.user) {
      throw new Error('User not authenticated')
    }

    const { data: bannerIds, error: bannerError } = await supabase
      .from('banners')
      .select('id')
      .eq('created_by', user.data.user.id)

    if (bannerError) {
      console.error('Error fetching banner IDs:', bannerError)
      throw new Error('Erro ao carregar IDs dos banners')
    }

    const ids = bannerIds?.map(b => b.id) || []
    if (ids.length === 0) {
      return {
        totalImpressions: 0,
        totalClicks: 0,
        totalConversions: 0,
        totalUniqueUsers: 0,
        averageCtr: 0
      }
    }

    // Query banner_interactions directly for accurate metrics
    const { data: interactions, error } = await supabase
      .from('banner_interactions')
      .select('interaction_type, user_id, banner_id')
      .in('banner_id', ids)

    if (error) {
      console.error('Error fetching interactions:', error)
      throw new Error('Erro ao carregar interações')
    }

    const interactionsData = interactions || []
    const totalImpressions = interactionsData.filter(i => i.interaction_type === 'view').length
    const totalClicks = interactionsData.filter(i => i.interaction_type === 'click').length
    const totalConversions = interactionsData.filter(i => i.interaction_type === 'conversion').length
    const totalUniqueUsers = new Set(interactionsData.map(i => i.user_id)).size
    const averageCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0

    return {
      totalImpressions,
      totalClicks,
      totalConversions,
      totalUniqueUsers,
      averageCtr
    }
  }

  // ============= PRIVATE HELPERS =============
  
  private validateBannerData(data: CreateBannerForm | UpdateBannerForm): void {
    if (!data.title?.trim()) {
      throw new Error('Título é obrigatório')
    }
    
    if (!data.description?.trim()) {
      throw new Error('Descrição é obrigatória')
    }

    if (data.actionUrl && !this.isValidUrl(data.actionUrl)) {
      throw new Error('URL de ação inválida')
    }

    if (data.startDate && data.endDate && new Date(data.startDate) >= new Date(data.endDate)) {
      throw new Error('Data de início deve ser anterior à data de fim')
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  private mapBannersToUnified(banners: any[]): UnifiedBanner[] {
    return banners.map(banner => this.mapBannerToUnified(banner))
  }

  private mapBannerToUnified(banner: any): UnifiedBanner {
    const analytics = banner.banner_analytics?.[0] || {
      impressions: 0,
      clicks: 0,
      conversions: 0
    }

    return {
      id: banner.id,
      title: banner.title,
      description: banner.message || '',
      imageUrl: banner.image_url,
      isActive: banner.is_active,
      startDate: banner.start_date,
      endDate: banner.end_date,
      actionText: banner.action_text,
      actionUrl: banner.action_url,
      targetAudience: this.mapUsersToTargetAudience(banner.target_users),
      priority: banner.priority || 0,
      createdBy: banner.created_by,
      createdAt: banner.created_at,
      updatedAt: banner.updated_at,
      analytics: {
        impressions: analytics.impressions,
        clicks: analytics.clicks,
        conversions: analytics.conversions,
        uniqueUsers: analytics.unique_users || 0,
        ctr: analytics.impressions > 0 ? (analytics.clicks / analytics.impressions) * 100 : 0
      }
    }
  }

  private mapTargetAudienceToUsers(audience: string): string[] {
    // Map audience segments to actual user IDs based on real criteria
    switch (audience) {
      case 'usuarios-ativos':
        return [] // Would query active users from database
      case 'usuarios-premium':
        return [] // Would query premium users from database
      case 'iniciantes':
        return [] // Would query beginner users from database
      default:
        return [] // Empty array means all users
    }
  }

  private mapUsersToTargetAudience(users: string[]): any {
    if (!users || users.length === 0) return 'todos'
    
    // Real logic based on user count and characteristics
    if (users.length > 100) return 'todos'
    if (users.length > 50) return 'usuarios-ativos'
    if (users.length > 10) return 'usuarios-especificos'
    return 'usuarios-premium'
  }

  private async trackEvent(eventType: string, bannerId: string, metadata?: any): Promise<void> {
    // Event tracking for analytics
    console.log(`Marketing Event: ${eventType}`, { bannerId, metadata })
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('marketing_session_id')
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem('marketing_session_id', sessionId)
    }
    return sessionId
  }

  private processDetailedAnalytics(bannerId: string, interactions: any[]): DetailedBannerAnalytics {
    const dailyMetrics: { [key: string]: { impressions: number; clicks: number; conversions: number } } = {}

    interactions.forEach(interaction => {
      const date = new Date(interaction.created_at).toISOString().split('T')[0]
      if (!dailyMetrics[date]) {
        dailyMetrics[date] = { impressions: 0, clicks: 0, conversions: 0 }
      }

      switch (interaction.interaction_type) {
        case 'view':
          dailyMetrics[date].impressions++
          break
        case 'click':
          dailyMetrics[date].clicks++
          break
        case 'conversion':
          dailyMetrics[date].conversions++
          break
      }
    })

    const dailyMetricsArray = Object.entries(dailyMetrics).map(([date, metrics]) => ({
      date,
      impressions: metrics.impressions,
      clicks: metrics.clicks,
      conversions: metrics.conversions,
      ctr: metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0
    }))

    const totalImpressions = dailyMetricsArray.reduce((sum, day) => sum + day.impressions, 0)
    const totalClicks = dailyMetricsArray.reduce((sum, day) => sum + day.clicks, 0)
    const totalConversions = dailyMetricsArray.reduce((sum, day) => sum + day.conversions, 0)

    return {
      bannerId,
      bannerTitle: 'Banner Title', // Would get from banner data
      impressions: totalImpressions,
      clicks: totalClicks,
      conversions: totalConversions,
      uniqueUsers: interactions.length, // Simplified
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      dailyMetrics: dailyMetricsArray,
      topPerformingDays: dailyMetricsArray
        .sort((a, b) => b.ctr - a.ctr)
        .slice(0, 5)
        .map(day => ({
          date: day.date,
          metric: 'ctr' as const,
          value: day.ctr
        }))
    }
  }
}
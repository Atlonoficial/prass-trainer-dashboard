import { supabase } from '@/integrations/supabase/client'

export interface AdvancedAnalyticsData {
  totalRevenue: number
  conversionRate: number
  customerLifetimeValue: number
  churnRate: number
  engagementScore: number
  roi: number
}

export interface TimeSeriesData {
  date: string
  impressions: number
  clicks: number
  conversions: number
  revenue: number
}

export class MarketingAnalyticsService {
  private static instance: MarketingAnalyticsService

  public static getInstance(): MarketingAnalyticsService {
    if (!MarketingAnalyticsService.instance) {
      MarketingAnalyticsService.instance = new MarketingAnalyticsService()
    }
    return MarketingAnalyticsService.instance
  }

  async getAdvancedAnalytics(): Promise<AdvancedAnalyticsData> {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    // Get user's banners
    const { data: banners } = await supabase
      .from('banners')
      .select('id')
      .eq('created_by', user.data.user.id)

    const bannerIds = banners?.map(b => b.id) || []
    if (bannerIds.length === 0) {
      return {
        totalRevenue: 0,
        conversionRate: 0,
        customerLifetimeValue: 0,
        churnRate: 0,
        engagementScore: 0,
        roi: 0
      }
    }

    // Get interactions for calculations
    const { data: interactions } = await supabase
      .from('banner_interactions')
      .select('interaction_type, metadata, created_at')
      .in('banner_id', bannerIds)
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())

    if (!interactions) {
      return {
        totalRevenue: 0,
        conversionRate: 0,
        customerLifetimeValue: 0,
        churnRate: 0,
        engagementScore: 0,
        roi: 0
      }
    }

    // Calculate metrics
    const views = interactions.filter(i => i.interaction_type === 'view').length
    const clicks = interactions.filter(i => i.interaction_type === 'click').length
    const conversions = interactions.filter(i => i.interaction_type === 'conversion').length

    const conversionRate = views > 0 ? (conversions / views) * 100 : 0
    
    // Simulate revenue based on conversions
    const avgRevenuePerConversion = 50 // Example value
    const totalRevenue = conversions * avgRevenuePerConversion

    // Calculate engagement score based on interaction variety
    const engagementScore = Math.min(100, 
      (clicks / Math.max(1, views)) * 50 + 
      (conversions / Math.max(1, clicks)) * 50
    )

    // Estimate CLV and churn
    const customerLifetimeValue = totalRevenue > 0 ? totalRevenue / Math.max(1, conversions) * 3 : 0
    const churnRate = Math.max(0, Math.min(25, 100 - engagementScore)) // Inverse correlation

    // Calculate ROI (simplified)
    const estimatedCost = bannerIds.length * 10 // Example cost per banner
    const roi = estimatedCost > 0 ? ((totalRevenue - estimatedCost) / estimatedCost) * 100 : 0

    return {
      totalRevenue,
      conversionRate,
      customerLifetimeValue,
      churnRate,
      engagementScore,
      roi
    }
  }

  async getTimeSeriesData(days: number = 30): Promise<TimeSeriesData[]> {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    const { data: banners } = await supabase
      .from('banners')
      .select('id')
      .eq('created_by', user.data.user.id)

    const bannerIds = banners?.map(b => b.id) || []
    if (bannerIds.length === 0) return []

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    
    const { data: interactions } = await supabase
      .from('banner_interactions')
      .select('interaction_type, created_at, conversion_value')
      .in('banner_id', bannerIds)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    if (!interactions) return []

    // Group by date
    const dataByDate: Record<string, TimeSeriesData> = {}
    
    interactions.forEach(interaction => {
      const date = new Date(interaction.created_at).toISOString().split('T')[0]
      
      if (!dataByDate[date]) {
        dataByDate[date] = {
          date,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0
        }
      }

      switch (interaction.interaction_type) {
        case 'view':
          dataByDate[date].impressions++
          break
        case 'click':
          dataByDate[date].clicks++
          break
        case 'conversion':
          dataByDate[date].conversions++
          dataByDate[date].revenue += interaction.conversion_value || 50
          break
      }
    })

    // Fill missing dates with zeros
    const result: TimeSeriesData[] = []
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0]
      
      result.push(dataByDate[date] || {
        date,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        revenue: 0
      })
    }

    return result
  }

  async getCampaignPerformance() {
    const user = await supabase.auth.getUser()
    if (!user.data.user) return []

    const { data: campaigns } = await supabase
      .from('marketing_campaigns')
      .select('*')
      .eq('created_by', user.data.user.id)
      .eq('status', 'active')

    return campaigns?.map(campaign => ({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      executionCount: campaign.execution_count || 0,
      lastExecution: campaign.last_execution,
      performanceMetrics: campaign.performance_metrics || {}
    })) || []
  }
}
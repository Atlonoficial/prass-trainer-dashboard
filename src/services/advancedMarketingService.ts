import { supabase } from '@/integrations/supabase/client';

export interface MarketingCampaign {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  campaign_type: 'automated' | 'scheduled' | 'triggered';
  triggers: any[];
  banner_template: any;
  target_segments: any[];
  schedule_config?: any;
  start_date?: string;
  end_date?: string;
  execution_count: number;
  last_execution?: string;
  performance_metrics: any;
  created_at: string;
  updated_at: string;
}

export interface MarketingSegment {
  id: string;
  name: string;
  description?: string;
  segment_type: 'behavioral' | 'demographic' | 'engagement' | 'custom';
  criteria: any;
  user_count: number;
  last_calculated?: string;
  is_dynamic: boolean;
  created_at: string;
  updated_at: string;
}

export interface ABTest {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'running' | 'completed' | 'paused';
  variant_a: any;
  variant_b: any;
  traffic_split: number;
  success_metric: string;
  confidence_level: number;
  sample_size?: number;
  start_date?: string;
  end_date?: string;
  results?: any;
  winner_variant?: 'a' | 'b' | 'inconclusive';
  statistical_significance?: number;
  created_at: string;
  updated_at: string;
}

export interface MarketingInsight {
  id: string;
  insight_type: 'recommendation' | 'trend' | 'anomaly' | 'optimization';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  data: any;
  actions?: any;
  is_actionable: boolean;
  is_dismissed: boolean;
  expires_at?: string;
  created_at: string;
}

class AdvancedMarketingService {
  private static instance: AdvancedMarketingService;

  static getInstance(): AdvancedMarketingService {
    if (!AdvancedMarketingService.instance) {
      AdvancedMarketingService.instance = new AdvancedMarketingService();
    }
    return AdvancedMarketingService.instance;
  }

  // ========== CAMPANHAS AUTOMATIZADAS ==========
  async getCampaigns(): Promise<MarketingCampaign[]> {
    const { data, error } = await supabase
      .from('marketing_campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as MarketingCampaign[];
  }

  async createCampaign(campaign: Omit<MarketingCampaign, 'id' | 'created_at' | 'updated_at' | 'execution_count'>): Promise<MarketingCampaign> {
    const { data, error } = await supabase
      .from('marketing_campaigns')
      .insert([{
        ...campaign,
        created_by: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();

    if (error) throw error;
    return data as MarketingCampaign;
  }

  async updateCampaign(id: string, updates: Partial<MarketingCampaign>): Promise<MarketingCampaign> {
    const { data, error } = await supabase
      .from('marketing_campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as MarketingCampaign;
  }

  async executeCampaign(id: string): Promise<any> {
    const { data, error } = await supabase.rpc('execute_marketing_campaign', {
      p_campaign_id: id
    });

    if (error) throw error;
    return data;
  }

  // ========== SEGMENTAÇÃO INTELIGENTE ==========
  async getSegments(): Promise<MarketingSegment[]> {
    const { data, error } = await supabase
      .from('marketing_segments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as MarketingSegment[];
  }

  async createSegment(segment: Omit<MarketingSegment, 'id' | 'created_at' | 'updated_at' | 'user_count' | 'last_calculated'>): Promise<MarketingSegment> {
    const { data, error } = await supabase
      .from('marketing_segments')
      .insert([{
        ...segment,
        created_by: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();

    if (error) throw error;
    return data as MarketingSegment;
  }

  async calculateSegmentSize(segmentId: string, criteria: any): Promise<number> {
    const { data, error } = await supabase.rpc('calculate_user_segment_membership', {
      p_segment_id: segmentId,
      p_criteria: criteria
    });

    if (error) throw error;
    return data || 0;
  }

  async getEngagementSegments(): Promise<MarketingSegment[]> {
    // Criar segmentos pré-definidos baseados em engajamento real
    const engagementSegments: Partial<MarketingSegment>[] = [
      {
        name: 'Usuários Altamente Engajados',
        segment_type: 'engagement',
        criteria: { type: 'engagement_high', value: { interactions: 10, period: '30_days' } },
        description: 'Usuários com 10+ interações nos últimos 30 dias'
      },
      {
        name: 'Usuários Pouco Engajados',
        segment_type: 'engagement',
        criteria: { type: 'engagement_low', value: { interactions: 2, period: '30_days' } },
        description: 'Usuários com 2 ou menos interações nos últimos 30 dias'
      },
      {
        name: 'Novos Usuários',
        segment_type: 'demographic',
        criteria: { type: 'recent_signup', value: { days: 7 } },
        description: 'Usuários cadastrados nos últimos 7 dias'
      },
      {
        name: 'Usuários Inativos',
        segment_type: 'behavioral',
        criteria: { type: 'inactive_users', value: { days: 14 } },
        description: 'Usuários sem interação nos últimos 14 dias'
      }
    ];

    // Calcular tamanho de cada segmento
    const segments = await Promise.all(
      engagementSegments.map(async (segment, index) => {
        const user_count = await this.calculateSegmentSize(`temp-${index}`, segment.criteria);
        return {
          id: `segment-${index}`,
          user_count,
          last_calculated: new Date().toISOString(),
          is_dynamic: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...segment
        } as MarketingSegment;
      })
    );

    return segments;
  }

  // ========== TESTES A/B ==========
  async getABTests(): Promise<ABTest[]> {
    const { data, error } = await supabase
      .from('ab_tests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as ABTest[];
  }

  async createABTest(test: Omit<ABTest, 'id' | 'created_at' | 'updated_at'>): Promise<ABTest> {
    const { data, error } = await supabase
      .from('ab_tests')
      .insert([{
        ...test,
        created_by: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();

    if (error) throw error;
    return data as ABTest;
  }

  async updateABTest(id: string, updates: Partial<ABTest>): Promise<ABTest> {
    const { data, error } = await supabase
      .from('ab_tests')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as ABTest;
  }

  // ========== INSIGHTS INTELIGENTES ==========
  async getInsights(): Promise<MarketingInsight[]> {
    const { data, error } = await supabase
      .from('marketing_insights')
      .select('*')
      .eq('is_dismissed', false)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as MarketingInsight[];
  }

  async generateRealTimeInsights(): Promise<MarketingInsight[]> {
    try {
      // Buscar dados reais para gerar insights
      const [interactions, banners] = await Promise.all([
        supabase
          .from('banner_interactions')
          .select('*')
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        supabase
          .from('banners')
          .select('*')
          .eq('is_active', true)
      ]);

      const insights: Partial<MarketingInsight>[] = [];

      // Análise de CTR baixo
      if (banners.data && interactions.data) {
        const bannersWithLowCTR = banners.data.filter(banner => {
          const bannerInteractions = interactions.data.filter(i => i.banner_id === banner.id);
          const views = bannerInteractions.filter(i => i.interaction_type === 'view').length;
          const clicks = bannerInteractions.filter(i => i.interaction_type === 'click').length;
          const ctr = views > 0 ? (clicks / views) * 100 : 0;
          return ctr < 2 && views > 10; // CTR menor que 2% com pelo menos 10 visualizações
        });

        if (bannersWithLowCTR.length > 0) {
          insights.push({
            insight_type: 'optimization',
            title: `${bannersWithLowCTR.length} banner(s) com CTR baixo`,
            description: 'Banners com CTR abaixo de 2% podem precisar de otimização',
            priority: 'high',
            data: { banners: bannersWithLowCTR.map(b => b.id) },
            actions: { suggest_ab_test: true, review_content: true },
            is_actionable: true
          });
        }
      }

      // Análise de horário de pico
      if (interactions.data && interactions.data.length > 0) {
        const hourlyStats: Record<number, number> = {};
        interactions.data.forEach(interaction => {
          const hour = new Date(interaction.created_at).getHours();
          hourlyStats[hour] = (hourlyStats[hour] || 0) + 1;
        });

        const peakHour = Object.entries(hourlyStats)
          .sort(([,a], [,b]) => (b as number) - (a as number))[0];

        if (peakHour) {
          insights.push({
            insight_type: 'trend',
            title: `Pico de engajamento às ${peakHour[0]}h`,
            description: `${peakHour[1]} interações registradas neste horário`,
            priority: 'medium',
            data: { peak_hour: peakHour[0], interactions: peakHour[1] },
            actions: { schedule_campaigns: true },
            is_actionable: true
          });
        }
      }

      // Recomendação de segmentação
      if (interactions.data && interactions.data.length > 5) {
        const uniqueUsers = new Set(interactions.data.map(i => i.user_id)).size;
        const totalInteractions = interactions.data.length;
        const avgInteractionsPerUser = totalInteractions / uniqueUsers;

        if (avgInteractionsPerUser > 3) {
          insights.push({
            insight_type: 'recommendation',
            title: 'Oportunidade de segmentação',
            description: `Usuários ativos têm ${avgInteractionsPerUser.toFixed(1)} interações em média`,
            priority: 'medium',
            data: { avg_interactions: avgInteractionsPerUser, unique_users: uniqueUsers },
            actions: { create_engagement_segments: true },
            is_actionable: true
          });
        }
      }

      return insights.map((insight, index) => ({
        id: `insight-${Date.now()}-${index}`,
        created_at: new Date().toISOString(),
        is_dismissed: false,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        ...insight
      })) as MarketingInsight[];

    } catch (error) {
      console.error('Erro ao gerar insights:', error);
      return [];
    }
  }

  async dismissInsight(id: string): Promise<void> {
    const { error } = await supabase
      .from('marketing_insights')
      .update({ is_dismissed: true })
      .eq('id', id);

    if (error) throw error;
  }

  // ========== ANALYTICS HISTÓRICOS REAIS ==========
  async getHistoricalAnalytics(days: number = 7): Promise<any> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: interactions, error } = await supabase
      .from('banner_interactions')
      .select('*')
      .gte('created_at', startDate)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Agrupar por dia
    const dailyStats: Record<string, { views: number; clicks: number; conversions: number }> = {};
    interactions?.forEach(interaction => {
      const day = new Date(interaction.created_at).toISOString().split('T')[0];
      if (!dailyStats[day]) {
        dailyStats[day] = { views: 0, clicks: 0, conversions: 0 };
      }
      const statType = interaction.interaction_type === 'view' ? 'views' : 
                      interaction.interaction_type === 'click' ? 'clicks' : 'conversions';
      dailyStats[day][statType]++;
    });

    return Object.entries(dailyStats).map(([date, stats]) => ({
      date,
      ...stats,
      ctr: stats.views > 0 ? (stats.clicks / stats.views) * 100 : 0
    }));
  }

  // ========== PERFORMANCE OTIMIZADA ==========
  async getOptimizedPerformanceMetrics(): Promise<any> {
    const { data, error } = await supabase
      .from('banner_interactions')
      .select(`
        banner_id,
        interaction_type,
        created_at,
        user_id,
        banners(title, type)
      `)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;

    interface MetricData {
      banner_title: string;
      banner_type: string;
      impressions: number;
      clicks: number;
      conversions: number;
      unique_users: Set<string>;
    }

    const metrics: Record<string, MetricData> = {};
    data?.forEach(interaction => {
      const bannerId = interaction.banner_id;
      if (!metrics[bannerId]) {
        metrics[bannerId] = {
          banner_title: (interaction.banners as any)?.title || 'Banner sem título',
          banner_type: (interaction.banners as any)?.type || 'unknown',
          impressions: 0,
          clicks: 0,
          conversions: 0,
          unique_users: new Set()
        };
      }

      if (interaction.interaction_type === 'view') metrics[bannerId].impressions++;
      if (interaction.interaction_type === 'click') metrics[bannerId].clicks++;
      if (interaction.interaction_type === 'conversion') metrics[bannerId].conversions++;
      metrics[bannerId].unique_users.add(interaction.user_id);
    });

    return Object.entries(metrics).map(([bannerId, stats]) => ({
      banner_id: bannerId,
      banner_title: stats.banner_title,
      banner_type: stats.banner_type,
      impressions: stats.impressions,
      clicks: stats.clicks,
      conversions: stats.conversions,
      unique_users: stats.unique_users.size,
      ctr: stats.impressions > 0 ? (stats.clicks / stats.impressions) * 100 : 0,
      conversion_rate: stats.clicks > 0 ? (stats.conversions / stats.clicks) * 100 : 0
    }));
  }
}

export const advancedMarketingService = AdvancedMarketingService.getInstance();
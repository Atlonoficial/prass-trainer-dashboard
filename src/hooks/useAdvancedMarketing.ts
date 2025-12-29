import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { advancedMarketingService, MarketingCampaign, MarketingSegment, ABTest, MarketingInsight } from '@/services/advancedMarketingService';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeSubscription } from '@/services/realtimeManager';

const CACHE_KEYS = {
  CAMPAIGNS: 'marketing-campaigns',
  SEGMENTS: 'marketing-segments',
  AB_TESTS: 'ab-tests',
  INSIGHTS: 'marketing-insights',
  HISTORICAL_ANALYTICS: 'historical-analytics',
  PERFORMANCE_METRICS: 'performance-metrics'
};

export const useAdvancedMarketing = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [analyticsDays, setAnalyticsDays] = useState(30);

  // ========== CAMPANHAS ==========
  const campaignsQuery = useQuery({
    queryKey: [CACHE_KEYS.CAMPAIGNS],
    queryFn: () => advancedMarketingService.getCampaigns(),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const createCampaignMutation = useMutation({
    mutationFn: (campaign: Omit<MarketingCampaign, 'id' | 'created_at' | 'updated_at' | 'execution_count'>) =>
      advancedMarketingService.createCampaign(campaign),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.CAMPAIGNS] });
      toast({
        title: "Campanha criada",
        description: "Campanha de marketing criada com sucesso!",
      });
    },
    onError: (error) => {
      console.error('Erro ao criar campanha:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a campanha",
        variant: "destructive",
      });
    },
  });

  const updateCampaignMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<MarketingCampaign> }) =>
      advancedMarketingService.updateCampaign(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.CAMPAIGNS] });
      toast({
        title: "Campanha atualizada",
        description: "Campanha atualizada com sucesso!",
      });
    },
    onError: (error) => {
      console.error('Erro ao atualizar campanha:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a campanha",
        variant: "destructive",
      });
    },
  });

  const executeCampaignMutation = useMutation({
    mutationFn: (id: string) => advancedMarketingService.executeCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.CAMPAIGNS] });
      toast({
        title: "Campanha executada",
        description: "Campanha executada com sucesso!",
      });
    },
    onError: (error) => {
      console.error('Erro ao executar campanha:', error);
      toast({
        title: "Erro",
        description: "Não foi possível executar a campanha",
        variant: "destructive",
      });
    },
  });

  // ========== SEGMENTAÇÃO ==========
  const segmentsQuery = useQuery({
    queryKey: [CACHE_KEYS.SEGMENTS],
    queryFn: () => advancedMarketingService.getSegments(),
    staleTime: 10 * 60 * 1000, // 10 minutos
  });

  const engagementSegmentsQuery = useQuery({
    queryKey: [CACHE_KEYS.SEGMENTS, 'engagement'],
    queryFn: () => advancedMarketingService.getEngagementSegments(),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const createSegmentMutation = useMutation({
    mutationFn: (segment: Omit<MarketingSegment, 'id' | 'created_at' | 'updated_at' | 'user_count' | 'last_calculated'>) =>
      advancedMarketingService.createSegment(segment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.SEGMENTS] });
      toast({
        title: "Segmento criado",
        description: "Segmento criado com sucesso!",
      });
    },
    onError: (error) => {
      console.error('Erro ao criar segmento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o segmento",
        variant: "destructive",
      });
    },
  });

  // ========== TESTES A/B ==========
  const abTestsQuery = useQuery({
    queryKey: [CACHE_KEYS.AB_TESTS],
    queryFn: () => advancedMarketingService.getABTests(),
    staleTime: 5 * 60 * 1000,
  });

  const createABTestMutation = useMutation({
    mutationFn: (test: Omit<ABTest, 'id' | 'created_at' | 'updated_at'>) =>
      advancedMarketingService.createABTest(test),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.AB_TESTS] });
      toast({
        title: "Teste A/B criado",
        description: "Teste A/B criado com sucesso!",
      });
    },
    onError: (error) => {
      console.error('Erro ao criar teste A/B:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o teste A/B",
        variant: "destructive",
      });
    },
  });

  const updateABTestMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ABTest> }) =>
      advancedMarketingService.updateABTest(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.AB_TESTS] });
      toast({
        title: "Teste A/B atualizado",
        description: "Teste A/B atualizado com sucesso!",
      });
    },
    onError: (error) => {
      console.error('Erro ao atualizar teste A/B:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o teste A/B",
        variant: "destructive",
      });
    },
  });

  // ========== INSIGHTS ==========
  const insightsQuery = useQuery({
    queryKey: [CACHE_KEYS.INSIGHTS],
    queryFn: () => advancedMarketingService.getInsights(),
    staleTime: 2 * 60 * 1000, // 2 minutos
  });

  const realTimeInsightsQuery = useQuery({
    queryKey: [CACHE_KEYS.INSIGHTS, 'realtime'],
    queryFn: () => advancedMarketingService.generateRealTimeInsights(),
    staleTime: 5 * 60 * 1000, // 5 minutos (sem polling!)
  });

  const dismissInsightMutation = useMutation({
    mutationFn: (id: string) => advancedMarketingService.dismissInsight(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.INSIGHTS] });
    },
    onError: (error) => {
      console.error('Erro ao dispensar insight:', error);
    },
  });

  // ========== ANALYTICS ==========
  const historicalAnalyticsQuery = useQuery({
    queryKey: [CACHE_KEYS.HISTORICAL_ANALYTICS, analyticsDays],
    queryFn: () => advancedMarketingService.getHistoricalAnalytics(analyticsDays),
    staleTime: 10 * 60 * 1000, // 10 minutos
  });

  const performanceMetricsQuery = useQuery({
    queryKey: [CACHE_KEYS.PERFORMANCE_METRICS],
    queryFn: () => advancedMarketingService.getOptimizedPerformanceMetrics(),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // ========== REALTIME SUBSCRIPTIONS (Substituindo Polling) ==========
  // Invalidar cache de insights quando houver mudanças em banner_interactions
  useRealtimeSubscription(
    'banner_interactions',
    '*',
    () => {
      console.log('🔔 [MARKETING] Banner interaction detectada, atualizando insights...');
      queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.INSIGHTS, 'realtime'] });
      queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.PERFORMANCE_METRICS] });
    }
  );

  // Invalidar cache quando houver mudanças em banners
  useRealtimeSubscription(
    'banners',
    '*',
    () => {
      console.log('🔔 [MARKETING] Banner modificado, atualizando dados...');
      queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.CAMPAIGNS] });
      queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.INSIGHTS] });
    }
  );

  // Invalidar cache quando houver mudanças em ab_tests
  useRealtimeSubscription(
    'ab_tests',
    '*',
    () => {
      console.log('🔔 [MARKETING] A/B Test modificado, atualizando dados...');
      queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.AB_TESTS] });
    }
  );

  // ========== FUNÇÕES AUXILIARES ==========
  const refreshAllData = () => {
    queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.CAMPAIGNS] });
    queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.SEGMENTS] });
    queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.AB_TESTS] });
    queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.INSIGHTS] });
    queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.HISTORICAL_ANALYTICS] });
    queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.PERFORMANCE_METRICS] });
  };

  return {
    // Data
    campaigns: campaignsQuery.data || [],
    segments: segmentsQuery.data || [],
    engagementSegments: engagementSegmentsQuery.data || [],
    abTests: abTestsQuery.data || [],
    insights: insightsQuery.data || [],
    realTimeInsights: realTimeInsightsQuery.data || [],
    historicalAnalytics: historicalAnalyticsQuery.data || [],
    performanceMetrics: performanceMetricsQuery.data || [],

    // Loading states
    isLoadingCampaigns: campaignsQuery.isLoading,
    isLoadingSegments: segmentsQuery.isLoading,
    isLoadingABTests: abTestsQuery.isLoading,
    isLoadingInsights: insightsQuery.isLoading,
    isLoadingAnalytics: historicalAnalyticsQuery.isLoading,

    // Mutations
    createCampaign: createCampaignMutation.mutate,
    updateCampaign: updateCampaignMutation.mutate,
    executeCampaign: executeCampaignMutation.mutate,
    createSegment: createSegmentMutation.mutate,
    createABTest: createABTestMutation.mutate,
    updateABTest: updateABTestMutation.mutate,
    dismissInsight: dismissInsightMutation.mutate,

    // Loading states for mutations
    isCreatingCampaign: createCampaignMutation.isPending,
    isUpdatingCampaign: updateCampaignMutation.isPending,
    isExecutingCampaign: executeCampaignMutation.isPending,
    isCreatingSegment: createSegmentMutation.isPending,
    isCreatingABTest: createABTestMutation.isPending,
    isUpdatingABTest: updateABTestMutation.isPending,

    // Utilities
    refreshAllData,
    
    // Period control
    analyticsDays,
    setAnalyticsDays,
  };
};
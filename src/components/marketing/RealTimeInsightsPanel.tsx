import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAdvancedMarketing } from '@/hooks/useAdvancedMarketing';
import { MarketingInsight } from '@/services/advancedMarketingService';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Lightbulb, 
  Clock,
  Users,
  Target,
  BarChart3,
  X
} from 'lucide-react';

interface RealTimeInsightsPanelProps {
  className?: string;
}

export const RealTimeInsightsPanel = ({ className }: RealTimeInsightsPanelProps) => {
  const { realTimeInsights, dismissInsight, isLoadingInsights } = useAdvancedMarketing();

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'recommendation':
        return <Lightbulb className="h-5 w-5" />;
      case 'trend':
        return <TrendingUp className="h-5 w-5" />;
      case 'anomaly':
        return <AlertTriangle className="h-5 w-5" />;
      case 'optimization':
        return <Target className="h-5 w-5" />;
      default:
        return <BarChart3 className="h-5 w-5" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'recommendation':
        return 'text-blue-600';
      case 'trend':
        return 'text-green-600';
      case 'anomaly':
        return 'text-red-600';
      case 'optimization':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  if (isLoadingInsights) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Insights em Tempo Real
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (realTimeInsights.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Insights em Tempo Real
          </CardTitle>
          <CardDescription>
            Análises inteligentes baseadas em dados atuais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum insight disponível no momento</p>
            <p className="text-sm">Continue usando o sistema para gerar insights</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Insights em Tempo Real
        </CardTitle>
        <CardDescription>
          Análises inteligentes baseadas em dados atuais ({realTimeInsights.length} insights)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {realTimeInsights.map((insight: MarketingInsight) => (
            <div
              key={insight.id}
              className="relative p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`mt-0.5 ${getInsightColor(insight.insight_type)}`}>
                    {getInsightIcon(insight.insight_type)}
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{insight.title}</h4>
                      <Badge variant={getPriorityColor(insight.priority) as any}>
                        {insight.priority}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      {insight.description}
                    </p>

                    {/* Dados específicos do insight */}
                    {insight.data && (
                      <div className="flex flex-wrap gap-2 text-xs">
                        {insight.data.peak_hour && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {insight.data.peak_hour}h
                          </Badge>
                        )}
                        {insight.data.unique_users && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {insight.data.unique_users} usuários
                          </Badge>
                        )}
                        {insight.data.avg_interactions && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {insight.data.avg_interactions.toFixed(1)} interações/usuário
                          </Badge>
                        )}
                        {insight.data.banners && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            {insight.data.banners.length} banner(s)
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Ações recomendadas */}
                    {insight.is_actionable && insight.actions && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {insight.actions.suggest_ab_test && (
                          <Button size="sm" variant="outline">
                            Criar Teste A/B
                          </Button>
                        )}
                        {insight.actions.review_content && (
                          <Button size="sm" variant="outline">
                            Revisar Conteúdo
                          </Button>
                        )}
                        {insight.actions.schedule_campaigns && (
                          <Button size="sm" variant="outline">
                            Agendar Campanhas
                          </Button>
                        )}
                        {insight.actions.create_engagement_segments && (
                          <Button size="sm" variant="outline">
                            Criar Segmentos
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Timestamp */}
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(insight.created_at).toLocaleString('pt-BR')}
                    </div>
                  </div>
                </div>

                {/* Botão de dispensar */}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => dismissInsight(insight.id)}
                  className="shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
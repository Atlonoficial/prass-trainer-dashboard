import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, TrendingUp, Users, Clock, Target, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, CartesianGrid, Tooltip } from 'recharts';
import { useNotificationAnalytics } from '@/hooks/useNotificationAnalytics';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface NotificationAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationAnalyticsModal({ isOpen, onClose }: NotificationAnalyticsModalProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  
  const { 
    analytics, 
    segmentPerformance, 
    timeAnalytics, 
    campaignAnalytics,
    getBestSendingHours,
    getTopPerformingSegments,
    getEngagementTrend,
    getInsights,
    loading,
    setDateRangeDays 
  } = useNotificationAnalytics();

  const handlePeriodChange = (value: string) => {
    const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '6m': 180 };
    setDateRangeDays(daysMap[value]);
    setSelectedPeriod(value);
  };

  if (!isOpen) return null;

  const insights = getInsights();
  const bestHours = getBestSendingHours();
  const topSegments = getTopPerformingSegments();
  const engagementTrend = getEngagementTrend();

  const COLORS = ['hsl(var(--primary))', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'info': return <Info className="w-4 h-4 text-blue-500" />;
      default: return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
        <Card className="bg-card border-border p-8">
          <LoadingSpinner />
          <p className="text-center mt-4 text-muted-foreground">Carregando analytics...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="bg-card border-border w-full max-w-6xl max-h-[95vh] overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Analytics Avançados</h2>
              <p className="text-sm text-muted-foreground">Insights detalhados sobre suas notificações</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="6m">Últimos 6 meses</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(95vh-140px)]">
          <div className="p-6">
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="segments">Segmentos</TabsTrigger>
                <TabsTrigger value="timing">Horários</TabsTrigger>
                <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* Métricas Principais */}
                {analytics && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Taxa de Entrega</p>
                          <p className="text-2xl font-bold text-foreground">{analytics.deliveryRate.toFixed(1)}%</p>
                        </div>
                        <Users className="w-8 h-8 text-blue-500" />
                      </div>
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Taxa de Abertura</p>
                          <p className="text-2xl font-bold text-foreground">{analytics.openRate.toFixed(1)}%</p>
                        </div>
                        <Target className="w-8 h-8 text-green-500" />
                      </div>
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Taxa de Clique</p>
                          <p className="text-2xl font-bold text-foreground">{analytics.clickRate.toFixed(1)}%</p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-primary" />
                      </div>
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Score de Engajamento</p>
                          <p className="text-2xl font-bold text-foreground">{analytics.engagementScore.toFixed(1)}</p>
                        </div>
                        <Clock className="w-8 h-8 text-yellow-500" />
                      </div>
                    </Card>
                  </div>
                )}

                {/* Insights Inteligentes */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Insights Inteligentes</h3>
                  <div className="space-y-3">
                    {insights.map((insight, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-muted/30 rounded-lg">
                        {getInsightIcon(insight.type)}
                        <div>
                          <h4 className="font-medium text-foreground">{insight.title}</h4>
                          <p className="text-sm text-muted-foreground">{insight.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Tendência de Engajamento */}
                {engagementTrend.length > 0 && (
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Tendência de Engajamento (7 dias)</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={engagementTrend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" className="text-muted-foreground" />
                          <YAxis className="text-muted-foreground" />
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="openRate" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={2}
                            name="Taxa de Abertura (%)"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="clickRate" 
                            stroke="#22c55e" 
                            strokeWidth={2}
                            name="Taxa de Clique (%)"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="segments" className="space-y-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Performance por Segmento</h3>
                  
                  {/* Top Performing Segments */}
                  <div className="mb-6">
                    <h4 className="font-medium text-foreground mb-3">Segmentos Mais Engajados</h4>
                    <div className="space-y-2">
                      {topSegments.map((segment, index) => (
                        <div key={segment.segment} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Badge className="w-6 h-6 rounded-full flex items-center justify-center text-xs p-0">
                              {index + 1}
                            </Badge>
                            <span className="font-medium text-foreground">{segment.segment}</span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span>{segment.sent} enviadas</span>
                            <span>{segment.opened} abertas</span>
                            <Badge 
                              className={`${
                                segment.engagement === 'Alto' ? 'bg-green-500/10 text-green-500' :
                                segment.engagement === 'Médio' ? 'bg-yellow-500/10 text-yellow-500' :
                                'bg-red-500/10 text-red-500'
                              }`}
                            >
                              {segment.openRate.toFixed(1)}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Gráfico de Pizza */}
                  {segmentPerformance.length > 0 && (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={segmentPerformance.slice(0, 5)}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ segment, openRate }) => `${segment}: ${openRate.toFixed(1)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="opened"
                          >
                            {segmentPerformance.slice(0, 5).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="timing" className="space-y-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Análise de Horários</h3>
                  
                  {/* Melhores Horários */}
                  <div className="mb-6">
                    <h4 className="font-medium text-foreground mb-3">Melhores Horários para Envio</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {bestHours.map((hour, index) => (
                        <Card key={hour.hour} className="p-4 text-center">
                          <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mx-auto mb-2">
                            <Clock className="w-6 h-6 text-primary" />
                          </div>
                          <p className="text-lg font-bold text-foreground">{hour.hour}h</p>
                          <p className="text-sm text-muted-foreground">{hour.openRate.toFixed(1)}% abertura</p>
                          <p className="text-xs text-muted-foreground">{hour.sent} enviadas</p>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Gráfico de Barras por Horário */}
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={timeAnalytics.filter(t => t.sent > 0)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="hour" className="text-muted-foreground" />
                        <YAxis className="text-muted-foreground" />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar dataKey="openRate" fill="hsl(var(--primary))" name="Taxa de Abertura (%)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="campaigns" className="space-y-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Performance das Campanhas</h3>
                  
                  <div className="space-y-4">
                    {campaignAnalytics.slice(0, 10).map((campaign) => (
                      <div key={campaign.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-muted/30 rounded-lg space-y-2 md:space-y-0">
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground">{campaign.title}</h4>
                          <div className="flex flex-wrap items-center space-x-4 mt-1 text-sm text-muted-foreground">
                            <span>Segmento: {campaign.segment}</span>
                            <span>Enviado: {new Date(campaign.sentAt).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center space-x-4 text-sm">
                          <div className="text-center">
                            <p className="font-medium text-foreground">{campaign.sent}</p>
                            <p className="text-xs text-muted-foreground">Enviadas</p>
                          </div>
                          <div className="text-center">
                            <p className="font-medium text-foreground">{campaign.opened}</p>
                            <p className="text-xs text-muted-foreground">Abertas</p>
                          </div>
                          <div className="text-center">
                            <p className="font-medium text-foreground">{campaign.openRate.toFixed(1)}%</p>
                            <p className="text-xs text-muted-foreground">Taxa</p>
                          </div>
                          <Badge 
                            className={`${
                              campaign.openRate > 20 ? 'bg-green-500/10 text-green-500' :
                              campaign.openRate > 10 ? 'bg-yellow-500/10 text-yellow-500' :
                              'bg-red-500/10 text-red-500'
                            }`}
                          >
                            {campaign.openRate > 20 ? 'Excelente' :
                             campaign.openRate > 10 ? 'Bom' : 'Baixo'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </Card>
    </div>
  );
}
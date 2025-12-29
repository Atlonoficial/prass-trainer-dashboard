import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdvancedMarketing } from '@/hooks/useAdvancedMarketing';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Eye, MousePointer, Target, Percent } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface HistoricalAnalyticsChartProps {
  className?: string;
}

export const HistoricalAnalyticsChart = ({ className }: HistoricalAnalyticsChartProps) => {
  const { historicalAnalytics, isLoadingAnalytics, analyticsDays, setAnalyticsDays } = useAdvancedMarketing();

  const handlePeriodChange = (value: string) => {
    const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '6m': 180 };
    setAnalyticsDays(daysMap[value]);
  };

  if (isLoadingAnalytics) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Analytics Históricos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">
              Carregando dados históricos...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!historicalAnalytics || historicalAnalytics.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Analytics Históricos
              </CardTitle>
              <CardDescription>
                Performance de marketing no período selecionado
              </CardDescription>
            </div>
            <Select defaultValue="30d" onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="6m">Últimos 6 meses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum dado histórico disponível</p>
              <p className="text-sm">Comece a usar o sistema para gerar dados</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calcular totais
  const totals = historicalAnalytics.reduce(
    (acc, day) => ({
      views: acc.views + (day.views || 0),
      clicks: acc.clicks + (day.clicks || 0),
      conversions: acc.conversions + (day.conversions || 0)
    }),
    { views: 0, clicks: 0, conversions: 0 }
  );

  const averageCTR = totals.views > 0 ? (totals.clicks / totals.views) * 100 : 0;
  const conversionRate = totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0;

  // Formatar dados para os gráficos
  const chartData = historicalAnalytics.map(day => ({
    ...day,
    date: new Date(day.date).toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit' 
    })
  }));

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Métricas Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-blue-600" />
              <div className="text-sm text-muted-foreground">Impressões</div>
            </div>
            <div className="text-2xl font-bold">{totals.views.toLocaleString()}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MousePointer className="h-4 w-4 text-green-600" />
              <div className="text-sm text-muted-foreground">Cliques</div>
            </div>
            <div className="text-2xl font-bold">{totals.clicks.toLocaleString()}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-orange-600" />
              <div className="text-sm text-muted-foreground">Conversões</div>
            </div>
            <div className="text-2xl font-bold">{totals.conversions.toLocaleString()}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-purple-600" />
              <div className="text-sm text-muted-foreground">CTR Médio</div>
            </div>
            <div className="text-2xl font-bold">{averageCTR.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Linha - Tendências */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Tendências de Engajamento
          </CardTitle>
          <CardDescription>
            Evolução das métricas ao longo do tempo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => `Data: ${value}`}
                  formatter={(value, name) => [
                    value,
                    name === 'views' ? 'Impressões' :
                    name === 'clicks' ? 'Cliques' :
                    name === 'conversions' ? 'Conversões' : 
                    name === 'ctr' ? 'CTR (%)' : name
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="views" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="views"
                />
                <Line 
                  type="monotone" 
                  dataKey="clicks" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="clicks"
                />
                <Line 
                  type="monotone" 
                  dataKey="conversions" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  name="conversions"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Barras - CTR por Dia */}
      <Card>
        <CardHeader>
          <CardTitle>Taxa de Cliques por Dia</CardTitle>
          <CardDescription>
            CTR diário e tendências de performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(value) => `${value}%`} />
                <Tooltip 
                  formatter={(value) => [`${Number(value).toFixed(2)}%`, 'CTR']}
                  labelFormatter={(value) => `Data: ${value}`}
                />
                <Bar dataKey="ctr" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Insights dos Dados */}
      <Card>
        <CardHeader>
          <CardTitle>Análise de Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Taxa de Conversão</Badge>
                <span className="font-medium">{conversionRate.toFixed(2)}%</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {conversionRate > 5 
                  ? "Excelente taxa de conversão! Continue otimizando." 
                  : conversionRate > 2 
                    ? "Taxa de conversão boa, mas há espaço para melhoria."
                    : "Taxa de conversão baixa. Considere otimizar o conteúdo."
                }
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Engajamento</Badge>
                <span className="font-medium">
                  {averageCTR > 3 ? "Alto" : averageCTR > 1 ? "Médio" : "Baixo"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {averageCTR > 3 
                  ? "Ótimo engajamento! Seu conteúdo está ressoando bem." 
                  : averageCTR > 1 
                    ? "Engajamento moderado. Teste diferentes abordagens."
                    : "Baixo engajamento. Revise o conteúdo e segmentação."
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
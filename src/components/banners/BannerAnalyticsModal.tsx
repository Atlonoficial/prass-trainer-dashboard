import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useBannerAnalytics, AnalyticsDateRange } from '@/hooks/useBannerAnalytics'
import { Eye, MousePointer, TrendingUp, Calendar, Users, Clock } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface BannerAnalyticsModalProps {
  bannerId: string | null
  bannerTitle: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BannerAnalyticsModal({ bannerId, bannerTitle, open, onOpenChange }: BannerAnalyticsModalProps) {
  const [dateRange, setDateRange] = useState<AnalyticsDateRange>({
    startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  })

  const { analytics, interactions, loading, fetchInteractions } = useBannerAnalytics(dateRange)
  
  const bannerAnalytics = analytics.find(a => a.bannerId === bannerId)

  useEffect(() => {
    if (bannerId && open) {
      fetchInteractions(bannerId, 50)
    }
  }, [bannerId, open, fetchInteractions])

  if (!bannerId) return null

  const handleDateRangeChange = (range: string) => {
    let startDate: string
    const endDate = format(new Date(), 'yyyy-MM-dd')
    
    switch (range) {
      case '7d':
        startDate = format(subDays(new Date(), 7), 'yyyy-MM-dd')
        break
      case '30d':
        startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd')
        break
      case '90d':
        startDate = format(subDays(new Date(), 90), 'yyyy-MM-dd')
        break
      default:
        startDate = format(subDays(new Date(), 7), 'yyyy-MM-dd')
    }
    
    setDateRange({ startDate, endDate })
  }

  const recentInteractions = interactions
    .filter(i => i.bannerId === bannerId)
    .slice(0, 10)

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case 'view': return <Eye className="h-4 w-4 text-blue-500" />
      case 'click': return <MousePointer className="h-4 w-4 text-green-500" />
      case 'conversion': return <TrendingUp className="h-4 w-4 text-purple-500" />
      default: return <Eye className="h-4 w-4" />
    }
  }

  const getInteractionLabel = (type: string) => {
    switch (type) {
      case 'view': return 'Visualização'
      case 'click': return 'Clique'
      case 'conversion': return 'Conversão'
      default: return type
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Analytics: {bannerTitle}</DialogTitle>
          <DialogDescription>
            Dados detalhados de performance e interações em tempo real
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Date Range Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select defaultValue="7d" onValueChange={handleDateRangeChange}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">Impressões</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {bannerAnalytics?.totalImpressions || 0}
              </p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <MousePointer className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Cliques</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {bannerAnalytics?.totalClicks || 0}
              </p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                <span className="text-sm text-muted-foreground">CTR</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {bannerAnalytics ? `${bannerAnalytics.ctr.toFixed(1)}%` : '0%'}
              </p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-orange-500" />
                <span className="text-sm text-muted-foreground">Usuários Únicos</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {bannerAnalytics?.uniqueUsers || 0}
              </p>
            </Card>
          </div>

          {/* Recent Interactions */}
          <Card className="p-6">
            <h3 className="font-semibold text-foreground mb-4">Interações Recentes</h3>
            {loading ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : recentInteractions.length === 0 ? (
              <p className="text-muted-foreground">Nenhuma interação registrada ainda</p>
            ) : (
              <div className="space-y-3">
                {recentInteractions.map((interaction, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getInteractionIcon(interaction.interactionType)}
                      <div>
                        <span className="font-medium text-foreground">
                          {getInteractionLabel(interaction.interactionType)}
                        </span>
                        {interaction.metadata?.viewport && (
                          <p className="text-xs text-muted-foreground">
                            Viewport: {interaction.metadata.viewport.width}x{interaction.metadata.viewport.height}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(interaction.createdAt), 'dd/MM HH:mm', { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Performance Insights */}
          <Card className="p-6">
            <h3 className="font-semibold text-foreground mb-4">Insights de Performance</h3>
            <div className="space-y-3">
              {bannerAnalytics && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status de Performance</span>
                    <Badge variant={bannerAnalytics.ctr > 2 ? 'default' : bannerAnalytics.ctr > 1 ? 'secondary' : 'destructive'}>
                      {bannerAnalytics.ctr > 2 ? 'Excelente' : bannerAnalytics.ctr > 1 ? 'Bom' : 'Precisa Melhorar'}
                    </Badge>
                  </div>
                  
                  {bannerAnalytics.ctr < 1 && (
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <p className="text-sm text-yellow-600 dark:text-yellow-400">
                        💡 Dica: CTR abaixo de 1% indica que o banner pode precisar de ajustes no design ou posicionamento.
                      </p>
                    </div>
                  )}
                  
                  {bannerAnalytics.totalImpressions === 0 && (
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <p className="text-sm text-blue-600 dark:text-blue-400">
                        ℹ️ Este banner ainda não foi visualizado por nenhum aluno.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
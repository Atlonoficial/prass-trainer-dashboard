// ============= BANNER PREVIEW COMPONENT =============
// Fase 3: UX/UI - Preview Interativo de Banners

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { UnifiedBanner } from '@/types/marketing'
import { ExternalLink, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BannerPreviewProps {
  banner: UnifiedBanner
  placement?: 'header' | 'between-sections' | 'modal' | 'sidebar'
  showAnalytics?: boolean
  onPreviewClick?: () => void
  className?: string
}

export function BannerPreview({ 
  banner, 
  placement = 'header',
  showAnalytics = true,
  onPreviewClick,
  className 
}: BannerPreviewProps) {
  const getStatusBadge = () => {
    const now = new Date()
    const start = banner.startDate ? new Date(banner.startDate) : new Date()
    const end = banner.endDate ? new Date(banner.endDate) : new Date(Date.now() + 86400000)
    
    if (!banner.isActive) {
      return <Badge variant="secondary">Inativo</Badge>
    }
    
    if (now < start) {
      return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Agendado</Badge>
    }
    
    if (now > end) {
      return <Badge variant="destructive">Expirado</Badge>
    }
    
    return <Badge variant="default" className="bg-green-600">Ativo</Badge>
  }

  const getPlacementStyles = () => {
    switch (placement) {
      case 'header':
        return 'rounded-lg shadow-sm border-l-4 border-l-primary'
      case 'between-sections':
        return 'rounded-xl shadow-md border-2 border-primary/20'
      case 'modal':
        return 'rounded-2xl shadow-lg border-2 border-primary/30'
      case 'sidebar':
        return 'rounded-lg shadow-sm'
      default:
        return 'rounded-lg'
    }
  }

  const performanceColor = banner.analytics.ctr > 2 
    ? 'text-green-600' 
    : banner.analytics.ctr > 1 
    ? 'text-yellow-600' 
    : 'text-red-600'

  return (
    <div className={cn('space-y-3', className)}>
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          <Badge variant="outline" className="text-xs">
            {placement}
          </Badge>
        </div>
        {showAnalytics && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Eye className="h-3 w-3" />
            <span>{banner.analytics.impressions}</span>
            <span className={cn("font-medium", performanceColor)}>
              {banner.analytics.ctr.toFixed(1)}% CTR
            </span>
          </div>
        )}
      </div>

      {/* Banner Preview */}
      <Card
        className={cn(
          'group relative overflow-hidden bg-card hover:shadow-lg transition-all duration-300 cursor-pointer',
          getPlacementStyles(),
          onPreviewClick && 'hover:scale-[1.02]'
        )}
        onClick={onPreviewClick}
      >
        <div className="flex items-center gap-4 p-4">
          {banner.imageUrl && (
            <div className="flex-shrink-0">
              <div className="w-32 h-18 rounded-lg overflow-hidden bg-muted">
                <img
                  src={banner.imageUrl}
                  alt={banner.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-sm sm:text-base line-clamp-1">
              {banner.title}
            </h3>
            {banner.description && (
              <p className="text-muted-foreground text-xs sm:text-sm mt-1 line-clamp-2">
                {banner.description}
              </p>
            )}
          </div>

          {banner.actionText && banner.actionUrl && (
            <div className="flex-shrink-0">
              <Button
                variant="secondary"
                size="sm"
                className="gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                {banner.actionText}
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Subtle gradient overlay for visual appeal */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </Card>

      {/* Analytics Summary */}
      {showAnalytics && (
        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
          <div className="text-center">
            <div className="font-medium text-foreground">{banner.analytics.impressions}</div>
            <div>Impressões</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-foreground">{banner.analytics.clicks}</div>
            <div>Cliques</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-foreground">{banner.analytics.uniqueUsers}</div>
            <div>Usuários</div>
          </div>
        </div>
      )}
    </div>
  )
}
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Eye, MousePointer, TrendingUp, MoreHorizontal, Edit, Trash2, BarChart3, Filter } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { BannerAnalyticsModal } from '@/components/banners/BannerAnalyticsModal'
import { BannerFormModal } from '@/components/marketing/BannerFormModal'
import { BannerPreview } from '@/components/marketing/BannerPreview'
import { useOptimizedMarketing } from '@/hooks/useOptimizedMarketing'
import { BannerFilters, UnifiedBanner } from '@/types/marketing'
import { LoadingSpinner } from '@/components/LoadingSpinner'

export function MarketingSection() {
  const { toast } = useToast()
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [selectedBanner, setSelectedBanner] = useState<{ id: string, title: string } | null>(null)
  const [bannerFormOpen, setBannerFormOpen] = useState(false)
  const [editingBanner, setEditingBanner] = useState<UnifiedBanner | null>(null)
  const [filters, setFilters] = useState<BannerFilters>({})

  const {
    banners,
    metrics,
    loading,
    isCreating,
    isUpdating,
    isDeleting,
    createBanner,
    updateBanner,
    toggleStatus,
    deleteBanner,
    getBannerStatus
  } = useOptimizedMarketing(filters)

  const handleDeleteBanner = async (bannerId: string) => {
    if (confirm('Tem certeza que deseja excluir este banner?')) {
      deleteBanner(bannerId)
    }
  }

  const handleEditBanner = (banner: UnifiedBanner) => {
    setEditingBanner(banner)
    setBannerFormOpen(true)
  }

  const handleCreateBanner = () => {
    setEditingBanner(null)
    setBannerFormOpen(true)
  }

  const handleFormSubmit = (data: any) => {
    if (editingBanner) {
      updateBanner(data)
    } else {
      createBanner(data)
    }
    setBannerFormOpen(false)
    setEditingBanner(null)
  }

  const handleFormClose = () => {
    setBannerFormOpen(false)
    setEditingBanner(null)
  }

  const updateFilters = (key: keyof BannerFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value
    }))
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner />
          <p className="text-muted-foreground ml-2">Carregando sistema de marketing...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Marketing</h2>
          <p className="text-muted-foreground">Gerencie banners e campanhas para seus alunos</p>
        </div>
        <Button onClick={handleCreateBanner} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Banner
        </Button>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="hover-scale">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Total de Impressões</span>
            </div>
            <p className="text-2xl font-bold">{metrics?.totalImpressions.toLocaleString() || 0}</p>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <MousePointer className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Total de Cliques</span>
            </div>
            <p className="text-2xl font-bold">{metrics?.totalClicks.toLocaleString() || 0}</p>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">CTR Médio</span>
            </div>
            <p className="text-2xl font-bold">{metrics?.averageCtr?.toFixed(1) || 0}%</p>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">Banners Ativos</span>
            </div>
            <p className="text-2xl font-bold">
              {banners.filter(b => getBannerStatus(b) === 'active').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>
            
            <Select value={filters.status || 'all'} onValueChange={(value) => updateFilters('status', value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
                <SelectItem value="scheduled">Agendado</SelectItem>
                <SelectItem value="expired">Expirado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.targetAudience || 'all'} onValueChange={(value) => updateFilters('targetAudience', value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Público" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="todos">Todos os Alunos</SelectItem>
                <SelectItem value="iniciantes">Iniciantes</SelectItem>
                <SelectItem value="intermediarios">Intermediários</SelectItem>
                <SelectItem value="avancados">Avançados</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Buscar por título..."
              value={filters.searchTerm || ''}
              onChange={(e) => updateFilters('searchTerm', e.target.value)}
              className="w-64"
            />
          </div>
        </CardContent>
      </Card>

      {/* Banners List */}
      <Card>
        <CardHeader>
          <CardTitle>Banners ({banners.length})</CardTitle>
          <CardDescription>
            Gerencie seus banners promocionais e informativos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {banners.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Eye className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Nenhum banner encontrado</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Crie seu primeiro banner para começar a promover conteúdo para seus alunos
              </p>
              <Button onClick={handleCreateBanner} className="gap-2">
                <Plus className="h-4 w-4" />
                Criar Primeiro Banner
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {banners.map((banner) => (
                <div
                  key={banner.id}
                  className="group relative overflow-hidden border rounded-lg hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start gap-4 p-4">
                    {/* Banner Preview */}
                    <div className="flex-1 min-w-0">
                      <BannerPreview
                        banner={banner}
                        placement="header"
                        showAnalytics={true}
                        onPreviewClick={() => {
                          setSelectedBanner({ id: banner.id, title: banner.title })
                          setAnalyticsOpen(true)
                        }}
                        className="mb-0"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Switch
                        checked={banner.isActive}
                        onCheckedChange={(checked) => toggleStatus(banner.id, checked)}
                        disabled={isUpdating}
                      />

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedBanner({ id: banner.id, title: banner.title })
                              setAnalyticsOpen(true)
                            }}
                          >
                            <BarChart3 className="h-4 w-4 mr-2" />
                            Ver Analytics
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditBanner(banner)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteBanner(banner.id)}
                            className="text-destructive"
                            disabled={isDeleting}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <BannerAnalyticsModal
        bannerId={selectedBanner?.id || null}
        bannerTitle={selectedBanner?.title || ''}
        open={analyticsOpen}
        onOpenChange={setAnalyticsOpen}
      />

      <BannerFormModal
        open={bannerFormOpen}
        onOpenChange={handleFormClose}
        onSubmit={handleFormSubmit}
        initialData={editingBanner ? {
          id: editingBanner.id,
          title: editingBanner.title,
          description: editingBanner.description,
          imageUrl: editingBanner.imageUrl,
          actionText: editingBanner.actionText,
          actionUrl: editingBanner.actionUrl,
          targetAudience: editingBanner.targetAudience,
          startDate: editingBanner.startDate,
          endDate: editingBanner.endDate,
          priority: editingBanner.priority,
        } : undefined}
        isEditing={!!editingBanner}
        isLoading={isCreating || isUpdating}
      />

    </div>
  )
}
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Camera, Calendar, Eye, Download, Plus, Grid, List } from 'lucide-react'
import { useProgressPhotos } from '@/hooks/useProgressPhotos'
import { ImageViewerModal } from '@/components/ui/image-viewer-modal'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ProgressPhotosTabProps {
  studentUserId: string
  studentName: string
}

export function ProgressPhotosTab({ studentUserId, studentName }: ProgressPhotosTabProps) {
  const { progressPhotos, loading, getPhotoStats, getPhotosByMonth } = useProgressPhotos(studentUserId)
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid')
  const [imageViewerOpen, setImageViewerOpen] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-muted-foreground">
          Carregando fotos de progresso...
        </div>
      </div>
    )
  }

  const stats = getPhotoStats()
  const photosByMonth = getPhotosByMonth()

  const formatRelativeTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { 
        addSuffix: true,
        locale: ptBR
      })
    } catch {
      return 'Data inválida'
    }
  }

  const handleImageClick = (photoIndex: number) => {
    setSelectedImageIndex(photoIndex)
    setImageViewerOpen(true)
  }

  const handleImageDownload = async (photo: any) => {
    try {
      const response = await fetch(photo.image_url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `${photo.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date(photo.date).toLocaleDateString('pt-BR').replace(/\//g, '-')}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erro ao baixar imagem:', error)
    }
  }

  if (progressPhotos.length === 0) {
    return (
      <div className="p-6">
        <div className="flex flex-wrap gap-3 mb-6">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" />
            Solicitar Fotos
          </Button>
        </div>
        <div className="text-center py-12 text-muted-foreground">
          <Camera className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma foto de progresso encontrada</h3>
          <p className="text-muted-foreground">
            {studentName} ainda não enviou fotos de progresso. 
            As fotos enviadas pelo app aparecerão automaticamente aqui para acompanhar a evolução.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with stats and controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex gap-3">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" />
            Solicitar Fotos
          </Button>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">{stats.lastMonth}</div>
              <div className="text-sm text-muted-foreground">Último Mês</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-info">{stats.lastThreeMonths}</div>
              <div className="text-sm text-muted-foreground">Últimos 3 Meses</div>
            </div>
          </div>
          
          <div className="flex gap-1">
            <Button 
              size="sm" 
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button 
              size="sm" 
              variant={viewMode === 'timeline' ? 'default' : 'outline'}
              onClick={() => setViewMode('timeline')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {progressPhotos.map((photo, index) => (
            <Card key={photo.id} className="bg-card border-border overflow-hidden group cursor-pointer hover:shadow-lg transition-all">
              <div className="aspect-square relative overflow-hidden bg-muted">
                <img 
                  src={photo.image_url} 
                  alt={photo.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onClick={() => handleImageClick(index)}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => handleImageClick(index)}>
                      <Eye className="w-3 h-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      onClick={(e) => {
                        e.stopPropagation()
                        handleImageDownload(photo)
                      }}
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <Badge className="absolute top-2 right-2 bg-black/70 text-white border-0">
                  {new Date(photo.date).toLocaleDateString('pt-BR')}
                </Badge>
              </div>
              <CardContent className="p-3">
                <div className="text-sm font-medium text-foreground truncate">{photo.title}</div>
                <div className="text-xs text-muted-foreground">{formatRelativeTime(photo.date)}</div>
                {photo.notes && (
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{photo.notes}</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Timeline View */
        <div className="space-y-6">
          {Object.entries(photosByMonth)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([monthKey, photos]) => (
              <Card key={monthKey} className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    {new Date(monthKey + '-01').toLocaleDateString('pt-BR', { 
                      year: 'numeric', 
                      month: 'long' 
                    })}
                  </CardTitle>
                  <CardDescription>
                    {photos.length} fotos de progresso
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {photos.map((photo, photoIndex) => {
                      const globalIndex = progressPhotos.findIndex(p => p.id === photo.id)
                      return (
                        <div key={photo.id} className="group cursor-pointer">
                          <div className="aspect-square relative overflow-hidden bg-muted rounded-lg">
                            <img 
                              src={photo.image_url} 
                              alt={photo.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onClick={() => handleImageClick(globalIndex)}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <Button 
                                size="sm" 
                                variant="secondary" 
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleImageClick(globalIndex)}
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                            </div>
                          <Badge className="absolute bottom-1 left-1 bg-black/70 text-white border-0 text-xs">
                            {new Date(photo.date).getDate()}
                          </Badge>
                        </div>
                        <div className="mt-1 text-xs">
                          <div className="font-medium text-foreground truncate">{photo.title}</div>
                          {photo.notes && (
                            <div className="text-muted-foreground line-clamp-1">{photo.notes}</div>
                          )}
                        </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {/* Before & After Comparison */}
      {progressPhotos.length >= 2 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Comparação Antes e Depois
            </CardTitle>
            <CardDescription>
              Evolução visual de {studentName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* First Photo (Before) */}
              <div className="space-y-3">
                <div className="text-center">
                  <Badge variant="outline" className="mb-2">Antes</Badge>
                </div>
                <div className="aspect-square relative overflow-hidden bg-muted rounded-lg">
                  <img 
                    src={progressPhotos[progressPhotos.length - 1].image_url} 
                    alt="Foto inicial"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-center text-sm text-muted-foreground">
                  {new Date(progressPhotos[progressPhotos.length - 1].date).toLocaleDateString('pt-BR')}
                </div>
              </div>

              {/* Latest Photo (After) */}
              <div className="space-y-3">
                <div className="text-center">
                  <Badge variant="outline" className="mb-2">Depois</Badge>
                </div>
                <div className="aspect-square relative overflow-hidden bg-muted rounded-lg">
                  <img 
                    src={progressPhotos[0].image_url} 
                    alt="Foto atual"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-center text-sm text-muted-foreground">
                  {new Date(progressPhotos[0].date).toLocaleDateString('pt-BR')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Image Viewer Modal */}
      <ImageViewerModal
        isOpen={imageViewerOpen}
        onClose={() => setImageViewerOpen(false)}
        images={progressPhotos}
        initialIndex={selectedImageIndex}
      />
    </div>
  )
}
// ============= BANNER FORM MODAL =============
// Fase 3: UX/UI - Formulário Otimizado com Preview

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { CreateBannerForm, UpdateBannerForm, TargetAudience } from '@/types/marketing'
import { BannerPreview } from './BannerPreview'
import { ImageUpload } from '@/components/ui/image-upload'
import { Calendar, Clock, Target, Eye, Settings } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { cn } from '@/lib/utils'

interface BannerFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateBannerForm | UpdateBannerForm) => void
  initialData?: Partial<UpdateBannerForm>
  isEditing?: boolean
  isLoading?: boolean
}

export function BannerFormModal({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isEditing = false,
  isLoading = false
}: BannerFormModalProps) {
  const [activeTab, setActiveTab] = useState<'content' | 'targeting' | 'schedule' | 'preview'>('content')
  const [showPreview, setShowPreview] = useState(false)

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      imageUrl: initialData?.imageUrl || '',
      actionText: initialData?.actionText || '',
      actionUrl: initialData?.actionUrl || '',
      targetAudience: initialData?.targetAudience || 'todos' as TargetAudience,
      startDate: initialData?.startDate || new Date().toISOString().slice(0, 16),
      endDate: initialData?.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      priority: initialData?.priority || 0,
    }
  })

  // Reset form when initialData changes (important for editing different banners)
  useEffect(() => {
    if (initialData && open) {
      console.log('[BannerFormModal] Resetting form with initialData:', initialData)
      reset({
        title: initialData.title || '',
        description: initialData.description || '',
        imageUrl: initialData.imageUrl || '',
        actionText: initialData.actionText || '',
        actionUrl: initialData.actionUrl || '',
        targetAudience: initialData.targetAudience || 'todos' as TargetAudience,
        startDate: initialData.startDate || new Date().toISOString().slice(0, 16),
        endDate: initialData.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
        priority: initialData.priority || 0,
      })
    } else if (!isEditing && open) {
      // Reset to empty form when creating new banner
      console.log('[BannerFormModal] Resetting form for new banner')
      reset({
        title: '',
        description: '',
        imageUrl: '',
        actionText: '',
        actionUrl: '',
        targetAudience: 'todos' as TargetAudience,
        startDate: new Date().toISOString().slice(0, 16),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
        priority: 0,
      })
    }
  }, [initialData, open, isEditing, reset])

  const watchedValues = watch()

  const onFormSubmit = (data: any) => {
    const formData = isEditing 
      ? { ...data, id: initialData?.id } as UpdateBannerForm
      : data as CreateBannerForm
    
    onSubmit(formData)
    if (!isEditing) {
      reset()
    }
  }

  const mockBanner = {
    id: 'preview',
    title: watchedValues.title || 'Título do Banner',
    description: watchedValues.description || 'Descrição do banner',
    imageUrl: watchedValues.imageUrl || null,
    actionText: watchedValues.actionText,
    actionUrl: watchedValues.actionUrl,
    targetAudience: watchedValues.targetAudience,
    startDate: watchedValues.startDate,
    endDate: watchedValues.endDate,
    priority: watchedValues.priority,
    isActive: true,
    createdBy: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    analytics: {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      uniqueUsers: 0,
      ctr: 0
    }
  }

  const tabs = [
    { id: 'content', label: 'Conteúdo', icon: <Settings className="h-4 w-4" /> },
    { id: 'targeting', label: 'Público', icon: <Target className="h-4 w-4" /> },
    { id: 'schedule', label: 'Agendamento', icon: <Calendar className="h-4 w-4" /> },
    { id: 'preview', label: 'Preview', icon: <Eye className="h-4 w-4" /> }
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] sm:w-[90vw] lg:w-[85vw] max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden p-4 sm:p-5 lg:p-6">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Banner' : 'Criar Novo Banner'}
          </DialogTitle>
          <DialogDescription>
            Preencha as informações do banner e visualize o resultado
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col xl:flex-row gap-4 sm:gap-6 flex-1 overflow-hidden">
          {/* Form Section */}
          <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 min-h-0 pb-4">
            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-1 mb-4 sm:mb-6 p-1 bg-muted rounded-lg">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    'flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors',
                    activeTab === tab.id
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 sm:space-y-6">
              {/* Content Tab */}
              {activeTab === 'content' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Título *</Label>
                    <Input
                      id="title"
                      {...register('title', { required: 'Título é obrigatório' })}
                      placeholder="Digite o título do banner"
                      className={errors.title ? 'border-destructive' : ''}
                    />
                    {errors.title && (
                      <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      {...register('description')}
                      placeholder="Descrição do banner (opcional)"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>Imagem do Banner</Label>
                    <ImageUpload
                      onImageUpload={(url) => setValue('imageUrl', url)}
                      currentImage={watchedValues.imageUrl}
                      bucket="marketing-banners"
                      path="marketing"
                      aspectRatio="16/9"
                      recommendedSize="800x450px (exibido como card horizontal no app mobile do aluno)"
                      showSizeHint={true}
                    />
                  </div>

                  <Separator />

                  <div>
                    <Label htmlFor="actionText">Texto do Botão</Label>
                    <Input
                      id="actionText"
                      {...register('actionText')}
                      placeholder="ex: Saiba Mais, Clique Aqui"
                    />
                  </div>

                  <div>
                    <Label htmlFor="actionUrl">URL de Destino</Label>
                    <Input
                      id="actionUrl"
                      {...register('actionUrl')}
                      placeholder="https://exemplo.com"
                      type="url"
                    />
                  </div>
                </div>
              )}

              {/* Targeting Tab */}
              {activeTab === 'targeting' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="targetAudience">Público-Alvo</Label>
                    <Select
                      value={watchedValues.targetAudience}
                      onValueChange={(value) => setValue('targetAudience', value as TargetAudience)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os Alunos</SelectItem>
                        <SelectItem value="iniciantes">Iniciantes</SelectItem>
                        <SelectItem value="intermediarios">Intermediários</SelectItem>
                        <SelectItem value="avancados">Avançados</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="priority">Prioridade</Label>
                    <Select
                      value={watchedValues.priority?.toString()}
                      onValueChange={(value) => setValue('priority', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Baixa</SelectItem>
                        <SelectItem value="1">Normal</SelectItem>
                        <SelectItem value="2">Alta</SelectItem>
                        <SelectItem value="3">Crítica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Schedule Tab */}
              {activeTab === 'schedule' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="startDate">Data de Início</Label>
                    <Input
                      id="startDate"
                      type="datetime-local"
                      {...register('startDate')}
                    />
                  </div>

                  <div>
                    <Label htmlFor="endDate">Data de Fim</Label>
                    <Input
                      id="endDate"
                      type="datetime-local"
                      {...register('endDate')}
                    />
                  </div>

                  <div className="p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Duração</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {(() => {
                        const start = new Date(watchedValues.startDate)
                        const end = new Date(watchedValues.endDate)
                        const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
                        return `${diffDays} dias`
                      })()}
                    </p>
                  </div>
                </div>
              )}

              {/* Preview Tab */}
              {activeTab === 'preview' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium mb-2">Preview da Imagem</h3>
                    {watchedValues.imageUrl ? (
                      <div className="w-full max-w-2xl mx-auto aspect-video rounded-lg overflow-hidden border-2 border-primary/20">
                        <img 
                          src={watchedValues.imageUrl} 
                          alt="Banner preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-full max-w-2xl mx-auto aspect-video rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                        Nenhuma imagem selecionada
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-4">Como aparecerá no app do aluno</h3>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium">Header</Label>
                        <BannerPreview banner={mockBanner} placement="header" showAnalytics={false} />
                      </div>

                      <div>
                        <Label className="text-sm font-medium">Entre Seções</Label>
                        <BannerPreview banner={mockBanner} placement="between-sections" showAnalytics={false} />
                      </div>

                      <div>
                        <Label className="text-sm font-medium">Sidebar</Label>
                        <BannerPreview banner={mockBanner} placement="sidebar" showAnalytics={false} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-0 sm:justify-between pt-4 sm:pt-6 mt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="w-full sm:w-auto"
                >
                  Cancelar
                </Button>
                
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {activeTab !== 'preview' && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setActiveTab('preview')}
                      className="flex-1 sm:flex-initial"
                    >
                      <Eye className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Visualizar</span>
                      <span className="sm:hidden">Preview</span>
                    </Button>
                  )}
                  
                  <Button type="submit" disabled={isLoading} className="flex-1 sm:flex-initial">
                    {isLoading ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar Banner'}
                  </Button>
                </div>
              </div>
            </form>
          </div>

          {/* Live Preview Section (Desktop) */}
          <div className="hidden xl:block w-72 border-l pl-4 overflow-y-auto min-h-0">
            <div className="sticky top-0">
              <h3 className="font-medium mb-4">Preview em Tempo Real</h3>
              <BannerPreview banner={mockBanner} showAnalytics={false} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
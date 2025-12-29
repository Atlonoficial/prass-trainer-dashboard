import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { Plus, Edit, Trash2, Save, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

interface PlanFeature {
  id: string
  plan_id: string
  feature_key: string
  feature_name: string
  description?: string
  is_enabled: boolean
  max_usage?: number
}

interface Plan {
  id: string
  name: string
  price: number
}

interface PlanFeaturesManagerProps {
  planId?: string
  plans?: Plan[]
}

const COMMON_FEATURES = [
  { key: 'ai_chat', name: 'Chat com IA', description: 'Acesso ao assistente virtual' },
  { key: 'video_lessons', name: 'Aulas em Vídeo', description: 'Acesso às aulas gravadas' },
  { key: 'live_sessions', name: 'Sessões ao Vivo', description: 'Participação em lives' },
  { key: 'custom_plans', name: 'Planos Personalizados', description: 'Criação de treinos customizados' },
  { key: 'progress_tracking', name: 'Acompanhamento', description: 'Relatórios de progresso' },
  { key: 'meal_plans', name: 'Planos Alimentares', description: 'Acesso à nutrição' },
  { key: 'community_access', name: 'Comunidade', description: 'Acesso ao grupo exclusivo' },
  { key: 'priority_support', name: 'Suporte Prioritário', description: 'Atendimento preferencial' }
]

export function PlanFeaturesManager({ planId, plans = [] }: PlanFeaturesManagerProps) {
  const [features, setFeatures] = useState<PlanFeature[]>([])
  const [loading, setLoading] = useState(false)
  const [editingFeature, setEditingFeature] = useState<PlanFeature | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string>(planId || '')
  const { toast } = useToast()

  const [newFeature, setNewFeature] = useState({
    feature_key: '',
    feature_name: '',
    description: '',
    is_enabled: true,
    max_usage: undefined as number | undefined
  })

  const fetchFeatures = async (targetPlanId: string) => {
    if (!targetPlanId) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('plan_features')
        .select('*')
        .eq('plan_id', targetPlanId)
        .order('feature_name')

      if (error) throw error
      setFeatures(data || [])
    } catch (error) {
      console.error('Erro ao buscar funcionalidades:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as funcionalidades',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const saveFeature = async (feature: Omit<PlanFeature, 'id' | 'plan_id'>) => {
    try {
      const { data, error } = await supabase
        .from('plan_features')
        .insert({
          ...feature,
          plan_id: selectedPlan
        })
        .select()
        .single()

      if (error) throw error

      setFeatures(prev => [...prev, data])
      resetForm()
      toast({
        title: 'Sucesso',
        description: 'Funcionalidade adicionada com sucesso'
      })
    } catch (error) {
      console.error('Erro ao salvar funcionalidade:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a funcionalidade',
        variant: 'destructive'
      })
    }
  }

  const updateFeature = async (featureId: string, updates: Partial<PlanFeature>) => {
    try {
      const { data, error } = await supabase
        .from('plan_features')
        .update(updates)
        .eq('id', featureId)
        .select()
        .single()

      if (error) throw error

      setFeatures(prev => prev.map(f => f.id === featureId ? data : f))
      setEditingFeature(null)
      toast({
        title: 'Sucesso',
        description: 'Funcionalidade atualizada com sucesso'
      })
    } catch (error) {
      console.error('Erro ao atualizar funcionalidade:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a funcionalidade',
        variant: 'destructive'
      })
    }
  }

  const deleteFeature = async (featureId: string) => {
    try {
      const { error } = await supabase
        .from('plan_features')
        .delete()
        .eq('id', featureId)

      if (error) throw error

      setFeatures(prev => prev.filter(f => f.id !== featureId))
      toast({
        title: 'Sucesso',
        description: 'Funcionalidade removida com sucesso'
      })
    } catch (error) {
      console.error('Erro ao deletar funcionalidade:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível remover a funcionalidade',
        variant: 'destructive'
      })
    }
  }

  const resetForm = () => {
    setNewFeature({
      feature_key: '',
      feature_name: '',
      description: '',
      is_enabled: true,
      max_usage: undefined
    })
    setIsAddModalOpen(false)
  }

  const handleAddCommonFeature = (commonFeature: typeof COMMON_FEATURES[0]) => {
    setNewFeature({
      feature_key: commonFeature.key,
      feature_name: commonFeature.name,
      description: commonFeature.description,
      is_enabled: true,
      max_usage: undefined
    })
  }

  useEffect(() => {
    if (selectedPlan) {
      fetchFeatures(selectedPlan)
    }
  }, [selectedPlan])

  return (
    <div className="space-y-6">
      {/* Seletor de plano */}
      {plans.length > 0 && !planId && (
        <Card>
          <CardHeader>
            <CardTitle>Selecionar Plano</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map(plan => (
                <Button
                  key={plan.id}
                  variant={selectedPlan === plan.id ? 'default' : 'outline'}
                  onClick={() => setSelectedPlan(plan.id)}
                  className="h-auto p-4 flex-col"
                >
                  <div className="font-semibold">{plan.name}</div>
                  <div className="text-sm opacity-70">
                    R$ {plan.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedPlan && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Funcionalidades do Plano</CardTitle>
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md p-2 sm:p-3">
                <DialogHeader>
                  <DialogTitle>Adicionar Funcionalidade</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Funcionalidades comuns */}
                  <div>
                    <Label className="text-sm font-medium">Funcionalidades Comuns</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {COMMON_FEATURES.map(feature => (
                        <Button
                          key={feature.key}
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddCommonFeature(feature)}
                          className="justify-start text-left h-auto p-2"
                        >
                          <div>
                            <div className="font-medium text-xs">{feature.name}</div>
                            <div className="text-xs opacity-70">{feature.description}</div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="feature_key">Chave da Funcionalidade</Label>
                      <Input
                        id="feature_key"
                        value={newFeature.feature_key}
                        onChange={(e) => setNewFeature(prev => ({ ...prev, feature_key: e.target.value }))}
                        placeholder="ex: video_lessons"
                      />
                    </div>
                    <div>
                      <Label htmlFor="feature_name">Nome da Funcionalidade</Label>
                      <Input
                        id="feature_name"
                        value={newFeature.feature_name}
                        onChange={(e) => setNewFeature(prev => ({ ...prev, feature_name: e.target.value }))}
                        placeholder="ex: Aulas em Vídeo"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={newFeature.description}
                      onChange={(e) => setNewFeature(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descreva a funcionalidade..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_enabled"
                        checked={newFeature.is_enabled}
                        onCheckedChange={(checked) => setNewFeature(prev => ({ ...prev, is_enabled: checked }))}
                      />
                      <Label htmlFor="is_enabled">Ativada</Label>
                    </div>
                    <div>
                      <Label htmlFor="max_usage">Limite de Uso (opcional)</Label>
                      <Input
                        id="max_usage"
                        type="number"
                        value={newFeature.max_usage || ''}
                        onChange={(e) => setNewFeature(prev => ({ 
                          ...prev, 
                          max_usage: e.target.value ? parseInt(e.target.value) : undefined 
                        }))}
                        placeholder="Ilimitado"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={resetForm}>
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button 
                      onClick={() => saveFeature(newFeature)}
                      disabled={!newFeature.feature_key || !newFeature.feature_name}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Salvar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center space-x-4">
                    <div className="h-4 bg-muted rounded w-1/4"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                    <div className="h-4 bg-muted rounded w-1/4"></div>
                  </div>
                ))}
              </div>
            ) : features.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma funcionalidade configurada para este plano
              </div>
            ) : (
              <div className="space-y-4">
                {features.map(feature => (
                  <div key={feature.id} className="flex items-center justify-between p-4 border rounded-lg">
                    {editingFeature?.id === feature.id ? (
                      <div className="flex-1 grid grid-cols-4 gap-2 mr-4">
                        <Input
                          value={editingFeature.feature_name}
                          onChange={(e) => setEditingFeature(prev => 
                            prev ? { ...prev, feature_name: e.target.value } : null
                          )}
                        />
                        <Input
                          value={editingFeature.description || ''}
                          onChange={(e) => setEditingFeature(prev => 
                            prev ? { ...prev, description: e.target.value } : null
                          )}
                          placeholder="Descrição"
                        />
                        <Input
                          type="number"
                          value={editingFeature.max_usage || ''}
                          onChange={(e) => setEditingFeature(prev => 
                            prev ? { ...prev, max_usage: e.target.value ? parseInt(e.target.value) : undefined } : null
                          )}
                          placeholder="Limite"
                        />
                        <div className="flex items-center">
                          <Switch
                            checked={editingFeature.is_enabled}
                            onCheckedChange={(checked) => setEditingFeature(prev => 
                              prev ? { ...prev, is_enabled: checked } : null
                            )}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{feature.feature_name}</span>
                          <Badge variant={feature.is_enabled ? 'default' : 'secondary'}>
                            {feature.is_enabled ? 'Ativa' : 'Inativa'}
                          </Badge>
                          {feature.max_usage && (
                            <Badge variant="outline">
                              Limite: {feature.max_usage}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {feature.description || 'Sem descrição'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Chave: {feature.feature_key}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      {editingFeature?.id === feature.id ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => updateFeature(feature.id, editingFeature)}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingFeature(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingFeature(feature)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteFeature(feature.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
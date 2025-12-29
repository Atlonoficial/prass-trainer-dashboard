import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, DollarSign } from 'lucide-react'
import { useServicePricing, type ServicePricing } from '@/hooks/useServicePricing'

interface ServicePricingModalProps {
  isOpen: boolean
  onClose: () => void
}

const serviceTypes = [
  { value: 'consultation', label: 'Consulta', description: 'Sessões de consultoria individual' },
  { value: 'course', label: 'Curso', description: 'Cursos online ou presenciais' },
  { value: 'training_plan', label: 'Plano de Treino', description: 'Planos de treinamento personalizados' },
  { value: 'nutrition_plan', label: 'Plano Nutricional', description: 'Planos alimentares personalizados' }
]

export default function ServicePricingModal({ isOpen, onClose }: ServicePricingModalProps) {
  const { services, loading, createService, updateService, deleteService } = useServicePricing()
  const [editingService, setEditingService] = useState<ServicePricing | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    service_type: 'consultation' as 'consultation' | 'course' | 'training_plan' | 'nutrition_plan',
    name: '',
    description: '',
    price: '',
    currency: 'BRL',
    is_active: true
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (editingService) {
      setFormData({
        service_type: editingService.service_type,
        name: editingService.name,
        description: editingService.description || '',
        price: editingService.price.toString(),
        currency: editingService.currency,
        is_active: editingService.is_active
      })
      setShowForm(true)
    }
  }, [editingService])

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.price.trim()) return

    try {
      setIsSaving(true)
      const serviceData = {
        service_type: formData.service_type,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        price: parseFloat(formData.price),
        currency: formData.currency,
        is_active: formData.is_active
      }

      if (editingService) {
        await updateService(editingService.id, serviceData)
      } else {
        await createService(serviceData)
      }

      resetForm()
    } catch (error) {
      // Error handled in hook
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (service: ServicePricing) => {
    if (!confirm(`Tem certeza que deseja remover "${service.name}"?`)) return
    
    try {
      await deleteService(service.id)
    } catch (error) {
      // Error handled in hook
    }
  }

  const resetForm = () => {
    setFormData({
      service_type: 'consultation' as 'consultation' | 'course' | 'training_plan' | 'nutrition_plan',
      name: '',
      description: '',
      price: '',
      currency: 'BRL',
      is_active: true
    })
    setEditingService(null)
    setShowForm(false)
  }

  const selectedServiceType = serviceTypes.find(t => t.value === formData.service_type)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-3 pr-12 border-b border-border/40 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Preços dos Serviços
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 pb-5 pt-3 flex-1 min-h-0 overflow-y-auto space-y-4">
          {/* Service Form */}
          {showForm && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {editingService ? 'Editar Serviço' : 'Novo Serviço'}
                </CardTitle>
                <CardDescription>
                  {selectedServiceType?.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Serviço</Label>
                    <Select
                      value={formData.service_type}
                      onValueChange={(value: any) => setFormData(prev => ({ ...prev, service_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex flex-col">
                              <span className="font-medium">{type.label}</span>
                              <span className="text-sm text-muted-foreground">{type.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Nome do Serviço</Label>
                    <Input
                      placeholder="Ex: Consulta Nutricional"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    placeholder="Descreva os detalhes do serviço..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Preço</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Moeda</Label>
                    <Select
                      value={formData.currency}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BRL">BRL - Real Brasileiro</SelectItem>
                        <SelectItem value="USD">USD - Dólar Americano</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Ativo</Label>
                    <p className="text-sm text-muted-foreground">
                      Disponível para pagamento pelos alunos
                    </p>
                  </div>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSubmit}
                    disabled={isSaving || !formData.name.trim() || !formData.price.trim()}
                  >
                    {isSaving ? 'Salvando...' : editingService ? 'Atualizar' : 'Criar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add New Service Button */}
          {!showForm && (
            <Button onClick={() => setShowForm(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Novo Serviço
            </Button>
          )}

          {/* Services List */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Serviços Cadastrados</h3>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando serviços...
              </div>
            ) : services.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum serviço cadastrado ainda.
              </div>
            ) : (
              <div className="grid gap-3">
                {services.map(service => (
                  <Card key={service.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{service.name}</h4>
                            <Badge variant={service.is_active ? "default" : "secondary"}>
                              {service.is_active ? 'Ativo' : 'Inativo'}
                            </Badge>
                            <Badge variant="outline">
                              {serviceTypes.find(t => t.value === service.service_type)?.label}
                            </Badge>
                          </div>
                          {service.description && (
                            <p className="text-sm text-muted-foreground">{service.description}</p>
                          )}
                          <p className="text-lg font-semibold text-primary">
                            {service.currency} {service.price.toFixed(2)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingService(service)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(service)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="px-5 pb-5 pt-3 border-t border-border/40 flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
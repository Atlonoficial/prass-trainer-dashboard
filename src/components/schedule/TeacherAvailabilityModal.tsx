
import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Clock, 
  Calendar, 
  Plus, 
  Trash2, 
  Save,
  Settings,
  Check
} from 'lucide-react'
import { useTeacherAvailability, AvailabilitySlot, BookingSettings } from '@/hooks/useTeacherAvailability'
import { useToast } from '@/hooks/use-toast'

interface TeacherAvailabilityModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function TeacherAvailabilityModal({ isOpen, onClose }: TeacherAvailabilityModalProps) {
  const { availability, bookingSettings, loading, saveAvailability } = useTeacherAvailability()
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [settings, setSettings] = useState<BookingSettings>({
    minimum_advance_minutes: 120, // 2 horas em minutos
    visibility_days: 7,
    allow_same_day: false,
    auto_confirm: false
  })
  const [savingSettings, setSavingSettings] = useState(false)
  const { toast } = useToast()

  const weekdays = [
    { value: 0, label: 'Domingo' },
    { value: 1, label: 'Segunda-feira' },
    { value: 2, label: 'Terça-feira' },
    { value: 3, label: 'Quarta-feira' },
    { value: 4, label: 'Quinta-feira' },
    { value: 5, label: 'Sexta-feira' },
    { value: 6, label: 'Sábado' }
  ]

  const timeOptions = [
    '06:00', '06:15', '06:30', '06:45', '07:00', '07:15', '07:30', '07:45',
    '08:00', '08:15', '08:30', '08:45', '09:00', '09:15', '09:30', '09:45',
    '10:00', '10:15', '10:30', '10:45', '11:00', '11:15', '11:30', '11:45',
    '12:00', '12:15', '12:30', '12:45', '13:00', '13:15', '13:30', '13:45',
    '14:00', '14:15', '14:30', '14:45', '15:00', '15:15', '15:30', '15:45',
    '16:00', '16:15', '16:30', '16:45', '17:00', '17:15', '17:30', '17:45',
    '18:00', '18:15', '18:30', '18:45', '19:00', '19:15', '19:30', '19:45',
    '20:00', '20:15', '20:30', '20:45', '21:00', '21:15', '21:30', '21:45', '22:00'
  ]

  const slotDurations = [
    { value: 5, label: '5 minutos' },
    { value: 10, label: '10 minutos' },
    { value: 15, label: '15 minutos' },
    { value: 20, label: '20 minutos' },
    { value: 30, label: '30 minutos' },
    { value: 45, label: '45 minutos' },
    { value: 60, label: '1 hora' },
    { value: 75, label: '1h 15min' },
    { value: 90, label: '1h 30min' },
    { value: 120, label: '2 horas' },
    { value: 150, label: '2h 30min' },
    { value: 180, label: '3 horas' }
  ]

  const advanceTimeOptions = [
    { value: 5, label: '5 minutos' },
    { value: 15, label: '15 minutos' },
    { value: 30, label: '30 minutos' },
    { value: 60, label: '1 hora' },
    { value: 120, label: '2 horas' },
    { value: 240, label: '4 horas' },
    { value: 480, label: '8 horas' },
    { value: 720, label: '12 horas' },
    { value: 1440, label: '1 dia' },
    { value: 2880, label: '2 dias' },
    { value: 4320, label: '3 dias' },
    { value: 10080, label: '1 semana' }
  ]

  useEffect(() => {
    if (availability.length > 0) {
      setSlots(availability.map(av => ({
        weekday: av.weekday,
        start_time: av.start_time,
        end_time: av.end_time,
        slot_minutes: av.slot_minutes
      })))
    }
    
    if (bookingSettings) {
      setSettings(bookingSettings)
    }
  }, [availability, bookingSettings])

  const addSlot = () => {
    setSlots(prev => [...prev, {
      weekday: 1,
      start_time: '09:00',
      end_time: '18:00',
      slot_minutes: 60
    }])
  }

  const updateSlot = (index: number, field: keyof AvailabilitySlot, value: any) => {
    setSlots(prev => prev.map((slot, i) => 
      i === index ? { ...slot, [field]: value } : slot
    ))
  }

  const removeSlot = (index: number) => {
    setSlots(prev => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    try {
      await saveAvailability(slots, settings)
      onClose()
    } catch (error) {
      // Error is handled in the hook
    }
  }

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true)
      await saveAvailability(slots, settings)
      toast({ 
        title: 'Sucesso', 
        description: 'Configurações de agendamento atualizadas com sucesso!' 
      })
    } catch (error) {
      toast({ 
        title: 'Erro', 
        description: 'Não foi possível salvar as configurações', 
        variant: 'destructive' 
      })
    } finally {
      setSavingSettings(false)
    }
  }

  const getWeekdayLabel = (weekday: number) => {
    return weekdays.find(w => w.value === weekday)?.label || ''
  }

  const formatAdvanceTime = (minutes: number) => {
    const option = advanceTimeOptions.find(opt => opt.value === minutes)
    return option ? option.label : `${minutes} minutos`
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Configurar Disponibilidade</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Availability Summary */}
          {slots.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>Resumo da Disponibilidade</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {slots.map((slot, index) => (
                    <div key={index} className="p-3 border border-border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-xs">
                          {getWeekdayLabel(slot.weekday)}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-6 h-6 p-0 hover:bg-red-400/10"
                          onClick={() => removeSlot(index)}
                        >
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </Button>
                      </div>
                      <div className="text-sm">
                        <p className="font-medium">{slot.start_time} - {slot.end_time}</p>
                        <p className="text-muted-foreground">Slots de {slot.slot_minutes}min</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Booking Settings */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Settings className="w-4 h-4" />
                  <span>Configurações de Agendamento</span>
                </CardTitle>
                <Button 
                  size="sm" 
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {savingSettings ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Salvar Configurações
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="min-advance">Antecedência mínima</Label>
                   <Select 
                    value={settings.minimum_advance_minutes.toString()} 
                    onValueChange={(value) => setSettings({
                      ...settings,
                      minimum_advance_minutes: parseInt(value)
                    })}
                  >
                    <SelectTrigger className="bg-background border-border hover:bg-accent text-foreground">
                      <SelectValue placeholder="Selecione a antecedência" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border shadow-md z-50">
                      {advanceTimeOptions.map(option => (
                        <SelectItem 
                          key={option.value} 
                          value={option.value.toString()}
                          className="hover:bg-accent hover:text-accent-foreground cursor-pointer"
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Alunos devem agendar com pelo menos essa antecedência
                  </p>
                </div>

                <div>
                  <Label htmlFor="visibility">Visibilidade (dias)</Label>
                  <Input
                    id="visibility"
                    type="number"
                    min="1"
                    max="365"
                    value={settings.visibility_days}
                    onChange={(e) => setSettings({
                      ...settings,
                      visibility_days: parseInt(e.target.value) || 7
                    })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Quantos dias à frente ficam visíveis para agendamento
                  </p>
                </div>

                <div>
                  <Label htmlFor="same-day">Agendamento no mesmo dia</Label>
                  <div className="flex items-center space-x-2 mt-2">
                    <Switch
                      id="same-day"
                      checked={settings.allow_same_day}
                      onCheckedChange={(checked) => setSettings({
                        ...settings,
                        allow_same_day: checked
                      })}
                    />
                    <span className="text-sm text-muted-foreground">
                      {settings.allow_same_day ? 'Permitir' : 'Não permitir'}
                    </span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="auto-confirm">Auto confirmar</Label>
                  <div className="flex items-center space-x-2 mt-2">
                    <Switch
                      id="auto-confirm"
                      checked={settings.auto_confirm}
                      onCheckedChange={(checked) => setSettings({
                        ...settings,
                        auto_confirm: checked
                      })}
                    />
                    <span className="text-sm text-muted-foreground">
                      {settings.auto_confirm ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Confirma automaticamente novos agendamentos
                  </p>
                </div>
              </div>

              {/* Preview da configuração atual */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Configuração Atual:</h4>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Antecedência mínima: <strong>{formatAdvanceTime(settings.minimum_advance_minutes)}</strong></p>
                  <p>• Visibilidade: <strong>{settings.visibility_days} dias à frente</strong></p>
                  <p>• Mesmo dia: <strong>{settings.allow_same_day ? 'Permitido' : 'Bloqueado'}</strong></p>
                  <p>• Auto confirmar: <strong>{settings.auto_confirm ? 'Ativo' : 'Inativo'}</strong></p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Add/Edit Slots */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Clock className="w-4 h-4" />
                  <span>Horários de Atendimento</span>
                </CardTitle>
                <Button size="sm" onClick={addSlot}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Horário
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {slots.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum horário cadastrado</h3>
                  <p className="text-muted-foreground mb-4">
                    Configure seus horários de disponibilidade para que os alunos possam agendar
                  </p>
                  <Button onClick={addSlot}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Primeiro Horário
                  </Button>
                </div>
              ) : (
                slots.map((slot, index) => (
                  <div key={index}>
                    <Card className="border-border/50 bg-card">
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <Label htmlFor={`weekday-${index}`} className="text-sm font-medium">Dia da Semana</Label>
                            <Select 
                              value={slot.weekday.toString()} 
                              onValueChange={(value) => updateSlot(index, 'weekday', parseInt(value))}
                            >
                              <SelectTrigger className="bg-background border-border hover:bg-accent text-foreground">
                                <SelectValue placeholder="Selecione o dia" />
                              </SelectTrigger>
                              <SelectContent className="bg-popover border-border shadow-md z-50">
                                {weekdays.map((day) => (
                                  <SelectItem 
                                    key={day.value} 
                                    value={day.value.toString()}
                                    className="hover:bg-accent hover:text-accent-foreground cursor-pointer"
                                  >
                                    {day.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor={`start-${index}`} className="text-sm font-medium">Horário Início</Label>
                            <Select 
                              value={slot.start_time} 
                              onValueChange={(value) => updateSlot(index, 'start_time', value)}
                            >
                              <SelectTrigger className="bg-background border-border hover:bg-accent text-foreground">
                                <SelectValue>
                                  {slot.start_time || "Selecione o horário"}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent className="bg-popover border-border shadow-md z-50 max-h-[200px] overflow-y-auto">
                                {timeOptions.map((time) => (
                                  <SelectItem 
                                    key={time} 
                                    value={time}
                                    className="hover:bg-accent hover:text-accent-foreground cursor-pointer"
                                  >
                                    {time}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor={`end-${index}`} className="text-sm font-medium">Horário Fim</Label>
                            <Select 
                              value={slot.end_time} 
                              onValueChange={(value) => updateSlot(index, 'end_time', value)}
                            >
                              <SelectTrigger className="bg-background border-border hover:bg-accent text-foreground">
                                <SelectValue>
                                  {slot.end_time || "Selecione o horário"}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent className="bg-popover border-border shadow-md z-50 max-h-[200px] overflow-y-auto">
                                {timeOptions.map((time) => (
                                  <SelectItem 
                                    key={time} 
                                    value={time}
                                    className="hover:bg-accent hover:text-accent-foreground cursor-pointer"
                                  >
                                    {time}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor={`duration-${index}`} className="text-sm font-medium">Duração do Slot</Label>
                            <Select 
                              value={slot.slot_minutes.toString()} 
                              onValueChange={(value) => updateSlot(index, 'slot_minutes', parseInt(value))}
                            >
                              <SelectTrigger className="bg-background border-border hover:bg-accent text-foreground">
                                <SelectValue placeholder="Selecione a duração" />
                              </SelectTrigger>
                              <SelectContent className="bg-popover border-border shadow-md z-50">
                                {slotDurations.map((duration) => (
                                  <SelectItem 
                                    key={duration.value} 
                                    value={duration.value.toString()}
                                    className="hover:bg-accent hover:text-accent-foreground cursor-pointer"
                                  >
                                    {duration.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    {index < slots.length - 1 && <Separator className="my-4" />}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <h4 className="font-medium mb-2">Como funciona:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Configure os dias e horários que você está disponível para atendimento</li>
                <li>• A duração do slot define intervalos de agendamento (ex: slots de 15min = agendamentos a cada 15 minutos)</li>
                <li>• <strong>Antecedência mínima</strong>: Evita agendamentos de última hora (ex: 30min = não permite agendar para os próximos 30 minutos)</li>
                <li>• <strong>Visibilidade</strong>: Controla até quantos dias à frente os alunos podem agendar (ex: 7 dias)</li>
                <li>• <strong>Mesmo dia</strong>: Se desabilitado, bloqueia todos os agendamentos para o dia atual</li>
                <li>• Apenas alunos com planos Híbrido ou Presencial poderão agendar</li>
                <li>• Os horários aparecerão automaticamente no app do aluno respeitando suas configurações</li>
                <li>• <strong>Horários quebrados</strong>: Agora você pode configurar intervalos de 15 em 15 minutos para máxima flexibilidade</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            Salvar Disponibilidade
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

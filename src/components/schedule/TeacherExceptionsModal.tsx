import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Save,
  AlertTriangle,
  Clock,
  X
} from 'lucide-react'
import { useTeacherExceptions, TeacherException, NewTeacherException } from '@/hooks/useTeacherExceptions'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface TeacherExceptionsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function TeacherExceptionsModal({ isOpen, onClose }: TeacherExceptionsModalProps) {
  const { exceptions, loading, addException, updateException, deleteException } = useTeacherExceptions()
  
  const [newException, setNewException] = useState<NewTeacherException>({
    date: '',
    type: 'blocked',
    reason: '',
    is_available: false,
    special_start_time: '',
    special_end_time: ''
  })

  const [editingException, setEditingException] = useState<string | null>(null)

  const exceptionTypes = [
    { 
      value: 'holiday' as const, 
      label: 'Feriado/Férias', 
      description: 'Dia de feriado ou férias',
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
    },
    { 
      value: 'blocked' as const, 
      label: 'Dia Bloqueado', 
      description: 'Dia totalmente indisponível',
      color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    },
    { 
      value: 'special_hours' as const, 
      label: 'Horário Especial', 
      description: 'Horários diferentes do padrão',
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
    }
  ]

  const timeOptions = [
    '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
    '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'
  ]

  const handleAddException = async () => {
    if (!newException.date || !newException.type) return
    
    try {
      await addException(newException)
      setNewException({
        date: '',
        type: 'blocked',
        reason: '',
        is_available: false,
        special_start_time: '',
        special_end_time: ''
      })
    } catch (error) {
      // Error is handled in the hook
    }
  }

  const handleDeleteException = async (id: string) => {
    if (window.confirm('Tem certeza que deseja remover esta exceção?')) {
      await deleteException(id)
    }
  }

  const getExceptionTypeInfo = (type: string) => {
    return exceptionTypes.find(t => t.value === type) || exceptionTypes[0]
  }

  const upcomingExceptions = exceptions.filter(ex => new Date(ex.date) >= new Date())
  const pastExceptions = exceptions.filter(ex => new Date(ex.date) < new Date())

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Exceções de Agenda</span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add New Exception */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>Nova Exceção</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="exception-date">Data</Label>
                  <Input
                    id="exception-date"
                    type="date"
                    value={newException.date}
                    onChange={(e) => setNewException(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="exception-type">Tipo de Exceção</Label>
                  <Select 
                    value={newException.type} 
                    onValueChange={(value: 'holiday' | 'blocked' | 'special_hours') => 
                      setNewException(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {exceptionTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div>
                            <div className="font-medium">{type.label}</div>
                            <div className="text-xs text-muted-foreground">{type.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {(newException.type === 'holiday' || newException.type === 'special_hours') && (
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="is-available">Disponível para agendamento</Label>
                      <p className="text-xs text-muted-foreground">
                        {newException.type === 'holiday' 
                          ? 'Permitir agendamentos mesmo sendo feriado'
                          : 'Usar horários especiais configurados abaixo'
                        }
                      </p>
                    </div>
                    <Switch
                      id="is-available"
                      checked={newException.is_available}
                      onCheckedChange={(checked) => 
                        setNewException(prev => ({ ...prev, is_available: checked }))
                      }
                    />
                  </div>
                )}

                {newException.type === 'special_hours' && newException.is_available && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="special-start">Início</Label>
                        <Select 
                          value={newException.special_start_time} 
                          onValueChange={(value) => 
                            setNewException(prev => ({ ...prev, special_start_time: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar" />
                          </SelectTrigger>
                          <SelectContent>
                            {timeOptions.map(time => (
                              <SelectItem key={time} value={time}>{time}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="special-end">Fim</Label>
                        <Select 
                          value={newException.special_end_time} 
                          onValueChange={(value) => 
                            setNewException(prev => ({ ...prev, special_end_time: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar" />
                          </SelectTrigger>
                          <SelectContent>
                            {timeOptions.map(time => (
                              <SelectItem key={time} value={time}>{time}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <Label htmlFor="exception-reason">Motivo (Opcional)</Label>
                  <Textarea
                    id="exception-reason"
                    value={newException.reason || ''}
                    onChange={(e) => setNewException(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Descreva o motivo desta exceção..."
                    rows={3}
                  />
                </div>

                <Button 
                  onClick={handleAddException} 
                  disabled={!newException.date || !newException.type}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Exceção
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Existing Exceptions */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>Exceções Cadastradas</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando exceções...
                  </div>
                ) : (
                  <>
                    {/* Upcoming Exceptions */}
                    {upcomingExceptions.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-3">Próximas</h4>
                        <div className="space-y-2">
                          {upcomingExceptions.map((exception) => {
                            const typeInfo = getExceptionTypeInfo(exception.type)
                            
                            return (
                              <div key={exception.id} className="p-3 border rounded-lg">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <div className="flex items-center space-x-2 mb-1">
                                      <Badge className={typeInfo.color}>
                                        {typeInfo.label}
                                      </Badge>
                                      {exception.is_available && (
                                        <Badge variant="outline" className="text-green-600 border-green-600">
                                          Disponível
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="font-medium">
                                      {format(new Date(exception.date), 'dd/MM/yyyy - EEEE', { locale: ptBR })}
                                    </p>
                                    {exception.type === 'special_hours' && exception.special_start_time && (
                                      <div className="flex items-center space-x-1 mt-1 text-sm text-muted-foreground">
                                        <Clock className="w-3 h-3" />
                                        <span>{exception.special_start_time} - {exception.special_end_time}</span>
                                      </div>
                                    )}
                                    {exception.reason && (
                                      <p className="text-sm text-muted-foreground mt-1">{exception.reason}</p>
                                    )}
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                                    onClick={() => handleDeleteException(exception.id)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Past Exceptions */}
                    {pastExceptions.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-3 text-muted-foreground">Anteriores</h4>
                        <div className="space-y-2">
                          {pastExceptions.slice(0, 5).map((exception) => {
                            const typeInfo = getExceptionTypeInfo(exception.type)
                            
                            return (
                              <div key={exception.id} className="p-3 border rounded-lg opacity-60">
                                <div className="flex items-center space-x-2 mb-1">
                                  <Badge variant="outline" className={`${typeInfo.color} opacity-70`}>
                                    {typeInfo.label}
                                  </Badge>
                                </div>
                                <p className="text-sm">
                                  {format(new Date(exception.date), 'dd/MM/yyyy - EEEE', { locale: ptBR })}
                                </p>
                                {exception.reason && (
                                  <p className="text-xs text-muted-foreground mt-1">{exception.reason}</p>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {exceptions.length === 0 && (
                      <div className="text-center py-8">
                        <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma exceção cadastrada</h3>
                        <p className="text-muted-foreground">
                          Configure feriados, dias bloqueados ou horários especiais
                        </p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Instructions */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <h4 className="font-medium mb-2">Como usar as exceções:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>Feriado/Férias:</strong> Marque datas como feriado, opcionalmente mantendo disponibilidade</li>
              <li>• <strong>Dia Bloqueado:</strong> Bloqueia completamente o dia para agendamentos</li>
              <li>• <strong>Horário Especial:</strong> Define horários diferentes da agenda padrão para um dia específico</li>
              <li>• As exceções sobrescrevem sua disponibilidade semanal padrão</li>
            </ul>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}

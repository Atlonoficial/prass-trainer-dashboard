import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { CreateChargeData, ContentToUnlock } from '@/services/manualChargesService'
import { useManualCharges } from '@/hooks/useManualCharges'
import { toast } from 'sonner'
import { CreditCard, Calendar, User, DollarSign, Package, Clock } from 'lucide-react'

interface ManualChargeCreatorProps {
  students: Array<{ id: string; name: string; email: string; phone?: string }>
  plans: Array<{ id: string; name: string; price: number }>
  onChargeCreated: (successData: {
    chargeId: string
    paymentLink: string
    amount: number
    studentName: string
    studentPhone: string
    dueDate: string
  }) => void
}

export function ManualChargeCreator({ students, plans, onChargeCreated }: ManualChargeCreatorProps) {
  const { createCharge, generatePaymentLink, creatingCharge } = useManualCharges()
  const [selectedStudent, setSelectedStudent] = useState('')
  const [selectedPlan, setSelectedPlan] = useState('')
  const [amount, setAmount] = useState('')
  const [recurringInterval, setRecurringInterval] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly')
  const [isRecurring, setIsRecurring] = useState(false)
  const [dueDate, setDueDate] = useState('')
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly')
  const [notes, setNotes] = useState('')
  const [contentToUnlock, setContentToUnlock] = useState<ContentToUnlock[]>([])

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId)
    const plan = plans.find(p => p.id === planId)
    if (plan) {
      setAmount(plan.price.toString())
    }
  }

  const toggleContent = (type: ContentToUnlock['type'], id: string, name: string) => {
    setContentToUnlock(prev => {
      const exists = prev.find(c => c.id === id && c.type === type)
      if (exists) {
        return prev.filter(c => !(c.id === id && c.type === type))
      }
      return [...prev, { type, id, name }]
    })
  }

  const handleSubmit = async () => {
    if (!selectedStudent || !amount || !dueDate) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    try {
      // 1. Criar cobrança
      const data: CreateChargeData = {
        student_id: selectedStudent,
        plan_id: selectedPlan || undefined,
        amount: parseFloat(amount),
        due_date: dueDate,
        content_to_unlock: contentToUnlock,
        recurring_interval: isRecurring ? recurringInterval : undefined,
        notes
      }

      const charge = await createCharge(data)
      
      if (!charge) {
        toast.error('Erro ao criar cobrança')
        return
      }

      toast.success('Cobrança criada! Gerando link de pagamento...')

      // 2. Gerar link de pagamento automaticamente
      const paymentLink = await generatePaymentLink(charge.id)
      
      if (!paymentLink) {
        toast.error('Erro ao gerar link de pagamento')
        return
      }

      // 3. Buscar dados do aluno
      const student = students.find(s => s.id === selectedStudent)

      // 4. Limpar formulário
      setSelectedStudent('')
      setSelectedPlan('')
      setAmount('')
      setDueDate('')
      setContentToUnlock([])
      setNotes('')
      setIsRecurring(false)

      // 5. Notificar componente pai com dados do sucesso
      onChargeCreated({
        chargeId: charge.id,
        paymentLink,
        amount: parseFloat(amount),
        studentName: student?.name || 'Aluno',
        studentPhone: student?.phone || '',
        dueDate
      })

    } catch (error) {
      console.error('Erro no fluxo de cobrança:', error)
      toast.error('Erro ao processar cobrança')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Criar Nova Cobrança
        </CardTitle>
        <CardDescription>
          Crie cobranças manuais e envie por WhatsApp
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Aluno */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Aluno
          </Label>
          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o aluno" />
            </SelectTrigger>
            <SelectContent>
              {students.map(student => (
                <SelectItem key={student.id} value={student.id}>
                  {student.name} - {student.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Plano (opcional) */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Plano (opcional)
          </Label>
          <Select value={selectedPlan} onValueChange={handlePlanSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um plano" />
            </SelectTrigger>
            <SelectContent>
              {plans.map(plan => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.name} - R$ {plan.price.toFixed(2)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Valor */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Valor (R$)
          </Label>
          <Input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </div>

        {/* Tipo de Cobrança */}
        <div className="space-y-2">
          <Label>Tipo de Cobrança</Label>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="recurring"
              checked={isRecurring}
              onCheckedChange={(checked) => setIsRecurring(checked as boolean)}
            />
            <Label htmlFor="recurring" className="cursor-pointer">
              Cobrança Recorrente
            </Label>
          </div>
        </div>

        {/* Intervalo de recorrência */}
        {isRecurring && (
          <div className="space-y-2">
            <Label>Intervalo de Cobrança</Label>
            <Select value={recurringInterval} onValueChange={(v: any) => setRecurringInterval(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Mensal</SelectItem>
                <SelectItem value="quarterly">Trimestral</SelectItem>
                <SelectItem value="yearly">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Vencimento */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Data de Vencimento
          </Label>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        {/* Conteúdo a Desbloquear */}
        <div className="space-y-2">
          <Label>Conteúdo a Desbloquear</Label>
          <div className="space-y-2 border rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="courses"
                checked={contentToUnlock.some(c => c.type === 'course')}
                onCheckedChange={(checked) => {
                  if (checked) toggleContent('course', 'all', 'Todos os Cursos')
                  else setContentToUnlock(prev => prev.filter(c => c.type !== 'course'))
                }}
              />
              <Label htmlFor="courses" className="cursor-pointer">
                Cursos
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="workouts"
                checked={contentToUnlock.some(c => c.type === 'workout')}
                onCheckedChange={(checked) => {
                  if (checked) toggleContent('workout', 'all', 'Todos os Treinos')
                  else setContentToUnlock(prev => prev.filter(c => c.type !== 'workout'))
                }}
              />
              <Label htmlFor="workouts" className="cursor-pointer">
                Planos de Treino
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="plans"
                checked={contentToUnlock.some(c => c.type === 'plan')}
                onCheckedChange={(checked) => {
                  if (checked) toggleContent('plan', 'all', 'Todos os Planos')
                  else setContentToUnlock(prev => prev.filter(c => c.type !== 'plan'))
                }}
              />
              <Label htmlFor="plans" className="cursor-pointer">
                Planos Nutricionais
              </Label>
            </div>
          </div>
        </div>

        {/* Notas */}
        <div className="space-y-2">
          <Label>Observações</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas sobre a cobrança..."
            rows={3}
          />
        </div>

        <Button 
          onClick={handleSubmit} 
          className="w-full" 
          size="lg"
          disabled={creatingCharge}
        >
          {creatingCharge ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Criando...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4 mr-2" />
              Criar Cobrança
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
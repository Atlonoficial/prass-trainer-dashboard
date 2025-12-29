import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, AlertTriangle, Play, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import type { PlanCatalog } from '@/hooks/usePlans'

interface PlanValidatorProps {
  plan: PlanCatalog
  onTestComplete?: (success: boolean, errors: string[]) => void
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  canCreateCheckout: boolean
}

export function PlanValidator({ plan, onTestComplete }: PlanValidatorProps) {
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<ValidationResult | null>(null)
  const { toast } = useToast()

  const validatePlan = async (): Promise<ValidationResult> => {
    const errors: string[] = []
    const warnings: string[] = []

    // Validação básica de campos obrigatórios
    if (!plan.name || plan.name.trim().length === 0) {
      errors.push('Nome do plano é obrigatório')
    }

    if (!plan.price || plan.price < 0.50) {
      errors.push('Preço deve ser no mínimo R$ 0,50 (mínimo do Mercado Pago)')
    }

    if (plan.price > 100000) {
      errors.push('Preço não pode exceder R$ 100.000')
    }

    if (!plan.currency || plan.currency !== 'BRL') {
      errors.push('Moeda deve ser BRL')
    }

    if (!plan.interval || !['monthly', 'quarterly', 'yearly'].includes(plan.interval)) {
      errors.push('Intervalo deve ser monthly, quarterly ou yearly')
    }

    if (!Array.isArray(plan.features)) {
      warnings.push('Features deve ser um array')
    }

    // Validar se o plano está ativo
    if (!plan.is_active) {
      warnings.push('Plano está inativo - não pode ser comprado')
    }

    // Verificar configuração global do gateway de pagamento
    try {
      const { data: paymentSettings } = await supabase
        .from('system_payment_config')
        .select('*')
        .eq('gateway_type', 'mercadopago')
        .eq('is_active', true)
        .single()

      if (!paymentSettings) {
        errors.push('Sistema de pagamento não configurado globalmente. Contate o administrador.')
      } else {
        const credentials = paymentSettings.credentials as any
        if (!credentials?.access_token) {
          errors.push('Access Token do Mercado Pago não configurado no sistema')
        }
      }
    } catch (error) {
      errors.push('Erro ao verificar configuração global de pagamento')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      canCreateCheckout: errors.length === 0 && plan.is_active
    }
  }

  const testCheckoutCreation = async (): Promise<boolean> => {
    try {
      // Simular criação de checkout sem realmente criar
      const { data, error } = await supabase.rpc('validate_transaction_data_enhanced', {
        p_teacher_id: plan.teacher_id,
        p_student_id: plan.teacher_id, // Auto-compra para teste
        p_amount: plan.price,
        p_item_type: 'plan',
        p_plan_catalog_id: plan.id
      })

      if (error) {
        throw new Error(error.message)
      }

      return data === true
    } catch (error) {
      console.error('Erro no teste de checkout:', error)
      return false
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setResult(null)

    try {
      // Fase 1: Validação básica
      const validationResult = await validatePlan()
      
      // Fase 2: Teste de criação de checkout (apenas se validação passou)
      if (validationResult.isValid) {
        const checkoutTest = await testCheckoutCreation()
        validationResult.canCreateCheckout = checkoutTest
        
        if (!checkoutTest) {
          validationResult.errors.push('Falha no teste de criação do checkout')
          validationResult.isValid = false
        }
      }

      setResult(validationResult)
      
      if (validationResult.isValid) {
        toast({
          title: "✅ Plano válido!",
          description: "Todas as validações passaram. O plano está pronto para uso.",
        })
      } else {
        toast({
          title: "❌ Plano com problemas",
          description: `${validationResult.errors.length} erro(s) encontrado(s)`,
          variant: "destructive"
        })
      }

      onTestComplete?.(validationResult.isValid, validationResult.errors)
      
    } catch (error) {
      toast({
        title: "Erro no teste",
        description: "Erro inesperado durante a validação",
        variant: "destructive"
      })
    } finally {
      setTesting(false)
    }
  }

  const getStatusIcon = () => {
    if (!result) return <Play className="h-4 w-4" />
    if (result.isValid) return <CheckCircle className="h-4 w-4 text-green-500" />
    return <XCircle className="h-4 w-4 text-red-500" />
  }

  const getStatusBadge = () => {
    if (!result) return <Badge variant="outline">Não testado</Badge>
    if (result.isValid) return <Badge variant="default" className="bg-green-500">Válido</Badge>
    return <Badge variant="destructive">Inválido</Badge>
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Validação do Plano</CardTitle>
        {getStatusBadge()}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="font-medium">{plan.name}</span>
          <span className="text-muted-foreground">
            R$ {plan.price?.toFixed(2)} / {plan.interval}
          </span>
        </div>

        <Button
          onClick={handleTest}
          disabled={testing}
          className="w-full"
          variant={result?.isValid ? "default" : "outline"}
        >
          {testing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testando...
            </>
          ) : (
            <>
              {getStatusIcon()}
              <span className="ml-2">
                {result ? 'Testar Novamente' : 'Validar Plano'}
              </span>
            </>
          )}
        </Button>

        {result && (
          <div className="space-y-2">
            {result.errors.length > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Erros encontrados:</strong>
                  <ul className="list-disc list-inside mt-1">
                    {result.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {result.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Avisos:</strong>
                  <ul className="list-disc list-inside mt-1">
                    {result.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {result.isValid && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  <strong>Plano validado com sucesso!</strong>
                  <br />
                  ✅ Campos obrigatórios preenchidos
                  <br />
                  ✅ Preço válido para Mercado Pago
                  <br />
                  ✅ Gateway de pagamento configurado
                  <br />
                  ✅ Teste de checkout passou
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
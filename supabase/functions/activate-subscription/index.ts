import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : ''
  console.log(`[ACTIVATE-SUBSCRIPTION] ${step}${detailsStr}`)
}

const logError = (message: string, error: any) => {
  console.error(`[ACTIVATE-SUBSCRIPTION] ERROR - ${message}:`, error)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    logStep("Subscription activation triggered")

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    )

    const { transaction_id, payment_status } = await req.json()
    
    if (payment_status !== 'paid') {
      logStep("Payment not completed, skipping subscription activation", { payment_status })
      return new Response(JSON.stringify({ success: true, message: 'Payment not completed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Buscar detalhes da transação
    const { data: transaction, error: transactionError } = await supabaseClient
      .from('payment_transactions')
      .select('*')
      .eq('id', transaction_id)
      .single()

    if (transactionError) {
      throw new Error(`Transaction not found: ${transactionError.message}`)
    }

    logStep("Transaction found", { 
      transaction_id, 
      student_id: transaction.student_id,
      teacher_id: transaction.teacher_id,
      plan_catalog_id: transaction.plan_catalog_id
    })

    // Verificar se é compra de plano
    if (!transaction.plan_catalog_id) {
      logStep("Not a plan purchase, skipping subscription activation")
      return new Response(JSON.stringify({ success: true, message: 'Not a plan purchase' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Verificar se já existe subscrição ativa
    const { data: existingSubscription } = await supabaseClient
      .from('plan_subscriptions')
      .select('*')
      .eq('student_user_id', transaction.student_id)
      .eq('plan_id', transaction.plan_catalog_id)
      .eq('status', 'active')
      .maybeSingle()

    if (existingSubscription) {
      logStep("Active subscription already exists", { subscription_id: existingSubscription.id })
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Subscription already active',
        subscription_id: existingSubscription.id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Buscar detalhes do plano
    const { data: plan, error: planError } = await supabaseClient
      .from('plan_catalog')
      .select('*')
      .eq('id', transaction.plan_catalog_id)
      .single()

    if (planError) {
      throw new Error(`Plan not found: ${planError.message}`)
    }

    // Calcular datas de início e fim
    const startDate = new Date()
    let endDate = new Date()

    switch (plan.interval) {
      case 'monthly':
        endDate.setMonth(endDate.getMonth() + 1)
        break
      case 'quarterly':
        endDate.setMonth(endDate.getMonth() + 3)
        break
      case 'yearly':
        endDate.setFullYear(endDate.getFullYear() + 1)
        break
      default:
        endDate.setMonth(endDate.getMonth() + 1)
    }

    logStep("Creating subscription", {
      student_user_id: transaction.student_id,
      teacher_id: transaction.teacher_id,
      plan_id: transaction.plan_catalog_id,
      start_at: startDate.toISOString(),
      end_at: endDate.toISOString()
    })

    // Criar nova subscrição
    const { data: newSubscription, error: createError } = await supabaseClient
      .from('plan_subscriptions')
      .insert({
        student_user_id: transaction.student_id,
        teacher_id: transaction.teacher_id,
        plan_id: transaction.plan_catalog_id,
        status: 'active',
        start_at: startDate.toISOString(),
        end_at: endDate.toISOString(),
        approved_at: new Date().toISOString()
      })
      .select()
      .single()

    if (createError) {
      throw new Error(`Failed to create subscription: ${createError.message}`)
    }

    logStep("Subscription created successfully", { subscription_id: newSubscription.id })

    // Atualizar dados do estudante
    const { error: updateStudentError } = await supabaseClient
      .from('students')
      .update({
        membership_expiry: endDate.toISOString(),
        plan: plan.name,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', transaction.student_id)
      .eq('teacher_id', transaction.teacher_id)

    if (updateStudentError) {
      logError("Failed to update student data", updateStudentError)
      // Não falhar a operação por isso, apenas logar
    }

    // Marcar transação como processada para subscrição
    const { error: updateTransactionError } = await supabaseClient
      .from('payment_transactions')
      .update({
        metadata: {
          ...transaction.metadata,
          subscription_activated: true,
          subscription_id: newSubscription.id,
          activation_timestamp: new Date().toISOString()
        }
      })
      .eq('id', transaction_id)

    if (updateTransactionError) {
      logError("Failed to update transaction metadata", updateTransactionError)
    }

    logStep("Subscription activation completed successfully")

    return new Response(JSON.stringify({ 
      success: true, 
      subscription_id: newSubscription.id,
      message: 'Subscription activated successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logError("Subscription activation failed", { 
      error: errorMessage, 
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
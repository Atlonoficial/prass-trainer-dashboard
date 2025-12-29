import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Database {
  public: {
    Tables: {
      active_subscriptions: any
      system_payment_config: any
      plan_catalog: any
      payment_transactions: any
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

    console.log('🔄 Starting auto-renewal check...')

    // Buscar configuração global de pagamento
    const { data: paymentConfig, error: configError } = await supabase
      .from('system_payment_config')
      .select('*')
      .eq('gateway_type', 'mercadopago')
      .eq('is_active', true)
      .single()

    if (configError || !paymentConfig) {
      console.error('❌ Payment config not found:', configError)
      throw new Error('Payment system not configured')
    }

    const credentials = paymentConfig.credentials as any
    if (!credentials?.access_token) {
      throw new Error('Mercado Pago access token not configured')
    }

    // Data de hoje + 3 dias (cobrar com antecedência)
    const renewalDate = new Date()
    renewalDate.setDate(renewalDate.getDate() + 3)
    const renewalDateStr = renewalDate.toISOString().split('T')[0]

    console.log(`📅 Checking subscriptions to renew by ${renewalDateStr}...`)

    // Buscar assinaturas ativas com auto_renew = true que expiram em 3 dias
    const { data: subsToRenew, error: fetchError } = await supabase
      .from('active_subscriptions')
      .select(`
        *,
        plan:plan_catalog!plan_id(
          id,
          name,
          price,
          currency,
          interval,
          interval_count
        ),
        profiles!user_id(name, email)
      `)
      .eq('status', 'active')
      .eq('auto_renew', true)
      .eq('end_date', renewalDateStr)

    if (fetchError) {
      console.error('❌ Error fetching subscriptions:', fetchError)
      throw fetchError
    }

    if (!subsToRenew || subsToRenew.length === 0) {
      console.log('ℹ️ No subscriptions to renew')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No subscriptions to renew',
          processed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📊 Found ${subsToRenew.length} subscriptions to renew`)

    let successCount = 0
    let errorCount = 0

    // Processar cada assinatura
    for (const sub of subsToRenew) {
      try {
        console.log(`💳 Processing renewal for subscription ${sub.id}`)

        const plan = sub.plan as any
        if (!plan) {
          console.error(`❌ Plan not found for subscription ${sub.id}`)
          errorCount++
          continue
        }

        // Criar preferência de pagamento no Mercado Pago
        const preference = {
          items: [
            {
              title: `Renovação: ${plan.name}`,
              quantity: 1,
              unit_price: plan.price,
              currency_id: plan.currency || 'BRL'
            }
          ],
          payer: {
            email: sub.profiles?.email || 'unknown@email.com'
          },
          back_urls: {
            success: `${supabaseUrl}/student-payments?renewal=success`,
            failure: `${supabaseUrl}/student-payments?renewal=failure`,
            pending: `${supabaseUrl}/student-payments?renewal=pending`
          },
          auto_return: 'approved',
          external_reference: `renewal_${sub.id}`,
          notification_url: `${supabaseUrl}/functions/v1/process-payment-webhook`,
          metadata: {
            subscription_id: sub.id,
            user_id: sub.user_id,
            teacher_id: sub.teacher_id,
            plan_id: plan.id,
            is_renewal: true
          }
        }

        console.log('📤 Creating Mercado Pago preference...')

        const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${credentials.access_token}`
          },
          body: JSON.stringify(preference)
        })

        if (!mpResponse.ok) {
          const error = await mpResponse.text()
          console.error(`❌ Mercado Pago error for ${sub.id}:`, error)
          errorCount++
          continue
        }

        const mpData = await mpResponse.json()
        console.log(`✅ Checkout created: ${mpData.id}`)

        // Criar registro de transação
        const { error: txError } = await supabase
          .from('payment_transactions')
          .insert({
            student_id: sub.user_id,
            teacher_id: sub.teacher_id,
            plan_id: plan.id,
            amount: plan.price,
            currency: plan.currency || 'BRL',
            status: 'pending',
            gateway: 'mercadopago',
            gateway_transaction_id: mpData.id,
            payment_method: 'auto_renewal',
            metadata: {
              subscription_id: sub.id,
              is_auto_renewal: true,
              checkout_url: mpData.init_point
            }
          })

        if (txError) {
          console.error(`❌ Error creating transaction for ${sub.id}:`, txError)
          errorCount++
          continue
        }

        // Notificar usuário com link de pagamento
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: sub.user_id,
            title: 'Renovação Automática Disponível',
            message: 'Sua assinatura será renovada em breve. Clique para confirmar o pagamento.',
            type: 'auto_renewal',
            metadata: {
              subscription_id: sub.id,
              checkout_url: mpData.init_point,
              amount: plan.price
            }
          })

        if (notifError) {
          console.warn(`⚠️ Warning: Could not send notification to ${sub.user_id}:`, notifError)
        }

        console.log(`✅ Auto-renewal initiated for subscription ${sub.id}`)
        successCount++

      } catch (error) {
        console.error(`❌ Error processing subscription ${sub.id}:`, error)
        errorCount++
      }
    }

    console.log(`✨ Finished auto-renewal. Success: ${successCount}, Errors: ${errorCount}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Auto-renewal processed',
        processed: successCount,
        errors: errorCount,
        total: subsToRenew.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Fatal error in auto-renew-subscriptions:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

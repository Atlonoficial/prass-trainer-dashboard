import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PaymentLinkRequest {
  chargeId: string
  amount: number
  description: string
  studentId: string
  teacherId: string
  planId?: string
  dueDate: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    )

    const { chargeId, amount, description, studentId, teacherId, planId, dueDate }: PaymentLinkRequest = await req.json()

    console.log('🔗 [GENERATE_PAYMENT_LINK] Creating payment link:', { chargeId, amount, studentId })

    // Buscar configurações globais do Mercado Pago
    const { data: settings, error: settingsError } = await supabaseClient
      .from('system_payment_config')
      .select('*')
      .eq('gateway_type', 'mercadopago')
      .eq('is_active', true)
      .single()

    if (settingsError || !settings) {
      throw new Error('Configurações de pagamento não encontradas')
    }

    const credentials = settings.credentials as any
    if (!credentials?.access_token) {
      throw new Error('Access token não configurado')
    }

    // Buscar informações do aluno
    const { data: studentProfile } = await supabaseClient
      .from('profiles')
      .select('email, name, phone')
      .eq('id', studentId)
      .single()

    // Criar preferência de pagamento no Mercado Pago
    const preferenceData = {
      items: [
        {
          title: description,
          quantity: 1,
          unit_price: amount,
          currency_id: 'BRL'
        }
      ],
      payer: {
        email: studentProfile?.email || 'aluno@atlon.app',
        name: studentProfile?.name || 'Aluno',
        phone: studentProfile?.phone ? {
          area_code: studentProfile.phone.substring(0, 2),
          number: studentProfile.phone.substring(2)
        } : undefined
      },
      external_reference: chargeId,
      notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/process-payment-webhook`,
      back_urls: {
        success: `${Deno.env.get("APP_URL") || 'https://app.atlon.app'}/payments/success`,
        failure: `${Deno.env.get("APP_URL") || 'https://app.atlon.app'}/payments/failure`,
        pending: `${Deno.env.get("APP_URL") || 'https://app.atlon.app'}/payments/pending`
      },
      auto_return: 'approved',
      expires: true,
      expiration_date_to: new Date(dueDate).toISOString(),
      metadata: {
        charge_id: chargeId,
        student_id: studentId,
        teacher_id: teacherId,
        plan_id: planId
      }
    }

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferenceData)
    })

    if (!mpResponse.ok) {
      const error = await mpResponse.json()
      console.error('❌ [GENERATE_PAYMENT_LINK] Mercado Pago error:', error)
      throw new Error(`Mercado Pago error: ${error.message}`)
    }

    const preference = await mpResponse.json()
    console.log('✅ [GENERATE_PAYMENT_LINK] Preference created:', preference.id)

    // Atualizar cobrança com link de pagamento
    const { error: updateError } = await supabaseClient
      .from('manual_charges')
      .update({
        payment_link: preference.init_point,
        preference_id: preference.id,
        status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', chargeId)

    if (updateError) {
      console.error('❌ [GENERATE_PAYMENT_LINK] Error updating charge:', updateError)
      throw updateError
    }

    return new Response(JSON.stringify({
      success: true,
      payment_link: preference.init_point,
      preference_id: preference.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('💥 [GENERATE_PAYMENT_LINK] Error:', errorMessage)
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
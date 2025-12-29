// FASE 3: AUTO-CONFIGURAÇÃO DE WEBHOOK NO MERCADO PAGO
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  )

  try {
    // Autenticar professor
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Authorization header required')

    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabaseClient.auth.getUser(token)

    if (!user) throw new Error('Unauthorized')

    console.log('[MP-WEBHOOK-CONFIG] Configuring webhook for teacher:', user.id)

    // Buscar configuração global do sistema
    const { data: settings, error: settingsError } = await supabaseClient
      .from('system_payment_config')
      .select('*')
      .eq('gateway_type', 'mercadopago')
      .eq('is_active', true)
      .single()

    if (settingsError || !settings) {
      throw new Error('Sistema de pagamentos não configurado. Contate o administrador.')
    }

    const credentials = settings.credentials as any
    const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/process-payment-webhook`

    console.log('[MP-WEBHOOK-CONFIG] Creating webhook:', webhookUrl)

    // Configurar webhook no Mercado Pago
    const response = await fetch('https://api.mercadopago.com/v1/webhooks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: webhookUrl,
        events: [
          { topic: 'payment', status: '*' },
          { topic: 'merchant_order', status: '*' }
        ]
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(`Mercado Pago error: ${JSON.stringify(data)}`)
    }

    console.log('[MP-WEBHOOK-CONFIG] Webhook created:', data.id)

    // Salvar webhook_id na configuração global
    await supabaseClient
      .from('system_payment_config')
      .update({
        webhook_id: data.id,
        webhook_url: webhookUrl
      })
      .eq('gateway_type', 'mercadopago')

    return new Response(JSON.stringify({ 
      success: true, 
      webhook_id: data.id,
      url: webhookUrl 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (error: any) {
    console.error('[MP-WEBHOOK-CONFIG] Error:', error)
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.toString() 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

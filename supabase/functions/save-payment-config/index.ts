import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Autenticar usuário
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      console.error('Authentication error:', authError)
      throw new Error('Unauthorized')
    }

    console.log('User authenticated:', user.id)

    // Verificar se usuário é teacher
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    if (!profile || profile.user_type !== 'teacher') {
      console.error('User is not a teacher:', user.id)
      throw new Error('Only teachers can manage payment configuration')
    }

    console.log('User is teacher, proceeding...')

    // Obter configuração do body
    const { config } = await req.json()

    if (!config || !config.access_token) {
      throw new Error('Access token is required')
    }

    console.log('Validating access token with Mercado Pago...')

    // Validar Access Token com Mercado Pago
    const mpResponse = await fetch('https://api.mercadopago.com/v1/users/me', {
      headers: {
        'Authorization': `Bearer ${config.access_token}`
      }
    })

    if (!mpResponse.ok) {
      console.error('Mercado Pago validation failed:', await mpResponse.text())
      throw new Error('Invalid Mercado Pago credentials')
    }

    const mpData = await mpResponse.json()
    console.log('Mercado Pago validation successful:', mpData.nickname)

    // Salvar configuração usando service role
    const { data, error } = await supabaseClient
      .from('system_payment_config')
      .upsert({
        gateway_type: 'mercadopago',
        credentials: {
          access_token: config.access_token,
          public_key: config.public_key || null,
          client_id: config.client_id || null,
          client_secret: config.client_secret || null
        },
        is_active: config.is_active,
        is_sandbox: config.is_sandbox,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'gateway_type'
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    console.log('Configuration saved successfully:', data.id)

    // Registrar auditoria
    await supabaseClient
      .from('payment_audit_log')
      .insert({
        user_id: user.id,
        action: 'UPDATE',
        table_name: 'system_payment_config',
        record_id: data.id,
        new_data: {
          gateway_type: 'mercadopago',
          is_active: config.is_active,
          is_sandbox: config.is_sandbox,
          updated_by: user.id,
          mercado_pago_account: mpData.nickname
        }
      })

    console.log('Audit log created')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Configuração salva com sucesso',
        mercado_pago_account: mpData.nickname,
        account_id: mpData.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in save-payment-config:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

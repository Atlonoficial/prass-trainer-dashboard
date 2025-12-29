import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString()
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : ''
  console.log(`[${timestamp}] [CREATE-CHECKOUT] ${step}${detailsStr}`)
}

const logError = (message: string, error: any) => {
  const timestamp = new Date().toISOString()
  console.error(`[${timestamp}] [CREATE-CHECKOUT] ERROR - ${message}:`, error)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    logStep("🚀 Function started", { method: req.method, url: req.url })

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    )
    logStep("✅ Supabase client initialized")

    const body = await req.json()
    logStep("📝 Request body parsed", { 
      payment_method: body.payment_method,
      plan_id: body.plan_id,
      course_id: body.course_id
    })

    // Get user from JWT token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Authorization header missing')
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error(`Authentication failed: ${authError?.message}`)
    }

    logStep("✅ User authenticated", { userId: user.id, email: user.email })

    // Determine transaction context - SIMPLIFIED FOR AUTO-PURCHASES
    const context = {
      type: 'auto_purchase',
      teacher_id: user.id,
      student_id: user.id,
      description: 'User purchasing plan'
    }

    logStep("✅ Transaction context determined", { context })

    let itemData: any
    let itemType = 'plan'
    
    if (body.plan_id) {
      logStep("📋 Fetching plan data", { plan_id: body.plan_id })
      
      const { data: plan, error: planError } = await supabaseClient
        .from('plan_catalog')
        .select('*')
        .eq('id', body.plan_id)
        .eq('is_active', true)
        .single()

      if (planError || !plan) {
        throw new Error(`Plan not found or not active: ${planError?.message}`)
      }

      itemData = {
        id: plan.id,
        name: plan.name,
        price: plan.price,
        currency: plan.currency || 'BRL',
        teacher_id: plan.teacher_id
      }
      
      logStep("✅ Plan found", { plan: itemData.name, price: itemData.price, teacher: itemData.teacher_id })
      
    } else if (body.course_id) {
      itemType = 'course'
      logStep("📚 Fetching course data", { course_id: body.course_id })
      
      const { data: course, error: courseError } = await supabaseClient
        .from('courses')
        .select('*')
        .eq('id', body.course_id)
        .eq('is_published', true)
        .single()

      if (courseError || !course) {
        throw new Error(`Course not found or not published: ${courseError?.message}`)
      }

      itemData = {
        id: course.id,
        name: course.title,
        price: course.price,
        currency: 'BRL',
        teacher_id: course.instructor
      }
      
      logStep("✅ Course found", { course: itemData.name, price: itemData.price, teacher: itemData.teacher_id })
      
    } else {
      throw new Error('Either plan_id or course_id must be provided')
    }

    // Get payment settings for this teacher (plan owner)
    logStep("💳 Fetching global payment settings", {})
    
    // FASE 1: Usar configuração global do sistema
    const { data: paymentSettings, error: settingsError } = await supabaseClient
      .from('system_payment_config')
      .select('*')
      .eq('gateway_type', 'mercadopago')
      .eq('is_active', true)
      .single()

    if (settingsError || !paymentSettings) {
      logError("❌ Global payment settings not found", { error: settingsError })
      throw new Error(`Sistema de pagamentos não configurado. Contate o administrador.`)
    }

    logStep("📄 Payment settings found", { 
      settings_id: paymentSettings.id,
      gateway_type: paymentSettings.gateway_type,
      credentials_structure: typeof paymentSettings.credentials,
      credentials_keys: paymentSettings.credentials ? Object.keys(paymentSettings.credentials) : []
    })

    const credentials = paymentSettings.credentials as any
    
    // Validação mais detalhada das credenciais
    if (!credentials) {
      logError("❌ Credentials object is null/undefined", { paymentSettings })
      throw new Error('Mercado Pago credentials not configured - credentials object is missing')
    }

    if (typeof credentials !== 'object') {
      logError("❌ Credentials is not an object", { credentials, type: typeof credentials })
      throw new Error('Mercado Pago credentials malformed - not an object')
    }

    if (!credentials.access_token) {
      logError("❌ Access token not found in credentials", { 
        credentials_keys: Object.keys(credentials),
        credentials_sample: { ...credentials, access_token: credentials.access_token ? '[PRESENT]' : '[MISSING]' }
      })
      throw new Error('Mercado Pago access_token not configured')
    }

    // Validação extra de access_token
    if (credentials.access_token.trim() === '') {
      logError("❌ Access token is empty or whitespace", { access_token_length: credentials.access_token.length })
      throw new Error('Access token is empty or contains only whitespace')
    }

    if (credentials.access_token.includes('map[') || credentials.access_token === 'map[]') {
      logError("❌ Access token is corrupted", { access_token_sample: credentials.access_token.substring(0, 20) })
      throw new Error('Access token is corrupted (contains "map[]" - known serialization bug)')
    }

    logStep("✅ Mercado Pago credentials validated", { 
      access_token_length: credentials.access_token.length,
      access_token_prefix: credentials.access_token.substring(0, 15) + '...',
      is_production: credentials.access_token.startsWith('APP_USR-')
    })

    // Create Mercado Pago preference
    logStep("Creating Mercado Pago payment", { 
      item: itemData.name, 
      price: itemData.price 
    })

    // FASE 4: Filtrar métodos de pagamento baseado na seleção
    const getPaymentMethodsConfig = (method: string) => {
      switch(method) {
        case 'pix':
          return {
            excluded_payment_types: [
              { id: 'credit_card' },
              { id: 'debit_card' },
              { id: 'ticket' }
            ],
            installments: 1
          }
        case 'credit_card':
          return {
            excluded_payment_types: [
              { id: 'ticket' },
              { id: 'bank_transfer' },
              { id: 'debit_card' }
            ],
            installments: 12
          }
        case 'debit_card':
          return {
            excluded_payment_types: [
              { id: 'ticket' },
              { id: 'bank_transfer' },
              { id: 'credit_card' }
            ],
            installments: 1
          }
        case 'boleto':
          return {
            excluded_payment_types: [
              { id: 'credit_card' },
              { id: 'debit_card' },
              { id: 'bank_transfer' }
            ],
            excluded_payment_methods: [{ id: 'pec' }],
            installments: 1
          }
        default:
          return {
            excluded_payment_types: [],
            installments: 12
          }
      }
    }

    const preferenceData = {
      items: [{
        id: itemData.id,
        title: itemData.name,
        description: `Assinatura do plano ${itemData.name}`,
        quantity: 1,
        currency_id: itemData.currency,
        unit_price: Number(itemData.price)
      }],
      payer: {
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'Cliente',
        email: user.email
      },
      payment_methods: getPaymentMethodsConfig(body.payment_method || 'pix'),
      back_urls: {
        success: `${Deno.env.get("SUPABASE_URL")?.replace('supabase.co', 'lovableproject.com') || ''}/payment-success`,
        failure: `${Deno.env.get("SUPABASE_URL")?.replace('supabase.co', 'lovableproject.com') || ''}/payment-cancelled`,
        pending: `${Deno.env.get("SUPABASE_URL")?.replace('supabase.co', 'lovableproject.com') || ''}/payment-pending`
      },
      auto_return: 'approved',
      external_reference: `${itemType}_${itemData.id}_${user.id}_${Date.now()}`,
      notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/process-payment-webhook`
    }

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preferenceData)
    })

    logStep("Mercado Pago API response", { status: mpResponse.status, ok: mpResponse.ok })

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text()
      throw new Error(`Mercado Pago API error: ${mpResponse.status} - ${errorText}`)
    }

    const mpData = await mpResponse.json()
    logStep("Mercado Pago payment created successfully", { 
      preference_id: mpData.id,
      init_point: mpData.init_point,
      sandbox_init_point: mpData.sandbox_init_point 
    })

    // Use sandbox URL if in sandbox mode
    const checkoutUrl = credentials.is_sandbox ? mpData.sandbox_init_point : mpData.init_point

    // VALIDAR DADOS ANTES DE INSERIR TRANSAÇÃO
    const { data: isValid, error: validationError } = await supabaseClient.rpc('validate_transaction_data_enhanced', {
      p_teacher_id: itemData.teacher_id,
      p_student_id: user.id,
      p_amount: Number(itemData.price),
      p_item_type: itemType,
      p_plan_catalog_id: body.plan_id
    })

    if (validationError) {
      throw new Error(`Validation failed: ${validationError.message}`)
    }

    // Insert transaction record
    logStep("💾 Inserting transaction into database", {
      teacher_id: itemData.teacher_id,
      student_id: user.id,
      amount: itemData.price,
      item_type: itemType,
      plan_catalog_id: body.plan_id
    })

    const { data: transaction, error: transactionError } = await supabaseClient
      .from('payment_transactions')
      .insert({
        teacher_id: itemData.teacher_id,
        student_id: user.id,
        amount: Number(itemData.price),
        currency: itemData.currency,
        gateway_type: 'mercadopago',
        gateway_transaction_id: preferenceData.external_reference,
        gateway_preference_id: mpData.id,
        status: 'pending',
        payment_method: body.payment_method || 'pix',
        checkout_url: checkoutUrl,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        item_type: itemType,
        item_name: itemData.name,
        plan_catalog_id: body.plan_id || null,
        course_id: body.course_id || null,
        metadata: {
          created_via: 'enhanced_checkout',
          mercado_pago_preference: mpData,
          customer_data: {
            name: user.user_metadata?.name || user.email?.split('@')[0],
            email: user.email
          },
          plan_id: body.plan_id || null,
          course_id: body.course_id || null
        }
      })
      .select()
      .single()

    if (transactionError) {
      logError("💥 Transaction insertion failed", transactionError)
      throw new Error(`Transaction insertion failed: ${transactionError.message}`)
    }

    logStep("✅ Transaction created successfully", { 
      transaction_id: transaction.id,
      checkout_url: checkoutUrl 
    })

    return new Response(JSON.stringify({
      success: true,
      checkout_url: checkoutUrl,
      transaction_id: transaction.id,
      preference_id: mpData.id,
      message: 'Checkout criado com sucesso!'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logError("💥 Function execution failed", error)
    
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
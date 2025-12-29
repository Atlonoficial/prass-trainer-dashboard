import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-platform',
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : ''
  console.log(`[UNIFIED-WEBHOOK] ${step}${detailsStr}`)
}

const logError = (message: string, error: any) => {
  console.error(`[UNIFIED-WEBHOOK] ERROR - ${message}:`, error)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url);
    // Extract gateway from path (e.g., /payment-webhook/mercadopago) or default to mercadopago if not present
    const pathParts = url.pathname.split('/');
    const gateway = pathParts.length > 1 && pathParts[pathParts.length - 1] !== 'process-payment-webhook'
      ? pathParts[pathParts.length - 1]
      : 'mercadopago';

    logStep(`Webhook received for gateway: ${gateway}`)

    if (req.method === 'GET') {
      return new Response('Webhook is active', { status: 200, headers: corsHeaders });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    )

    let body;
    try {
      body = await req.json()
    } catch (e) {
      // Stripe sends raw body for signature verification, but here we assume JSON for simplicity or handle text
      body = {}
      logStep("Could not parse JSON body, might be raw stream")
    }

    logStep("Webhook body received", { type: body.type, data_id: body.data?.id })

    // 1. IDEMPOTENCY CHECK
    const webhookId = generateWebhookId(gateway, body);

    const { data: existingWebhook } = await supabaseClient
      .from('webhook_events')
      .select('id, processed')
      .eq('webhook_id', webhookId)
      .single()

    if (existingWebhook?.processed) {
      logStep("Webhook already processed, skipping", { webhook_id: webhookId })
      return new Response(JSON.stringify({ success: true, message: 'Already processed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Register webhook event
    await supabaseClient
      .from('webhook_events')
      .upsert({
        webhook_id: webhookId,
        event_type: body.type || 'unknown',
        payload: body,
        processed: false
      })

    // 2. PROCESS GATEWAY SPECIFIC LOGIC
    let paymentResult;

    switch (gateway) {
      case 'mercadopago':
        paymentResult = await handleMercadoPago(body, supabaseClient);
        break;
      case 'stripe':
        // Placeholder for Stripe logic
        logStep("Stripe handling not fully implemented yet");
        break;
      default:
        logStep(`Gateway ${gateway} not supported yet`);
    }

    if (!paymentResult) {
      logStep("No actionable payment data found");
      return new Response(JSON.stringify({ success: true, message: 'Ignored' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 3. UPDATE TRANSACTION & POST-PROCESSING
    const { transaction, status, rawData } = paymentResult;

    if (transaction) {
      // Update transaction
      const { error: updateError } = await supabaseClient
        .from('payment_transactions')
        .update({
          status: status,
          gateway_payment_id: rawData.id?.toString(),
          gateway_response: rawData,
          paid_at: status === 'paid' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.id)

      if (updateError) throw updateError;

      logStep("Transaction updated", { id: transaction.id, status })

      // If paid, trigger post-processing
      if (status === 'paid') {
        await processSuccessfulPayment(supabaseClient, transaction, rawData.id?.toString());
      }
    }

    // 4. MARK WEBHOOK AS PROCESSED
    await supabaseClient
      .from('webhook_events')
      .update({
        processed: true,
        processed_at: new Date().toISOString()
      })
      .eq('webhook_id', webhookId)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logError("Webhook processing failed", {
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

// --- HELPERS ---

function generateWebhookId(gateway: string, body: any): string {
  if (gateway === 'mercadopago') {
    return `mp_${body.type}_${body.data?.id || body.id}_${Date.now()}`
  }
  return `${gateway}_${Date.now()}_${Math.random()}`
}

async function handleMercadoPago(body: any, supabaseClient: any) {
  if (body.type !== 'payment') return null;

  const paymentId = body.data.id;
  logStep("Processing MercadoPago payment", { paymentId });

  // Find transaction
  // Try finding by gateway_payment_id first, then fallback to external_reference logic if needed
  // But we need to fetch the payment details from MP first to get the external_reference if we don't have it

  // Strategy: Fetch payment from MP using credentials. 
  // Problem: Which credentials? We need the teacher_id to get credentials.
  // Solution: Try to find transaction by `gateway_payment_id` (if we saved it during creation)
  // OR try to find by `gateway_preference_id` if MP sends it (usually in `order.id` or similar).

  // Let's try to find the transaction first to see if we already have the link
  let { data: transaction } = await supabaseClient
    .from('payment_transactions')
    .select('*')
    .eq('gateway_payment_id', paymentId.toString())
    .maybeSingle();

  // If not found, we might need to fetch from MP using a "System" token first to identify the payment?
  // Or we assume we can't process it without knowing the teacher.
  // WAIT: The Mobile code used `external_reference` from the webhook body to find the transaction.
  // MP webhooks usually don't send `external_reference` in the light body, only `data.id`.
  // We MUST fetch the payment details.

  // We will try to use SYSTEM credentials first to fetch the payment details.
  // If that fails (unauthorized), it means it belongs to a teacher with custom credentials.
  // This is tricky. 

  // ALTERNATIVE: Iterate over all teachers? No.
  // BETTER: When creating the preference, we should store the `payment_id` if possible, but we don't have it yet.

  // Let's try to find by `gateway_preference_id` if possible? No, MP webhook doesn't send it directly.

  // Let's assume we have a Global Master Token that can read all, OR we try to find the transaction by other means?
  // Actually, `payment_transactions` usually stores `gateway_preference_id`.

  // Let's try to fetch the payment using the SYSTEM credentials first.
  let paymentData;
  let teacherId;

  try {
    const systemCreds = await getCredentials(supabaseClient, null, 'mercadopago'); // Get system creds
    if (systemCreds) {
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { 'Authorization': `Bearer ${systemCreds.access_token}` }
      });
      if (response.ok) {
        paymentData = await response.json();
        logStep("Fetched payment using System Credentials");
      }
    }
  } catch (e) {
    logStep("Failed to fetch with system creds, or no system creds");
  }

  // If we still don't have paymentData, we are in trouble if we can't link it to a transaction.
  // But wait, if we found the transaction earlier by `gateway_payment_id`, we know the teacher!

  if (!paymentData && transaction) {
    // We have the teacher, try their credentials
    const teacherCreds = await getCredentials(supabaseClient, transaction.teacher_id, 'mercadopago');
    if (teacherCreds) {
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { 'Authorization': `Bearer ${teacherCreds.access_token}` }
      });
      if (response.ok) {
        paymentData = await response.json();
      }
    }
  }

  if (!paymentData) {
    // Last resort: If we haven't found the transaction yet, and can't fetch payment data...
    // We can't do anything.
    logStep("Could not fetch payment details from MP. Skipping.");
    return null;
  }

  // Now we have paymentData. We can find the transaction by `external_reference` if we didn't have it.
  if (!transaction && paymentData.external_reference) {
    const { data: t } = await supabaseClient
      .from('payment_transactions')
      .select('*')
      .eq('id', paymentData.external_reference)
      .maybeSingle();
    transaction = t;
  }

  if (!transaction) {
    logStep("Transaction not found even with external_reference");
    return null;
  }

  return {
    transaction,
    status: mapMercadoPagoStatus(paymentData.status),
    rawData: paymentData
  };
}

async function getCredentials(supabase: any, teacherId: string | null, gateway: string) {
  // 1. Try Teacher Settings if teacherId is provided
  if (teacherId) {
    const { data: teacherSettings } = await supabase
      .from('teacher_payment_settings')
      .select('credentials')
      .eq('teacher_id', teacherId)
      .maybeSingle();

    if (teacherSettings?.credentials) {
      // Handle potential structure differences
      const creds = teacherSettings.credentials[gateway] || teacherSettings.credentials;
      if (creds?.access_token) return creds;
    }
  }

  // 2. Fallback to System Settings
  const { data: systemSettings } = await supabase
    .from('system_payment_config')
    .select('credentials')
    .eq('gateway_type', gateway)
    .eq('is_active', true)
    .maybeSingle();

  if (systemSettings?.credentials) {
    return systemSettings.credentials;
  }

  return null;
}

function mapMercadoPagoStatus(status: string): string {
  const map: Record<string, string> = {
    'approved': 'paid',
    'pending': 'pending',
    'in_process': 'pending',
    'rejected': 'failed',
    'cancelled': 'cancelled',
    'refunded': 'refunded'
  };
  return map[status] || 'pending';
}

async function processSuccessfulPayment(supabaseClient: any, transaction: any, gatewayPaymentId: string) {
  logStep("Processing successful payment logic", { transactionId: transaction.id });

  const metadata = transaction.metadata || {};

  // 1. Activate Plan
  if (metadata.plan_id || transaction.plan_catalog_id) {
    await activatePlanSubscription(supabaseClient, transaction, metadata.plan_id || transaction.plan_catalog_id);
  }

  // 2. Activate Course
  if (metadata.course_id || transaction.course_id) {
    await activateCourseAccess(supabaseClient, transaction, metadata.course_id || transaction.course_id);
  }

  // 3. Manual Charges
  // Check if there is a manual charge linked to this transaction OR gateway_payment_id
  const { data: manualCharge } = await supabaseClient
    .from('manual_charges')
    .select('*')
    .or(`payment_transaction_id.eq.${transaction.id},gateway_charge_id.eq.${gatewayPaymentId}`)
    .maybeSingle();

  if (manualCharge) {
    await processManualCharge(supabaseClient, manualCharge, transaction);
  }

  // 4. Gamification
  await supabaseClient.rpc('award_points_enhanced_v3', {
    p_user_id: transaction.student_id,
    p_activity_type: 'purchase_completed',
    p_description: `Compra realizada - ${transaction.amount} BRL`,
    p_metadata: { transaction_id: transaction.id, amount: transaction.amount }
  });

  // 5. Notifications
  await notifyUsers(supabaseClient, transaction);
}

async function activatePlanSubscription(supabaseClient: any, transaction: any, planId: string) {
  const { data: plan } = await supabaseClient.from('plan_catalog').select('*').eq('id', planId).single();
  if (!plan) return;

  const startDate = new Date();
  let endDate = new Date();

  switch (plan.interval) {
    case 'monthly': endDate.setMonth(endDate.getMonth() + 1); break;
    case 'quarterly': endDate.setMonth(endDate.getMonth() + 3); break;
    case 'yearly': endDate.setFullYear(endDate.getFullYear() + 1); break;
    default: endDate.setMonth(endDate.getMonth() + 1);
  }

  await supabaseClient.from('active_subscriptions').insert({
    user_id: transaction.student_id,
    teacher_id: transaction.teacher_id,
    plan_id: planId,
    status: 'active',
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
    transaction_id: transaction.id,
    features: plan.features || []
  });
  logStep("Plan activated");
}

async function activateCourseAccess(supabaseClient: any, transaction: any, courseId: string) {
  await supabaseClient.from('user_purchases').insert({
    user_id: transaction.student_id,
    course_id: courseId,
    order_id: transaction.id,
    purchase_type: 'course',
    access_granted_at: new Date().toISOString()
  });

  // Update enrolled users array
  const { data: course } = await supabaseClient.from('courses').select('enrolled_users').eq('id', courseId).single();
  if (course) {
    const enrolled = course.enrolled_users || [];
    if (!enrolled.includes(transaction.student_id)) {
      await supabaseClient.from('courses').update({
        enrolled_users: [...enrolled, transaction.student_id]
      }).eq('id', courseId);
    }
  }
  logStep("Course access granted");
}

async function processManualCharge(supabaseClient: any, manualCharge: any, transaction: any) {
  await supabaseClient.from('manual_charges').update({
    status: 'paid',
    paid_at: new Date().toISOString(),
    payment_transaction_id: transaction.id
  }).eq('id', manualCharge.id);

  if (manualCharge.content_to_unlock && Array.isArray(manualCharge.content_to_unlock)) {
    const unlocks = manualCharge.content_to_unlock.map((content: any) => ({
      student_id: manualCharge.student_id,
      content_type: content.type,
      content_id: content.id,
      unlocked_by: 'payment',
      charge_id: manualCharge.id
    }));
    await supabaseClient.from('content_unlocks').insert(unlocks);
  }
  logStep("Manual charge processed");
}

async function notifyUsers(supabaseClient: any, transaction: any) {
  // Notify Teacher
  await supabaseClient.functions.invoke('send-push-notification', {
    body: {
      user_ids: [transaction.teacher_id],
      title: '💰 Nova Venda!',
      message: `Você recebeu uma nova venda de R$ ${transaction.amount}`,
      data: { type: 'sale_notification', transaction_id: transaction.id }
    }
  });

  // Notify Student
  await supabaseClient.functions.invoke('send-push-notification', {
    body: {
      user_ids: [transaction.student_id],
      title: '🎉 Pagamento Aprovado!',
      message: `Seu pagamento foi confirmado!`,
      data: { type: 'payment_approved', transaction_id: transaction.id }
    }
  });
}
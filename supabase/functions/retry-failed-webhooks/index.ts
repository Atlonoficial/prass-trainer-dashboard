// FASE 4: SISTEMA DE RETRY PARA WEBHOOKS FALHADOS
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
    console.log('[WEBHOOK-RETRY] Starting retry process...')

    // Buscar webhooks não processados (até 5 tentativas)
    const { data: failedWebhooks, error: fetchError } = await supabaseClient
      .from('webhook_events')
      .select('*')
      .eq('processed', false)
      .lt('retry_count', 5)
      .order('created_at', { ascending: true })
      .limit(10)

    if (fetchError) throw fetchError

    if (!failedWebhooks || failedWebhooks.length === 0) {
      console.log('[WEBHOOK-RETRY] No failed webhooks to retry')
      return new Response(JSON.stringify({ message: 'No failed webhooks' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    console.log(`[WEBHOOK-RETRY] Found ${failedWebhooks.length} webhooks to retry`)

    const results = []

    for (const webhook of failedWebhooks) {
      try {
        console.log(`[WEBHOOK-RETRY] Retrying webhook ${webhook.webhook_id} (attempt ${webhook.retry_count + 1})`)

        // Reprocessar webhook
        const response = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/process-payment-webhook`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhook.payload)
          }
        )

        if (response.ok) {
          await supabaseClient
            .from('webhook_events')
            .update({
              processed: true,
              processed_at: new Date().toISOString(),
              retry_count: webhook.retry_count + 1
            })
            .eq('id', webhook.id)

          console.log(`[WEBHOOK-RETRY] Success: ${webhook.webhook_id}`)
          results.push({ webhook_id: webhook.webhook_id, status: 'success' })
        } else {
          const errorText = await response.text()
          throw new Error(`HTTP ${response.status}: ${errorText}`)
        }
      } catch (error: any) {
        console.error(`[WEBHOOK-RETRY] Failed: ${webhook.webhook_id}`, error)
        
        await supabaseClient
          .from('webhook_events')
          .update({
            retry_count: webhook.retry_count + 1,
            last_error: error.message
          })
          .eq('id', webhook.id)

        results.push({ 
          webhook_id: webhook.webhook_id, 
          status: 'failed', 
          error: error.message 
        })
      }
    }

    console.log('[WEBHOOK-RETRY] Retry process completed', { results })

    return new Response(JSON.stringify({ 
      success: true,
      processed: results.length,
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (error: any) {
    console.error('[WEBHOOK-RETRY] Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

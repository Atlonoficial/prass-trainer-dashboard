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

  try {
    console.log('[CHECK-OVERDUE] Starting overdue check...')

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    )

    // Buscar cobranças pendentes com data vencida
    const today = new Date().toISOString().split('T')[0]
    
    const { data: overdueCharges, error: fetchError } = await supabaseClient
      .from('manual_charges')
      .select('id, due_date, student_id, amount')
      .eq('status', 'pending')
      .lt('due_date', today)

    if (fetchError) {
      console.error('[CHECK-OVERDUE] Error fetching charges:', fetchError)
      throw fetchError
    }

    console.log(`[CHECK-OVERDUE] Found ${overdueCharges?.length || 0} overdue charges`)

    if (overdueCharges && overdueCharges.length > 0) {
      // Atualizar status para overdue
      const { error: updateError } = await supabaseClient
        .from('manual_charges')
        .update({ status: 'overdue' })
        .in('id', overdueCharges.map(c => c.id))

      if (updateError) {
        console.error('[CHECK-OVERDUE] Error updating charges:', updateError)
        throw updateError
      }

      console.log(`[CHECK-OVERDUE] ✅ Updated ${overdueCharges.length} charges to overdue`)
    }

    return new Response(JSON.stringify({ 
      success: true, 
      updated: overdueCharges?.length || 0,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('[CHECK-OVERDUE] Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

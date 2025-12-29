import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Database {
  public: {
    Tables: {
      active_subscriptions: any
      students: any
      profiles: any
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

    console.log('🔍 Starting expired subscriptions check...')

    // Buscar assinaturas que expiraram (end_date < hoje E status = 'active')
    const { data: expiredSubs, error: fetchError } = await supabase
      .from('active_subscriptions')
      .select('*, profiles!user_id(name, email)')
      .eq('status', 'active')
      .lt('end_date', new Date().toISOString().split('T')[0])

    if (fetchError) {
      console.error('❌ Error fetching expired subscriptions:', fetchError)
      throw fetchError
    }

    console.log(`📊 Found ${expiredSubs?.length || 0} expired subscriptions`)

    if (!expiredSubs || expiredSubs.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No expired subscriptions found',
          processed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let processedCount = 0
    let errorCount = 0

    // Processar cada assinatura expirada
    for (const sub of expiredSubs) {
      try {
        console.log(`⏰ Processing expired subscription: ${sub.id} for user ${sub.user_id}`)

        // 1. Atualizar status para 'expired'
        const { error: updateSubError } = await supabase
          .from('active_subscriptions')
          .update({ 
            status: 'expired',
            updated_at: new Date().toISOString()
          })
          .eq('id', sub.id)

        if (updateSubError) {
          console.error(`❌ Error updating subscription ${sub.id}:`, updateSubError)
          errorCount++
          continue
        }

        // 2. Remover acesso do estudante (atualizar membership_expiry para null)
        const { error: updateStudentError } = await supabase
          .from('students')
          .update({ 
            membership_status: 'inactive',
            membership_expiry: null,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', sub.user_id)

        if (updateStudentError) {
          console.error(`❌ Error updating student ${sub.user_id}:`, updateStudentError)
          errorCount++
          continue
        }

        // 3. Criar notificação para o aluno
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: sub.user_id,
            title: 'Assinatura Expirada',
            message: 'Sua assinatura expirou. Renove agora para continuar acessando o conteúdo exclusivo!',
            type: 'subscription_expired',
            metadata: {
              subscription_id: sub.id,
              expired_at: sub.end_date
            }
          })

        if (notificationError) {
          console.warn(`⚠️ Warning: Could not create notification for user ${sub.user_id}:`, notificationError)
        }

        console.log(`✅ Successfully processed expired subscription ${sub.id}`)
        processedCount++

      } catch (error) {
        console.error(`❌ Error processing subscription ${sub.id}:`, error)
        errorCount++
      }
    }

    console.log(`✨ Finished processing. Success: ${processedCount}, Errors: ${errorCount}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Expired subscriptions processed',
        processed: processedCount,
        errors: errorCount,
        total: expiredSubs.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Fatal error in check-expired-subscriptions:', error)
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

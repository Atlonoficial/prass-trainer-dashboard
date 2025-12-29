import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Database {
  public: {
    Tables: {
      active_subscriptions: any
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

    console.log('📬 Starting expiry reminder check...')

    const today = new Date()
    const dates = {
      in7days: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      in3days: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      in1day: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }

    console.log('📅 Checking for subscriptions expiring on:', dates)

    let totalNotifications = 0

    // Processar para cada período (7, 3, e 1 dia)
    for (const [period, date] of Object.entries(dates)) {
      const daysLeft = period === 'in7days' ? 7 : period === 'in3days' ? 3 : 1

      console.log(`🔍 Checking subscriptions expiring ${period} (${date})...`)

      // Buscar assinaturas que expiram nessa data
      const { data: expiringSubs, error: fetchError } = await supabase
        .from('active_subscriptions')
        .select('*, profiles!user_id(name, email)')
        .eq('status', 'active')
        .eq('end_date', date)

      if (fetchError) {
        console.error(`❌ Error fetching ${period} subscriptions:`, fetchError)
        continue
      }

      if (!expiringSubs || expiringSubs.length === 0) {
        console.log(`ℹ️ No subscriptions expiring ${period}`)
        continue
      }

      console.log(`📊 Found ${expiringSubs.length} subscriptions expiring ${period}`)

      // Criar notificação para cada assinatura
      for (const sub of expiringSubs) {
        try {
          // Verificar se já foi notificado para este período
          const notificationKey = `reminder_${daysLeft}days`
          const metadata = sub.metadata as any || {}
          
          if (metadata[notificationKey]) {
            console.log(`⏭️ Already notified ${sub.user_id} for ${period}`)
            continue
          }

          // Criar notificação
          const { error: notificationError } = await supabase
            .from('notifications')
            .insert({
              user_id: sub.user_id,
              title: `Assinatura expira em ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}`,
              message: `Sua assinatura expira em breve! Renove agora para continuar acessando todo o conteúdo.`,
              type: 'subscription_expiring',
              metadata: {
                subscription_id: sub.id,
                days_left: daysLeft,
                end_date: sub.end_date
              }
            })

          if (notificationError) {
            console.error(`❌ Error creating notification for ${sub.user_id}:`, notificationError)
            continue
          }

          // Marcar como notificado no metadata da assinatura
          const updatedMetadata = {
            ...metadata,
            [notificationKey]: new Date().toISOString()
          }

          const { error: updateError } = await supabase
            .from('active_subscriptions')
            .update({ metadata: updatedMetadata })
            .eq('id', sub.id)

          if (updateError) {
            console.warn(`⚠️ Warning: Could not update metadata for ${sub.id}:`, updateError)
          }

          console.log(`✅ Reminder sent to ${sub.user_id} for ${period}`)
          totalNotifications++

        } catch (error) {
          console.error(`❌ Error processing reminder for ${sub.id}:`, error)
        }
      }
    }

    console.log(`✨ Finished sending reminders. Total: ${totalNotifications}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Expiry reminders sent',
        notifications_sent: totalNotifications
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Fatal error in send-expiry-reminders:', error)
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

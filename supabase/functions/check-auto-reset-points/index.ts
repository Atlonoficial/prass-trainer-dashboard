import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GamificationSettings {
  id: string;
  teacher_id: string;
  auto_reset_enabled: boolean;
  next_reset_date: string | null;
  reset_frequency: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[Auto-Reset] Starting automatic reset check...');

    // Buscar todas as configurações com reset automático habilitado
    const { data: settings, error: fetchError } = await supabase
      .from('gamification_settings')
      .select('*')
      .eq('auto_reset_enabled', true)
      .not('next_reset_date', 'is', null)
      .lte('next_reset_date', new Date().toISOString());

    if (fetchError) {
      console.error('[Auto-Reset] Error fetching settings:', fetchError);
      throw fetchError;
    }

    if (!settings || settings.length === 0) {
      console.log('[Auto-Reset] No pending resets found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No pending resets',
          processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Auto-Reset] Found ${settings.length} teacher(s) with pending reset`);

    const results = [];

    for (const setting of settings as GamificationSettings[]) {
      try {
        console.log(`[Auto-Reset] Processing reset for teacher ${setting.teacher_id}`);

        // Executar o reset automático
        const { error: resetError } = await supabase.rpc('reset_all_student_points', {
          p_teacher_id: setting.teacher_id,
          p_reason: `Reset automático - ${getFrequencyLabel(setting.reset_frequency)}`
        });

        if (resetError) {
          console.error(`[Auto-Reset] Error resetting points for teacher ${setting.teacher_id}:`, resetError);
          results.push({
            teacher_id: setting.teacher_id,
            success: false,
            error: resetError.message
          });
          continue;
        }

        // Calcular próxima data de reset
        const nextResetDate = calculateNextResetDate(setting.reset_frequency);

        // Atualizar a próxima data de reset
        const { error: updateError } = await supabase
          .from('gamification_settings')
          .update({ next_reset_date: nextResetDate })
          .eq('id', setting.id);

        if (updateError) {
          console.error(`[Auto-Reset] Error updating next reset date for teacher ${setting.teacher_id}:`, updateError);
        }

        console.log(`[Auto-Reset] Successfully reset points for teacher ${setting.teacher_id}. Next reset: ${nextResetDate}`);

        results.push({
          teacher_id: setting.teacher_id,
          success: true,
          next_reset_date: nextResetDate
        });

      } catch (error) {
        console.error(`[Auto-Reset] Unexpected error for teacher ${setting.teacher_id}:`, error);
        results.push({
          teacher_id: setting.teacher_id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`[Auto-Reset] Completed. ${successCount}/${results.length} resets successful`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        successful: successCount,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Auto-Reset] Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function calculateNextResetDate(frequency: string | null): string {
  const now = new Date();
  
  switch (frequency) {
    case 'daily':
      now.setDate(now.getDate() + 1);
      break;
    case 'weekly':
      now.setDate(now.getDate() + 7);
      break;
    case 'biweekly':
      now.setDate(now.getDate() + 14);
      break;
    case 'monthly':
      now.setMonth(now.getMonth() + 1);
      break;
    case 'quarterly':
      now.setMonth(now.getMonth() + 3);
      break;
    case 'biannual':
      now.setMonth(now.getMonth() + 6);
      break;
    case 'yearly':
      now.setFullYear(now.getFullYear() + 1);
      break;
    default:
      // Default para 1 mês se não especificado
      now.setMonth(now.getMonth() + 1);
  }
  
  return now.toISOString();
}

function getFrequencyLabel(frequency: string | null): string {
  const labels: Record<string, string> = {
    daily: 'Diário',
    weekly: 'Semanal',
    biweekly: 'Quinzenal',
    monthly: 'Mensal',
    quarterly: 'Trimestral',
    biannual: 'Semestral',
    yearly: 'Anual'
  };
  
  return labels[frequency || 'monthly'] || 'Mensal';
}

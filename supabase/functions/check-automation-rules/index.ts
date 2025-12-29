import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * FASE 4: Check Automation Rules
 * 
 * Esta função roda periodicamente via cron e verifica regras de automação ativas
 * para enviar notificações baseadas em triggers (inatividade, aniversário, etc)
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("🤖 Starting automation rules check...");

    // Buscar regras ativas
    const { data: rules, error: rulesError } = await supabase
      .from("notification_automation_rules")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (rulesError) {
      console.error("Error fetching automation rules:", rulesError);
      throw rulesError;
    }

    console.log(`📋 Found ${rules?.length || 0} active automation rules`);

    let executedCount = 0;
    const results = [];

    // Processar cada regra
    for (const rule of rules || []) {
      try {
        console.log(`\n🔍 Checking rule: ${rule.name} (${rule.id})`);
        console.log(`   Trigger: ${rule.trigger_type}`);

        // Verificar se a regra deve ser executada
        const shouldExecute = await checkRuleTrigger(supabase, rule);

        if (shouldExecute) {
          console.log(`✅ Rule should execute: ${rule.name}`);
          
          // Executar regra via edge function
          const { data, error } = await supabase.functions.invoke("execute-automation-rule", {
            body: { ruleId: rule.id },
          });

          if (error) {
            console.error(`❌ Failed to execute rule ${rule.name}:`, error);
            results.push({ ruleId: rule.id, name: rule.name, success: false, error: error.message });
          } else {
            console.log(`✅ Successfully executed rule ${rule.name}`);
            executedCount++;
            results.push({ ruleId: rule.id, name: rule.name, success: true, recipients: data?.recipients || 0 });
          }
        } else {
          console.log(`⏭️  Skipping rule: ${rule.name} (conditions not met)`);
          results.push({ ruleId: rule.id, name: rule.name, skipped: true, reason: "conditions_not_met" });
        }
      } catch (error) {
        console.error(`❌ Error processing rule ${rule.name}:`, error);
        results.push({ ruleId: rule.id, name: rule.name, success: false, error: error.message });
      }
    }

    console.log(`\n✨ Automation check complete. Executed ${executedCount} rules.`);

    return new Response(
      JSON.stringify({
        success: true,
        checked: rules?.length || 0,
        executed: executedCount,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Fatal error in check-automation-rules:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * Verifica se uma regra deve ser executada baseado em seu trigger
 */
async function checkRuleTrigger(supabase: any, rule: any): Promise<boolean> {
  const { trigger_type, trigger_config, last_executed, execution_count } = rule;

  // Verificar cooldown (não executar a mesma regra muito frequentemente)
  if (last_executed) {
    const lastExecDate = new Date(last_executed);
    const now = new Date();
    const hoursSinceLastExec = (now.getTime() - lastExecDate.getTime()) / (1000 * 60 * 60);

    // Mínimo 24h entre execuções
    if (hoursSinceLastExec < 24) {
      console.log(`   Cooldown: Last execution ${hoursSinceLastExec.toFixed(1)}h ago (need 24h)`);
      return false;
    }
  }

  switch (trigger_type) {
    case "inatividade":
      return await checkInactivityTrigger(supabase, rule);
    
    case "aniversario":
      return await checkBirthdayTrigger(supabase, rule);
    
    case "meta_atingida":
      return await checkGoalAchievedTrigger(supabase, rule);
    
    case "vencimento_proximo":
      return await checkExpirationTrigger(supabase, rule);
    
    default:
      console.warn(`   Unknown trigger type: ${trigger_type}`);
      return false;
  }
}

/**
 * Trigger: Aluno inativo há X dias
 */
async function checkInactivityTrigger(supabase: any, rule: any): Promise<boolean> {
  const daysInactive = rule.trigger_config?.days || 7;
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - daysInactive);

  // Buscar alunos inativos do professor
  const { data: students } = await supabase
    .from("students")
    .select("user_id")
    .eq("teacher_id", rule.teacher_id);

  if (!students || students.length === 0) return false;

  const studentIds = students.map((s: any) => s.user_id);

  // Verificar atividade recente (última entrada no app, treino, etc)
  const { data: recentActivity } = await supabase
    .from("progress_tracking")
    .select("user_id")
    .in("user_id", studentIds)
    .gte("date", thresholdDate.toISOString())
    .limit(1);

  // Se não há atividade recente, regra deve executar
  const hasInactiveStudents = !recentActivity || recentActivity.length === 0;
  console.log(`   Inactive students found: ${hasInactiveStudents}`);
  
  return hasInactiveStudents;
}

/**
 * Trigger: Aniversário do aluno
 */
async function checkBirthdayTrigger(supabase: any, rule: any): Promise<boolean> {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  // Buscar alunos que fazem aniversário hoje
  const { data: birthdayStudents } = await supabase
    .from("profiles")
    .select("id")
    .eq("birth_month", month)
    .eq("birth_day", day);

  const hasBirthdays = birthdayStudents && birthdayStudents.length > 0;
  console.log(`   Birthday students found: ${hasBirthdays} (${birthdayStudents?.length || 0})`);
  
  return hasBirthdays;
}

/**
 * Trigger: Meta atingida (peso, medidas, etc)
 */
async function checkGoalAchievedTrigger(supabase: any, rule: any): Promise<boolean> {
  // Verificar progresso recente dos alunos
  const { data: recentGoals } = await supabase
    .from("progress_tracking")
    .select("user_id, weight, body_fat")
    .gte("date", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .limit(10);

  const hasGoalsAchieved = recentGoals && recentGoals.length > 0;
  console.log(`   Recent goals found: ${hasGoalsAchieved}`);
  
  return hasGoalsAchieved;
}

/**
 * Trigger: Vencimento de plano próximo
 */
async function checkExpirationTrigger(supabase: any, rule: any): Promise<boolean> {
  const daysBeforeExpiry = rule.trigger_config?.days || 3;
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysBeforeExpiry);

  // Buscar assinaturas que expiram em breve
  const { data: expiringSubscriptions } = await supabase
    .from("active_subscriptions")
    .select("user_id")
    .eq("teacher_id", rule.teacher_id)
    .lte("end_date", thresholdDate.toISOString())
    .eq("status", "active");

  const hasExpiring = expiringSubscriptions && expiringSubscriptions.length > 0;
  console.log(`   Expiring subscriptions found: ${hasExpiring} (${expiringSubscriptions?.length || 0})`);
  
  return hasExpiring;
}

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * FASE 4: Execute Automation Rule
 * 
 * Executa uma regra de automação específica, enviando notificação
 * usando o template configurado
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { ruleId } = await req.json();

    if (!ruleId) {
      return new Response(
        JSON.stringify({ error: "ruleId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`⚡ Executing automation rule: ${ruleId}`);

    // Buscar regra
    const { data: rule, error: ruleError } = await supabase
      .from("notification_automation_rules")
      .select("*")
      .eq("id", ruleId)
      .single();

    if (ruleError || !rule) {
      console.error("Rule not found:", ruleError);
      return new Response(
        JSON.stringify({ error: "Rule not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!rule.is_active) {
      console.warn("Rule is not active");
      return new Response(
        JSON.stringify({ error: "Rule is not active" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`📋 Rule: ${rule.name}`);
    console.log(`   Template: ${rule.notification_template?.title}`);

    // Buscar alunos alvo baseado no segmento
    const targetUserIds = await getTargetUsers(supabase, rule);

    if (targetUserIds.length === 0) {
      console.warn("No target users found for this rule");
      return new Response(
        JSON.stringify({
          success: false,
          message: "No target users found",
          recipients: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`🎯 Target users: ${targetUserIds.length}`);

    // Enviar notificação via send-push function
    const { data: sendResult, error: sendError } = await supabase.functions.invoke("send-push", {
      body: {
        title: rule.notification_template?.title || "Lembrete",
        message: rule.notification_template?.message || "Você tem uma nova mensagem",
        segment: "custom",
        externalUserIds: targetUserIds,
      },
    });

    if (sendError) {
      console.error("Failed to send notification:", sendError);
      throw sendError;
    }

    console.log(`✅ Notification sent to ${sendResult?.recipients || 0} devices`);

    // Atualizar regra com data de última execução
    const { error: updateError } = await supabase
      .from("notification_automation_rules")
      .update({
        last_executed: new Date().toISOString(),
        execution_count: (rule.execution_count || 0) + 1,
      })
      .eq("id", ruleId);

    if (updateError) {
      console.error("Failed to update rule execution stats:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        recipients: sendResult?.recipients || 0,
        rule_name: rule.name,
        notification_id: sendResult?.notification_id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Fatal error in execute-automation-rule:", error);
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
 * Busca usuários alvo baseado no trigger e condições da regra
 */
async function getTargetUsers(supabase: any, rule: any): Promise<string[]> {
  const { trigger_type, trigger_config, teacher_id } = rule;

  // Buscar todos os alunos do professor
  const { data: students, error } = await supabase
    .from("students")
    .select("user_id")
    .eq("teacher_id", teacher_id);

  if (error || !students) {
    console.error("Error fetching students:", error);
    return [];
  }

  let targetUserIds = students.map((s: any) => s.user_id);

  // Filtrar baseado no tipo de trigger
  switch (trigger_type) {
    case "inatividade":
      targetUserIds = await filterInactiveUsers(supabase, targetUserIds, trigger_config);
      break;

    case "aniversario":
      targetUserIds = await filterBirthdayUsers(supabase, targetUserIds);
      break;

    case "vencimento_proximo":
      targetUserIds = await filterExpiringUsers(supabase, targetUserIds, trigger_config, teacher_id);
      break;

    case "meta_atingida":
      // Para metas, enviar para todos os alunos ativos
      break;

    default:
      break;
  }

  return targetUserIds;
}

/**
 * Filtra usuários inativos há X dias
 */
async function filterInactiveUsers(
  supabase: any,
  userIds: string[],
  config: any
): Promise<string[]> {
  const daysInactive = config?.days || 7;
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - daysInactive);

  const { data: activeUsers } = await supabase
    .from("progress_tracking")
    .select("user_id")
    .in("user_id", userIds)
    .gte("date", thresholdDate.toISOString());

  const activeUserIds = new Set((activeUsers || []).map((u: any) => u.user_id));
  return userIds.filter((id) => !activeUserIds.has(id));
}

/**
 * Filtra usuários que fazem aniversário hoje
 */
async function filterBirthdayUsers(supabase: any, userIds: string[]): Promise<string[]> {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  const { data: birthdayUsers } = await supabase
    .from("profiles")
    .select("id")
    .in("id", userIds)
    .eq("birth_month", month)
    .eq("birth_day", day);

  return (birthdayUsers || []).map((u: any) => u.id);
}

/**
 * Filtra usuários com planos expirando em breve
 */
async function filterExpiringUsers(
  supabase: any,
  userIds: string[],
  config: any,
  teacherId: string
): Promise<string[]> {
  const daysBeforeExpiry = config?.days || 3;
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysBeforeExpiry);

  const { data: expiringSubscriptions } = await supabase
    .from("active_subscriptions")
    .select("user_id")
    .in("user_id", userIds)
    .eq("teacher_id", teacherId)
    .lte("end_date", thresholdDate.toISOString())
    .eq("status", "active");

  return (expiringSubscriptions || []).map((s: any) => s.user_id);
}

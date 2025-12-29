import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { realtimeManager } from "@/services/realtimeManager";

interface OverviewMetrics {
  activeStudents: number;
  monthlyRevenue: number;
  scheduledConsultations: number;
  monthlyEvaluations: number;
  loading: boolean;
  error: string | null;
}

export const useOverviewMetrics = (): OverviewMetrics => {
  const [metrics, setMetrics] = useState<OverviewMetrics>({
    activeStudents: 0,
    monthlyRevenue: 0,
    scheduledConsultations: 0,
    monthlyEvaluations: 0,
    loading: true,
    error: null,
  });

  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true; // ✅ Flag de montagem

    const fetchMetrics = async () => {
      try {
        if (!isMounted) return;
        setMetrics((prev) => ({ ...prev, loading: true, error: null }));

        // Buscar alunos ativos
        const { count: activeStudentsCount, error: studentsError } = await supabase
          .from("students")
          .select("*", { count: "exact", head: true })
          .eq("teacher_id", user.id)
          .eq("membership_status", "active");

        if (studentsError) throw studentsError;

        // Buscar faturamento mensal
        const currentMonth = new Date();
        const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

        const { data: revenueData, error: revenueError } = await supabase
          .from("payment_transactions")
          .select("amount")
          .eq("teacher_id", user.id)
          .in("status", ["completed", "paid"])
          .gte("created_at", firstDay.toISOString())
          .lte("created_at", lastDay.toISOString());

        if (revenueError) throw revenueError;

        const monthlyRevenue = revenueData?.reduce((sum, transaction) => sum + (transaction.amount || 0), 0) || 0;

        // Buscar consultorias agendadas (futuras)
        const { count: consultationsCount, error: consultationsError } = await supabase
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("teacher_id", user.id)
          .in("status", ["scheduled", "confirmed"])
          .gte("scheduled_time", new Date().toISOString());

        if (consultationsError) throw consultationsError;

        // Buscar avaliações do mês (incluindo feedbacks como métrica complementar)
        const { count: evaluationsCount, error: evaluationsError } = await supabase
          .from("evaluations")
          .select("*", { count: "exact", head: true })
          .eq("teacher_id", user.id)
          .gte("created_at", firstDay.toISOString())
          .lte("created_at", lastDay.toISOString());

        if (evaluationsError) throw evaluationsError;

        // Buscar feedbacks como métrica complementar de avaliações
        const { count: feedbacksCount, error: feedbacksError } = await supabase
          .from("feedbacks")
          .select("*", { count: "exact", head: true })
          .eq("teacher_id", user.id)
          .gte("created_at", firstDay.toISOString())
          .lte("created_at", lastDay.toISOString());

        if (feedbacksError) throw feedbacksError;

        if (!isMounted) return; // ✅ Verificar antes de atualizar state

        setMetrics({
          activeStudents: activeStudentsCount || 0,
          monthlyRevenue,
          scheduledConsultations: consultationsCount || 0,
          monthlyEvaluations: (evaluationsCount || 0) + (feedbacksCount || 0),
          loading: false,
          error: null,
        });
      } catch (error) {
        if (!isMounted) return;
        console.error("Error fetching overview metrics:", error);
        setMetrics((prev) => ({
          ...prev,
          loading: false,
          error: "Erro ao carregar métricas",
        }));
        toast({
          title: "Erro",
          description: "Erro ao carregar dados da visão geral",
          variant: "destructive",
        });
      }
    };

    fetchMetrics();

    // ✅ FASE 1: Realtime Manager subscriptions
    console.log('🔗 [useOverviewMetrics] Configurando Realtime Manager subscriptions')

    const listenerIds: string[] = []

    // Students metrics
    listenerIds.push(
      realtimeManager.subscribe(
        'students',
        '*',
        () => {
          console.log('📡 [Metrics] Realtime: Students updated')
          if (isMounted) fetchMetrics()
        },
        `teacher_id=eq.${user.id}`
      )
    )

    // Appointments metrics
    listenerIds.push(
      realtimeManager.subscribe(
        'appointments',
        '*',
        () => {
          console.log('📡 [Metrics] Realtime: Appointments updated')
          if (isMounted) fetchMetrics()
        },
        `teacher_id=eq.${user.id}`
      )
    )

    console.log('✅ [useOverviewMetrics] Realtime Manager configurado:', listenerIds.length, 'listeners')

    return () => {
      isMounted = false;
      console.log('🧹 [useOverviewMetrics] Removendo listeners:', listenerIds.length)
      listenerIds.forEach(id => realtimeManager.unsubscribe(id))
    };
  }, [user?.id, toast]);

  return metrics;
};

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface RecentActivity {
  id: string;
  type: "appointment" | "payment" | "feedback" | "evaluation";
  description: string;
  time: string;
  studentName?: string;
}

interface ActivityTemp extends RecentActivity {
  studentId?: string;
}

export const useRecentActivities = () => {
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true; // ✅ Flag de montagem

    const fetchRecentActivities = async () => {
      try {
        if (!isMounted) return;
        setLoading(true);

        // ✅ ETAPA 1: Buscar todas as atividades em paralelo (3 queries)
        const [appointmentsRes, paymentsRes, feedbacksRes] = await Promise.all([
          supabase
            .from("appointments")
            .select("id, created_at, title, type, student_id")
            .eq("teacher_id", user.id)
            .order("created_at", { ascending: false })
            .limit(5),

          supabase
            .from("payment_transactions")
            .select("id, created_at, amount, student_id")
            .eq("teacher_id", user.id)
            .in("status", ["completed", "paid"])
            .order("created_at", { ascending: false })
            .limit(5),

          supabase
            .from("feedbacks")
            .select("id, created_at, rating, type, student_id")
            .eq("teacher_id", user.id)
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

        if (!isMounted) return;

        const allActivitiesTemp: ActivityTemp[] = [];
        const studentIdsToFetch = new Set<string>();

        // ✅ ETAPA 2: Coletar todos os student_ids necessários
        appointmentsRes.data?.forEach((apt) => {
          if (apt.student_id) studentIdsToFetch.add(apt.student_id);
          allActivitiesTemp.push({
            id: apt.id,
            type: "appointment",
            description: `Agendamento: ${apt.title}`,
            time: new Date(apt.created_at).toLocaleString("pt-BR"),
            studentId: apt.student_id || undefined,
          });
        });

        paymentsRes.data?.forEach((payment) => {
          if (payment.student_id) studentIdsToFetch.add(payment.student_id);
          allActivitiesTemp.push({
            id: payment.id,
            type: "payment",
            description: `Pagamento recebido: R$ ${payment.amount}`,
            time: new Date(payment.created_at).toLocaleString("pt-BR"),
            studentId: payment.student_id || undefined,
          });
        });

        feedbacksRes.data?.forEach((feedback) => {
          if (feedback.student_id) studentIdsToFetch.add(feedback.student_id);
          allActivitiesTemp.push({
            id: feedback.id,
            type: "feedback",
            description: `Feedback recebido (${feedback.rating}/5)`,
            time: new Date(feedback.created_at).toLocaleString("pt-BR"),
            studentId: feedback.student_id || undefined,
          });
        });

        if (!isMounted) return;

        // ✅ ETAPA 3: Buscar TODOS os nomes de uma vez (1 query)
        const studentIds = Array.from(studentIdsToFetch);
        const profilesMap = new Map<string, string>();

        if (studentIds.length > 0) {
          const { data: profiles } = await supabase.from("profiles").select("id, name, email").in("id", studentIds);

          if (!isMounted) return;

          profiles?.forEach((profile) => {
            profilesMap.set(profile.id, profile.name || profile.email || "Aluno");
          });
        }

        // ✅ ETAPA 4: Fazer o "join" dos dados no JavaScript
        const allActivities: RecentActivity[] = allActivitiesTemp.map(({ studentId, ...activity }) => ({
          ...activity,
          studentName: studentId ? profilesMap.get(studentId) || "Aluno" : undefined,
        }));

        // ✅ ETAPA 5: Ordenar por data e pegar os 10 mais recentes
        allActivities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

        if (!isMounted) return;
        setActivities(allActivities.slice(0, 10));
      } catch (error) {
        if (!isMounted) return;
        console.error("Error fetching recent activities:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchRecentActivities();

    return () => {
      isMounted = false; // ✅ Cleanup
    };
  }, [user?.id]);

  return { activities, loading };
};

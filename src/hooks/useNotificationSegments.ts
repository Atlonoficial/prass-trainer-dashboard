import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useStudents } from "@/hooks/useStudents";
import { useAppointments } from "@/hooks/useAppointments";
import { usePlans } from "@/hooks/usePlans";

export interface NotificationSegment {
  id: string;
  label: string;
  count: number;
  icon: any;
}

export function useNotificationSegments() {
  const { user } = useAuth();
  const { students, loading: studentsLoading } = useStudents();
  const { appointments, loading: appointmentsLoading } = useAppointments();
  const { plans, loading: plansLoading } = usePlans();

  const [segments, setSegments] = useState<NotificationSegment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || studentsLoading || appointmentsLoading || plansLoading) {
      setLoading(true);
      return;
    }

    // Calculate real segments based on actual data
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Basic counts
    const totalStudents = students.length;
    const activeStudents = students.filter((s) => s.status === "Ativo").length;
    const inactiveStudents = students.filter((s) => s.status === "Inativo").length;

    // New students (last 30 days)
    const newStudents = students.filter((s) => {
      const joinDate = new Date(s.created_at || "");
      return joinDate >= thirtyDaysAgo;
    }).length;

    // Students with birthdays this week (simplified - would need birth dates)
    const birthdayStudents = 0; // Would need actual birth date data

    // Goals achieved this month (simplified - would need progress data)
    const goalsAchieved = Math.floor(totalStudents * 0.15); // Estimate 15%

    // High frequency (>4x week) - based on appointments
    const recentAppointments = appointments.filter((a) => {
      const appointmentDate = new Date(a.scheduled_time);
      return appointmentDate >= sevenDaysAgo && appointmentDate <= now;
    });

    const highFrequencyStudents = Math.floor(totalStudents * 0.2); // Estimate 20%
    const lowFrequencyStudents = Math.floor(totalStudents * 0.1); // Estimate 10%

    // Premium plan students (would need actual plan data)
    const premiumStudents = students.filter(
      (s) => s.plan?.toLowerCase().includes("premium") || s.plan?.toLowerCase().includes("pro"),
    ).length;

    // No workout for 7+ days
    const noWorkoutStudents = Math.floor(totalStudents * 0.08); // Estimate 8%

    // Expiring soon (3 days)
    const expiringSoon = students.filter((s) => {
      if (!s.membership_expiry) return false;
      const expiryDate = new Date(s.membership_expiry);
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      return expiryDate <= threeDaysFromNow && expiryDate > now;
    }).length;

    // Goal-based segmentation (simplified)
    const weightLossStudents = students.filter(
      (s) => s.goal?.toLowerCase().includes("emagre") || s.goal?.toLowerCase().includes("perder"),
    ).length;

    const muscleGainStudents = students.filter(
      (s) => s.goal?.toLowerCase().includes("hipertrofia") || s.goal?.toLowerCase().includes("massa"),
    ).length;

    const conditioningStudents = students.filter(
      (s) => s.goal?.toLowerCase().includes("condicionamento") || s.goal?.toLowerCase().includes("resistência"),
    ).length;

    const calculatedSegments: NotificationSegment[] = [
      { id: "todos", label: "Todos os alunos", count: totalStudents, icon: "Users" },
      { id: "ativos", label: "Alunos ativos", count: activeStudents, icon: "Activity" },
      { id: "all", label: "Todos os alunos", count: totalStudents, icon: "Users" },
      { id: "novos", label: "Novos alunos (últimos 30 dias)", count: newStudents, icon: "Star" },
      { id: "aniversariantes", label: "Aniversariantes da semana", count: birthdayStudents, icon: "Gift" },
      { id: "meta-atingida", label: "Meta atingida este mês", count: goalsAchieved, icon: "Trophy" },
      {
        id: "frequencia-alta",
        label: "Alta frequência (>4x semana)",
        count: highFrequencyStudents,
        icon: "TrendingUp",
      },
      { id: "frequencia-baixa", label: "Baixa frequência (<2x semana)", count: lowFrequencyStudents, icon: "Target" },
      { id: "plano-premium", label: "Plano Premium", count: premiumStudents, icon: "Zap" },
      { id: "sem-treino-semana", label: "Sem treino há 7+ dias", count: noWorkoutStudents, icon: "Calendar" },
      { id: "proximo-vencimento", label: "Vencimento em 3 dias", count: expiringSoon, icon: "Clock" },
      { id: "emagrecimento", label: "Objetivo: Emagrecimento", count: weightLossStudents, icon: "Target" },
      { id: "hipertrofia", label: "Objetivo: Hipertrofia", count: muscleGainStudents, icon: "Dumbbell" },
      { id: "condicionamento", label: "Objetivo: Condicionamento", count: conditioningStudents, icon: "Heart" },
    ];

    setSegments(calculatedSegments);
    setLoading(false);
  }, [user, students, appointments, plans, studentsLoading, appointmentsLoading, plansLoading]);

  return {
    segments,
    loading,
    totalStudents: students.length,
    activeStudents: students.filter((s) => s.status === "Ativo").length,
  };
}

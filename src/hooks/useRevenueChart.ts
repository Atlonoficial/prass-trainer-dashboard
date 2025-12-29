import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface RevenueChartData {
  month: string;
  revenue: number;
}

export const useRevenueChart = () => {
  const [chartData, setChartData] = useState<RevenueChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true; // ✅ Flag de montagem

    const fetchRevenueData = async () => {
      try {
        if (!isMounted) return;
        setLoading(true);

        // Buscar dados dos últimos 6 meses
        const months = [];
        for (let i = 5; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
          const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

          const { data: revenueData } = await supabase
            .from("payment_transactions")
            .select("amount")
            .eq("teacher_id", user.id)
            .in("status", ["completed", "paid"])
            .gte("created_at", firstDay.toISOString())
            .lte("created_at", lastDay.toISOString());

          const totalRevenue = revenueData?.reduce((sum, transaction) => sum + (transaction.amount || 0), 0) || 0;

          months.push({
            month: date.toLocaleDateString("pt-BR", { month: "short" }),
            revenue: totalRevenue,
          });
        }

        if (!isMounted) return; // ✅ Verificar antes de atualizar
        setChartData(months);
      } catch (error) {
        if (!isMounted) return;
        console.error("Error fetching revenue chart data:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchRevenueData();

    return () => {
      isMounted = false; // ✅ Cleanup
    };
  }, [user?.id]);

  return { chartData, loading };
};

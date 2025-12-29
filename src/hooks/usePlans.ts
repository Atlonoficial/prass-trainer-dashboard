import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useOptimizedProfile } from "./useOptimizedProfile";

export type BillingInterval = "monthly" | "quarterly" | "yearly";

export interface PlanCatalog {
  id: string;
  teacher_id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  interval: BillingInterval;
  features: any[];
  is_active: boolean;
  highlighted: boolean;
  icon: string;
  created_at: string;
  updated_at: string;
}

export interface PlanSubscription {
  id: string;
  student_user_id: string;
  teacher_id: string;
  plan_id: string;
  status: "pending" | "active" | "cancelled" | "expired";
  start_at?: string;
  end_at?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export function usePlans() {
  const { user } = useAuth();
  const { profile } = useOptimizedProfile();
  const [plans, setPlans] = useState<PlanCatalog[]>([]);
  const [subscriptions, setSubscriptions] = useState<PlanSubscription[]>([]);
  const [loading, setLoading] = useState(false);

  const isTeacher = useMemo(() => profile?.user_type === "teacher", [profile]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (isTeacher) {
        const { data: plansData, error: plansErr } = await supabase
          .from("plan_catalog")
          .select("*")
          .eq("teacher_id", user.id)
          .order("created_at", { ascending: false });
        if (plansErr) throw plansErr;
        setPlans((plansData as PlanCatalog[]) || []);

        const { data: subsData, error: subsErr } = await supabase
          .from("plan_subscriptions")
          .select("*")
          .eq("teacher_id", user.id)
          .order("created_at", { ascending: false });
        if (subsErr) throw subsErr;
        setSubscriptions((subsData as PlanSubscription[]) || []);
      } else {
        // Student: find teacher_id from students table
        const { data: rel, error: relErr } = await supabase
          .from("students")
          .select("teacher_id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (relErr) throw relErr;
        const teacherId = rel?.teacher_id;
        if (!teacherId) {
          setPlans([]);
          setSubscriptions([]);
          return;
        }
        const { data: plansData } = await supabase
          .from("plan_catalog")
          .select("*")
          .eq("teacher_id", teacherId)
          .eq("is_active", true)
          .order("price", { ascending: true });
        setPlans((plansData as PlanCatalog[]) || []);

        const { data: subsData } = await supabase
          .from("plan_subscriptions")
          .select("*")
          .eq("student_user_id", user.id)
          .order("created_at", { ascending: false });
        setSubscriptions((subsData as PlanSubscription[]) || []);
      }
    } finally {
      setLoading(false);
    }
  }, [user, isTeacher]);

  useEffect(() => {
    fetchData();
    // subscribe to realtime changes for teacher management
    if (!user) return;
    const channel = supabase
      .channel("plans-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "plan_catalog" }, fetchData)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "plan_catalog" }, fetchData)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "plan_catalog" }, fetchData)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "plan_subscriptions" }, fetchData)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "plan_subscriptions" }, fetchData)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, user]);

  const createPlan = useCallback(
    async (payload: Omit<PlanCatalog, "id" | "teacher_id" | "created_at" | "updated_at">) => {
      if (!user) throw new Error("not-authenticated");
      const { data, error } = await supabase
        .from("plan_catalog")
        .insert({ ...payload, teacher_id: user.id })
        .select("*")
        .single();
      if (error) throw error;
      setPlans((prev) => [data as PlanCatalog, ...prev]);
      return data as PlanCatalog;
    },
    [user]
  );

  const updatePlan = useCallback(
    async (id: string, updates: Partial<PlanCatalog>) => {
      const { data, error } = await supabase
        .from("plan_catalog")
        .update(updates)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      setPlans((prev) => prev.map((p) => (p.id === id ? (data as PlanCatalog) : p)));
      return data as PlanCatalog;
    },
    []
  );

  const deletePlan = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("plan_catalog")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setPlans((prev) => prev.filter((p) => p.id !== id));
    },
    []
  );

  const approveSubscription = useCallback(async (subscriptionId: string) => {
    const { data, error } = await supabase.rpc("approve_subscription", { p_subscription_id: subscriptionId });
    if (error) throw error;
    await fetchData();
    return data;
  }, [fetchData]);

  const requestSubscription = useCallback(async (planId: string, teacherId: string) => {
    if (!user) throw new Error("not-authenticated");
    const { data, error } = await supabase
      .from("plan_subscriptions")
      .insert({ plan_id: planId, teacher_id: teacherId, student_user_id: user.id, status: "pending" })
      .select("*")
      .single();
    if (error) throw error;
    setSubscriptions((prev) => [data as PlanSubscription, ...prev]);
    return data as PlanSubscription;
  }, [user]);

  return {
    loading,
    isTeacher,
    plans,
    subscriptions,
    refetch: fetchData,
    createPlan,
    updatePlan,
    deletePlan,
    approveSubscription,
    requestSubscription,
  };
}

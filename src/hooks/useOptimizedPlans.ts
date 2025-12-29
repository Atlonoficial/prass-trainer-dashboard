import { useCallback, useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTeacherAuth } from "./useTeacherAuth";

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
  cancelled_at?: string;
  cancelled_reason?: string;
  created_at: string;
  updated_at: string;
}

interface CacheData<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useOptimizedPlans() {
  const { userId, isTeacher, loading: authLoading } = useTeacherAuth();
  const [plans, setPlans] = useState<PlanCatalog[]>([]);
  const [subscriptions, setSubscriptions] = useState<PlanSubscription[]>([]);
  const [loading, setLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Cache with TTL
  const cacheRef = useRef<{
    plans: CacheData<PlanCatalog[]> | null;
    subscriptions: CacheData<PlanSubscription[]> | null;
  }>({
    plans: null,
    subscriptions: null
  });

  const isStale = useCallback((key: 'plans' | 'subscriptions') => {
    const cached = cacheRef.current[key];
    if (!cached) return true;
    return Date.now() - cached.timestamp > CACHE_TTL;
  }, []);

  const fetchData = useCallback(async (force = false) => {
    if (!userId || authLoading) return;

    // Use cache if available and not stale
    if (!force) {
      const plansCache = cacheRef.current.plans;
      const subscriptionsCache = cacheRef.current.subscriptions;
      
      if (plansCache && !isStale('plans')) {
        setPlans(plansCache.data);
      }
      
      if (subscriptionsCache && !isStale('subscriptions')) {
        setSubscriptions(subscriptionsCache.data);
      }
      
      // If both are cached and not stale, return early
      if (plansCache && subscriptionsCache && !isStale('plans') && !isStale('subscriptions')) {
        return;
      }
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    
    try {
      if (isTeacher) {
        // Fetch teacher's plans and all their subscriptions
        const [plansResult, subsResult] = await Promise.all([
          supabase
            .from("plan_catalog")
            .select("*")
            .eq("teacher_id", userId)
            .order("created_at", { ascending: false }),
          supabase
            .from("plan_subscriptions")
            .select("*")
            .eq("teacher_id", userId)
            .order("created_at", { ascending: false })
        ]);

        if (plansResult.error) throw plansResult.error;
        if (subsResult.error) throw subsResult.error;

        const plansData = (plansResult.data as PlanCatalog[]) || [];
        const subscriptionsData = (subsResult.data as PlanSubscription[]) || [];

        // Fix subscription data - calculate start_at and end_at if missing
        const fixedSubscriptions = subscriptionsData.map(sub => {
          if (!sub.start_at || !sub.end_at) {
            const plan = plansData.find(p => p.id === sub.plan_id);
            const createdDate = new Date(sub.created_at);
            
            let endDate = new Date(createdDate);
            if (plan?.interval === 'monthly') {
              endDate.setMonth(endDate.getMonth() + 1);
            } else if (plan?.interval === 'quarterly') {
              endDate.setMonth(endDate.getMonth() + 3);
            } else if (plan?.interval === 'yearly') {
              endDate.setFullYear(endDate.getFullYear() + 1);
            } else {
              // Default to monthly
              endDate.setMonth(endDate.getMonth() + 1);
            }

            return {
              ...sub,
              start_at: sub.start_at || sub.approved_at || sub.created_at,
              end_at: sub.end_at || endDate.toISOString()
            };
          }
          return sub;
        });

        setPlans(plansData);
        setSubscriptions(fixedSubscriptions);

        // Update cache
        const now = Date.now();
        cacheRef.current = {
          plans: { data: plansData, timestamp: now },
          subscriptions: { data: fixedSubscriptions, timestamp: now }
        };

      } else {
        // Student: find teacher_id and fetch available plans + own subscriptions
        const { data: studentRel, error: relError } = await supabase
          .from("students")
          .select("teacher_id")
          .eq("user_id", userId)
          .maybeSingle();

        if (relError) throw relError;

        const teacherId = studentRel?.teacher_id;
        if (!teacherId) {
          setPlans([]);
          setSubscriptions([]);
          return;
        }

        const [plansResult, subsResult] = await Promise.all([
          supabase
            .from("plan_catalog")
            .select("*")
            .eq("teacher_id", teacherId)
            .eq("is_active", true)
            .order("price", { ascending: true }),
          supabase
            .from("plan_subscriptions")
            .select("*")
            .eq("student_user_id", userId)
            .order("created_at", { ascending: false })
        ]);

        if (plansResult.error) throw plansResult.error;
        if (subsResult.error) throw subsResult.error;

        const plansData = (plansResult.data as PlanCatalog[]) || [];
        const subscriptionsData = (subsResult.data as PlanSubscription[]) || [];

        setPlans(plansData);
        setSubscriptions(subscriptionsData);

        // Update cache
        const now = Date.now();
        cacheRef.current = {
          plans: { data: plansData, timestamp: now },
          subscriptions: { data: subscriptionsData, timestamp: now }
        };
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching plans data:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [userId, isTeacher, authLoading, isStale]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Auto-fetch when auth is ready
  useEffect(() => {
    if (userId && !authLoading) {
      fetchData();
    }
  }, [userId, authLoading, fetchData]);

  const createPlan = useCallback(
    async (payload: Omit<PlanCatalog, "id" | "teacher_id" | "created_at" | "updated_at">) => {
      if (!userId || !isTeacher) throw new Error("not-authenticated");
      
      const { data, error } = await supabase
        .from("plan_catalog")
        .insert({ ...payload, teacher_id: userId })
        .select("*")
        .single();
        
      if (error) throw error;
      
      const newPlan = data as PlanCatalog;
      setPlans((prev) => [newPlan, ...prev]);
      
      // Update cache
      if (cacheRef.current.plans) {
        cacheRef.current.plans.data = [newPlan, ...cacheRef.current.plans.data];
        cacheRef.current.plans.timestamp = Date.now();
      }
      
      return newPlan;
    },
    [userId, isTeacher]
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
      
      const updatedPlan = data as PlanCatalog;
      setPlans((prev) => prev.map((p) => (p.id === id ? updatedPlan : p)));
      
      // Update cache
      if (cacheRef.current.plans) {
        cacheRef.current.plans.data = cacheRef.current.plans.data.map(p => 
          p.id === id ? updatedPlan : p
        );
        cacheRef.current.plans.timestamp = Date.now();
      }
      
      return updatedPlan;
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
      
      // Update cache
      if (cacheRef.current.plans) {
        cacheRef.current.plans.data = cacheRef.current.plans.data.filter(p => p.id !== id);
        cacheRef.current.plans.timestamp = Date.now();
      }
    },
    []
  );

  const approveSubscription = useCallback(async (subscriptionId: string) => {
    const { data, error } = await supabase.rpc("approve_subscription", { 
      p_subscription_id: subscriptionId 
    });
    
    if (error) throw error;
    
    // Refresh subscriptions after approval
    await fetchData(true);
    
    return data;
  }, [fetchData]);

  const requestSubscription = useCallback(async (planId: string, teacherId: string) => {
    if (!userId) throw new Error("not-authenticated");
    
    const { data, error } = await supabase
      .from("plan_subscriptions")
      .insert({ 
        plan_id: planId, 
        teacher_id: teacherId, 
        student_user_id: userId, 
        status: "pending" 
      })
      .select("*")
      .single();
      
    if (error) throw error;
    
    const newSubscription = data as PlanSubscription;
    setSubscriptions((prev) => [newSubscription, ...prev]);
    
    // Update cache
    if (cacheRef.current.subscriptions) {
      cacheRef.current.subscriptions.data = [newSubscription, ...cacheRef.current.subscriptions.data];
      cacheRef.current.subscriptions.timestamp = Date.now();
    }
    
    return newSubscription;
  }, [userId]);

  const clearCache = useCallback(() => {
    cacheRef.current = {
      plans: null,
      subscriptions: null
    };
  }, []);

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
    clearCache,
    isStale
  };
}
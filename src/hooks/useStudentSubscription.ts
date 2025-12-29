import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

export interface StudentSubscription {
  id: string
  user_id: string
  teacher_id: string
  plan_id: string
  status: string
  start_date: string
  end_date: string
  auto_renew: boolean
  features?: any
  plan?: {
    id: string
    name: string
    description?: string
    price: number
    interval: string
    features?: any
  }
}

export function useStudentSubscription(userId?: string) {
  const [subscription, setSubscription] = useState<StudentSubscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  
  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }
    
    const fetchSubscription = async () => {
      try {
        const { data, error } = await supabase
          .from('active_subscriptions')
          .select(`
            *,
            plan:plan_catalog!plan_id(*)
          `)
          .eq('user_id', userId)
          .eq('status', 'active')
          .gte('end_date', new Date().toISOString())
          .single()
        
        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching subscription:', error)
        }
        
        setSubscription(data as any)
        setHasAccess(!!data)
      } catch (error) {
        console.error('Unexpected error:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchSubscription()
    
    // Realtime subscription para sincronização automática
    const channel = supabase
      .channel('subscription-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'active_subscriptions',
        filter: `user_id=eq.${userId}`
      }, () => {
        console.log('Subscription changed, refetching...')
        fetchSubscription()
      })
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])
  
  return { subscription, loading, hasAccess }
}

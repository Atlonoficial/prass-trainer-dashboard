import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export interface Reward {
  id: string
  title: string
  description?: string
  points_cost: number
  stock?: number
  is_active: boolean
  image_url?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface RewardRedemption {
  id: string
  user_id: string
  reward_id: string
  points_spent: number
  status: string
  created_at: string
  updated_at?: string
  admin_notes?: string
  reward?: Reward
  student_name?: string
  student_avatar?: string
}

export function useRewards() {
  const [rewards, setRewards] = useState<Reward[]>([])
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchRewards = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('rewards_items')
        .select('*')
        .eq('is_active', true)
        .order('points_cost', { ascending: true })

      if (error) throw error
      setRewards(data || [])
    } catch (error) {
      console.error('Error fetching rewards:', error)
      toast({
        title: "Erro ao carregar recompensas",
        description: "Não foi possível carregar as recompensas.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchRedemptions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      console.log('🔐 [REDEMPTIONS] User logado:', user?.id, user?.email)
      if (!user) return

      // First get reward IDs created by this teacher
      const { data: teacherRewards, error: rewardsError } = await supabase
        .from('rewards_items')
        .select('id')
        .eq('created_by', user.id)

      console.log('🎁 [REDEMPTIONS] Recompensas encontradas:', teacherRewards?.length)
      console.log('🎁 [REDEMPTIONS] Reward IDs:', teacherRewards?.map(r => r.id))
      console.log('❌ [REDEMPTIONS] Erro ao buscar rewards:', rewardsError)

      if (!teacherRewards || teacherRewards.length === 0) {
        console.warn('⚠️ [REDEMPTIONS] Nenhuma recompensa encontrada para este professor!')
        setRedemptions([])
        return
      }

      const rewardIds = teacherRewards.map(r => r.id)

      const { data, error } = await supabase
        .from('reward_redemptions')
        .select(`
          *,
          reward:rewards_items(*)
        `)
        .in('reward_id', rewardIds)
        .order('created_at', { ascending: false })

      console.log('📦 [REDEMPTIONS] Resgates encontrados:', data?.length)
      console.log('📦 [REDEMPTIONS] Resgates data:', data)
      console.log('❌ [REDEMPTIONS] Erro ao buscar redemptions:', error)

      if (error) throw error

      // Get student profiles separately
      const userIds = [...new Set(data?.map(r => r.user_id) || [])]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .in('id', userIds)

      // Create profiles map
      const profilesMap = (profiles || []).reduce((acc: any, profile: any) => {
        acc[profile.id] = profile
        return acc
      }, {})
      
      // Format the data to include student info
      const formattedData = (data || []).map(redemption => ({
        ...redemption,
        student_name: profilesMap[redemption.user_id]?.name || 'Usuário',
        student_avatar: profilesMap[redemption.user_id]?.avatar_url
      }))
      
      console.log('✅ [REDEMPTIONS] Total formatados:', formattedData.length)
      setRedemptions(formattedData)
    } catch (error) {
      console.error('💥 [REDEMPTIONS] Erro fatal:', error)
    }
  }

  const createReward = async (rewardData: { title: string; description?: string; points_cost: number; stock?: number; image_url?: string }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('rewards_items')
        .insert([{
          ...rewardData,
          created_by: user.id,
          is_active: true
        }])

      if (error) throw error

      toast({
        title: "Recompensa criada",
        description: "Nova recompensa foi criada com sucesso.",
      })

      await fetchRewards()
    } catch (error) {
      console.error('Error creating reward:', error)
      toast({
        title: "Erro ao criar recompensa",
        description: "Não foi possível criar a recompensa.",
        variant: "destructive",
      })
      throw error
    }
  }

  const updateReward = async (id: string, updates: Partial<Reward>) => {
    try {
      const { error } = await supabase
        .from('rewards_items')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      toast({
        title: "Recompensa atualizada",
        description: "Recompensa foi atualizada com sucesso.",
      })

      await fetchRewards()
    } catch (error) {
      console.error('Error updating reward:', error)
      toast({
        title: "Erro ao atualizar recompensa",
        description: "Não foi possível atualizar a recompensa.",
        variant: "destructive",
      })
      throw error
    }
  }

  const deleteReward = async (id: string) => {
    try {
      const { error } = await supabase
        .from('rewards_items')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error

      toast({
        title: "Recompensa desativada",
        description: "Recompensa foi desativada com sucesso.",
      })

      await fetchRewards()
    } catch (error) {
      console.error('Error deactivating reward:', error)
      toast({
        title: "Erro ao desativar recompensa",
        description: "Não foi possível desativar a recompensa.",
        variant: "destructive",
      })
      throw error
    }
  }

  const redeemReward = async (rewardId: string) => {
    try {
      const { error } = await supabase.rpc('redeem_reward', {
        _reward_id: rewardId
      })

      if (error) throw error

      toast({
        title: "Recompensa resgatada",
        description: "Recompensa foi resgatada com sucesso.",
      })

      await fetchRedemptions()
    } catch (error: any) {
      console.error('Error redeeming reward:', error)
      toast({
        title: "Erro ao resgatar recompensa",
        description: error?.message || "Não foi possível resgatar a recompensa.",
        variant: "destructive",
      })
      throw error
    }
  }

  const updateRedemptionStatus = async (redemptionId: string, status: string, adminNotes?: string) => {
    try {
      const { error } = await supabase.rpc('update_redemption_status', {
        _redemption_id: redemptionId,
        _new_status: status,
        _admin_notes: adminNotes || null
      })

      if (error) throw error

      toast({
        title: "Status atualizado",
        description: `Resgate ${status === 'approved' ? 'aprovado' : 'rejeitado'} com sucesso.`,
      })

      await fetchRedemptions()
    } catch (error: any) {
      console.error('Error updating redemption status:', error)
      toast({
        title: "Erro ao atualizar status",
        description: error?.message || "Não foi possível atualizar o status do resgate.",
        variant: "destructive",
      })
      throw error
    }
  }

  const deleteRedemption = async (redemptionId: string) => {
    try {
      const { error } = await supabase
        .from('reward_redemptions')
        .delete()
        .eq('id', redemptionId)

      if (error) throw error

      toast({
        title: "Resgate deletado",
        description: "Resgate foi removido do histórico com sucesso.",
      })

      await fetchRedemptions()
    } catch (error) {
      console.error('Error deleting redemption:', error)
      toast({
        title: "Erro ao deletar resgate",
        description: "Não foi possível deletar o resgate.",
        variant: "destructive",
      })
      throw error
    }
  }

  const getPendingRedemptions = () => {
    return redemptions.filter(r => r.status === 'pending')
  }

  const getCategoryOptions = () => [
    { value: 'discount', label: 'Desconto' },
    { value: 'service', label: 'Serviço' },
    { value: 'item', label: 'Item Físico' },
    { value: 'digital', label: 'Digital' },
    { value: 'experience', label: 'Experiência' },
  ]

  useEffect(() => {
    fetchRewards()
    fetchRedemptions()
  }, [])

  // Real-time subscription
  useEffect(() => {
    const combinedSubscription = supabase
      .channel('rewards-and-redemptions-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'rewards_items'
      }, () => {
        fetchRewards()
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'reward_redemptions'
      }, () => {
        fetchRedemptions()
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_points'
      }, () => {
        // Refresh when user points change (affects redemption eligibility)
        fetchRedemptions()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(combinedSubscription)
    }
  }, [])

  return {
    rewards,
    redemptions,
    loading,
    createReward,
    updateReward,
    deleteReward,
    redeemReward,
    updateRedemptionStatus,
    deleteRedemption,
    getPendingRedemptions,
    getCategoryOptions,
    refetch: async () => {
      await Promise.all([fetchRewards(), fetchRedemptions()])
    }
  }
}
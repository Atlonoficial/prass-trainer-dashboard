import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

export interface BannerUI {
  id: string
  title: string
  description: string
  imageUrl: string
  isActive: boolean
  startDate: string
  endDate: string
  targetAudience: string
  clickCount: number
  impressions: number
  redirectUrl?: string
}

export function useBanners() {
  const { user } = useAuth()
  const [banners, setBanners] = useState<BannerUI[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const mapToUI = (row: any, analytics?: any): BannerUI => ({
    id: row.id,
    title: row.title || '',
    description: row.message || '',
    imageUrl: row.image_url || '/placeholder.svg',
    isActive: !!row.is_active,
    startDate: row.start_date ? new Date(row.start_date).toISOString().slice(0, 10) : '',
    endDate: row.end_date ? new Date(row.end_date).toISOString().slice(0, 10) : '',
    targetAudience: 'Todos os Alunos',
    clickCount: analytics?.totalClicks || 0,
    impressions: analytics?.totalImpressions || 0,
    redirectUrl: row.action_url || '',
  })

  const fetchBanners = async () => {
    if (!user) return
    try {
      setLoading(true)
      
      // Fetch banners
      const { data: bannersData, error } = await supabase
        .from('banners')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Fetch analytics for each banner with improved error handling
      const bannersWithAnalytics = await Promise.all((bannersData || []).map(async (banner) => {
        try {
          const { data: analyticsData, error: analyticsError } = await supabase
            .from('banner_analytics')
            .select('impressions, clicks, conversions')
            .eq('banner_id', banner.id)

          if (analyticsError) {
            console.warn(`Analytics error for banner ${banner.id}:`, analyticsError)
            return mapToUI(banner, { totalImpressions: 0, totalClicks: 0, totalConversions: 0 })
          }

          const totalImpressions = analyticsData?.reduce((sum, row) => sum + (row.impressions || 0), 0) || 0
          const totalClicks = analyticsData?.reduce((sum, row) => sum + (row.clicks || 0), 0) || 0
          const totalConversions = analyticsData?.reduce((sum, row) => sum + (row.conversions || 0), 0) || 0

          return mapToUI(banner, { totalImpressions, totalClicks, totalConversions })
        } catch (err) {
          console.warn(`Failed to fetch analytics for banner ${banner.id}:`, err)
          return mapToUI(banner, { totalImpressions: 0, totalClicks: 0, totalConversions: 0 })
        }
      }))

      setBanners(bannersWithAnalytics)
    } catch (e) {
      console.error('[useBanners] fetch error', e)
      toast({ title: 'Erro', description: 'Falha ao carregar banners', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const createBanner = async (payload: {
    title: string
    description: string
    targetAudience: string
    startDate: string
    endDate: string
    redirectUrl?: string
    imageFile?: File | null
    imageUrl?: string
  }) => {
    if (!user) throw new Error('Usuário não autenticado')
    try {
      const { data, error } = await supabase
        .from('banners')
        .insert([{ 
          title: payload.title,
          message: payload.description,
          image_url: payload.imageUrl || null,
          is_active: false,
          start_date: payload.startDate ? new Date(payload.startDate).toISOString() : null,
          end_date: payload.endDate ? new Date(payload.endDate).toISOString() : null,
          priority: 0,
          action_text: payload.redirectUrl ? 'Acessar' : null,
          action_url: payload.redirectUrl || null,
          created_by: user.id,
        }])
        .select()
        .single()

      if (error) throw error


      toast({ title: 'Sucesso', description: 'Banner criado' })
      await fetchBanners()
    } catch (e) {
      console.error('[useBanners] create error', e)
      toast({ title: 'Erro', description: 'Não foi possível criar o banner', variant: 'destructive' })
      throw e
    }
  }

  const updateBanner = async (
    id: string,
    payload: { title: string; description: string; targetAudience: string; startDate: string; endDate: string; redirectUrl?: string; imageUrl?: string }
  ) => {
    try {
      const { error } = await supabase
        .from('banners')
        .update({
          title: payload.title,
          message: payload.description,
          image_url: payload.imageUrl || null,
          start_date: payload.startDate ? new Date(payload.startDate).toISOString() : null,
          end_date: payload.endDate ? new Date(payload.endDate).toISOString() : null,
          action_url: payload.redirectUrl || null,
        })
        .eq('id', id)
      if (error) throw error
      toast({ title: 'Salvo', description: 'Banner atualizado' })
      await fetchBanners()
    } catch (e) {
      console.error('[useBanners] update error', e)
      toast({ title: 'Erro', description: 'Não foi possível atualizar o banner', variant: 'destructive' })
      throw e
    }
  }

  const toggleStatus = async (id: string, nextActive: boolean) => {
    try {
      const { error } = await supabase.from('banners').update({ is_active: nextActive }).eq('id', id)
      if (error) throw error
      await fetchBanners()
    } catch (e) {
      console.error('[useBanners] toggleStatus error', e)
      toast({ title: 'Erro', description: 'Não foi possível alterar o status', variant: 'destructive' })
      throw e
    }
  }

  const deleteBanner = async (id: string) => {
    try {
      const { error } = await supabase.from('banners').delete().eq('id', id)
      if (error) throw error
      toast({ title: 'Excluído', description: 'Banner removido' })
      await fetchBanners()
    } catch (e) {
      console.error('[useBanners] delete error', e)
      toast({ title: 'Erro', description: 'Não foi possível excluir', variant: 'destructive' })
      throw e
    }
  }

  useEffect(() => { fetchBanners() }, [user?.id])

  return { banners, loading, createBanner, updateBanner, toggleStatus, deleteBanner }
}

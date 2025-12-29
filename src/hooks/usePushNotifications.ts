import { useState, useEffect, useCallback } from 'react'
import { useToast } from './use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useSupabaseAuth } from './useSupabaseAuth'

interface NotificationData {
  title: string
  message: string
  segment: 'all' | 'ativos' | 'inativos' | 'novos' | 'custom'
  externalUserIds?: string[]
}

interface NotificationCampaign {
  id: string
  title: string
  message: string
  segment: string
  tags: string[]
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed'
  scheduled_for?: string
  sent_count: number
  delivered_count: number
  opened_count: number
  failed_count: number
  created_at: string
  sent_at?: string
}

export function usePushNotifications() {
  const [loading, setLoading] = useState(false)
  const [campaigns, setCampaigns] = useState<NotificationCampaign[]>([])
  const { toast } = useToast()
  const { user } = useSupabaseAuth()

  const createCampaign = async (notificationData: NotificationData): Promise<string | null> => {
    if (!user) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado para enviar notificações.',
        variant: 'destructive'
      })
      return null
    }

    setLoading(true)
    try {
      console.log('Creating campaign with data:', notificationData);

      // ✅ VALIDAÇÃO PRÉ-ENVIO: Verificar se há destinatários disponíveis
      console.log('🔍 Validando destinatários antes de enviar...');

      const { data: students } = await supabase
        .from('students')
        .select('user_id')
        .eq('teacher_id', user.id);

      if (!students || students.length === 0) {
        toast({
          title: 'Nenhum aluno cadastrado',
          description: 'Você precisa ter alunos cadastrados para enviar notificações.',
          variant: 'destructive'
        });
        return null;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('onesignal_player_id, push_token')
        .in('id', students.map(s => s.user_id));

      const activeDevices = profiles?.filter(p => p.onesignal_player_id || p.push_token).length || 0;

      if (activeDevices === 0) {
        console.warn('⚠️ Frontend validation: No active devices found. Proceeding anyway as Edge Function might have better access.');
        // Não bloqueamos mais, apenas logamos. A Edge Function decidirá.
      }

      console.log(`✅ Validação OK: ${activeDevices} dispositivos ativos de ${students.length} alunos`);

      const { data, error } = await supabase.functions.invoke('send-push', {
        body: notificationData
      })

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Error invoking edge function:', error);
        toast({
          title: 'Erro ao enviar notificação',
          description: error.message || 'Erro ao conectar com o servidor',
          variant: 'destructive'
        });
        return null;
      }

      // Validar resposta do edge function
      if (!data.success || data.recipients === 0) {
        console.error('Push notification failed or no recipients:', data);

        const errorMessage = data.recipients === 0
          ? 'Nenhum aluno possui notificações push ativas. Verifique se os alunos habilitaram as notificações no app.'
          : data.message || 'Não foi possível enviar a notificação';

        toast({
          title: data.recipients === 0 ? 'Nenhum destinatário ativo' : 'Falha ao enviar',
          description: errorMessage,
          variant: 'destructive',
          duration: 6000
        });

        return null;
      }

      // Sucesso com detalhes
      toast({
        title: 'Notificação enviada! 🎉',
        description: `Enviada para ${data.recipients} dispositivo${data.recipients !== 1 ? 's' : ''} de ${data.target_users || data.recipients} aluno${data.target_users !== 1 ? 's' : ''}`,
        duration: 5000
      })

      // Atualizar lista de campanhas
      await fetchCampaigns()

      return data.notification_id
    } catch (error: any) {
      console.error('Unexpected error sending push notification:', error)
      toast({
        title: 'Erro inesperado',
        description: error.message || 'Tente novamente em alguns instantes.',
        variant: 'destructive'
      })
      return null
    } finally {
      setLoading(false)
    }
  }

  const sendNotification = async (campaignId: string): Promise<boolean> => {
    // Para envio imediato, usamos o createCampaign diretamente
    // Esta função é mantida por compatibilidade
    return true
  }

  // FASE 3: Memozar fetchCampaigns para evitar loop
  const fetchCampaigns = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('notification_campaigns')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching campaigns from DB:', error);
        throw new Error(error.message)
      }

      console.log(`✅ Fetched ${data?.length || 0} campaigns`);

      // Transform data to match expected format
      const transformedCampaigns: NotificationCampaign[] = (data || []).map(camp => ({
        id: camp.id,
        title: camp.title,
        message: camp.message,
        segment: camp.segment || 'all',
        tags: camp.target_user_ids || [],
        status: camp.status as any || 'sent',
        scheduled_for: camp.scheduled_for,
        sent_count: camp.sent_count || 0,
        delivered_count: camp.delivered_count || 0,
        opened_count: camp.opened_count || 0,
        failed_count: camp.failed_count || 0,
        created_at: camp.created_at,
        sent_at: camp.sent_at
      }))

      setCampaigns(transformedCampaigns)
    } catch (error: any) {
      console.error('Error fetching campaigns:', error)
      toast({
        title: 'Erro ao carregar campanhas',
        description: error.message || 'Não foi possível carregar o histórico de notificações.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [user, toast])

  const trackNotificationOpen = async (campaignId: string) => {
    try {
      // O tracking é feito automaticamente via webhooks do OneSignal
      console.log('Notification opened:', campaignId)
    } catch (error) {
      console.error('Error tracking notification open:', error)
    }
  }

  // Carregar campanhas quando o usuário fizer login (com dependência estável)
  useEffect(() => {
    if (user) {
      fetchCampaigns()
    }
  }, [user, fetchCampaigns])

  return {
    loading,
    campaigns,
    createCampaign,
    sendNotification,
    fetchCampaigns,
    trackNotificationOpen
  }
}

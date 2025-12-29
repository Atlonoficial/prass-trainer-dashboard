import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    const body = await req.json();
    const { action } = body;

    console.log('OneSignal Function Called:', { action, userId: user.id });

    switch (action) {
      case 'send_notification':
        return await sendNotification(supabase, body, user);
      case 'sync_player_id':
        return await syncPlayerID(supabase, body, user);
      case 'get_campaigns':
        return await getCampaigns(supabase, user.id);
      default:
        return await handleWebhook(supabase, body);
    }
  } catch (error) {
    console.error('Error in onesignal-notifications function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function sendNotification(supabase: any, body: any, user: any) {
  console.log('=== SEND NOTIFICATION START ===');
  console.log('User ID:', user.id);
  console.log('Request body:', JSON.stringify(body, null, 2));
  
  const { title, message, targetSegment = 'todos', targetUsers = [], deepLink, actionText, actionUrl } = body;
  
  if (!title || !message) {
    throw new Error('Title and message are required');
  }
  
  // Verificar se o usuário é professor
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .single();
    
  if (profileError) {
    console.error('Profile fetch error:', profileError);
    throw new Error('Failed to verify user profile');
  }
    
  if (!profile || profile.user_type !== 'teacher') {
    throw new Error('Only teachers can send notifications');
  }

  console.log('✓ Teacher validation passed');

  // Buscar usuários alvo e player IDs
  let targetUserIds: string[] = [];
  let playerIds: string[] = [];
  
  try {
    targetUserIds = await getTargetUsers(supabase, targetSegment, user.id, targetUsers);
    console.log('Target users found:', targetUserIds.length);
    
    if (targetUserIds.length === 0) {
      console.warn('No target users found');
      // Se não há usuários específicos, ainda assim permite demonstração
      if (targetSegment === 'todos') {
        // Buscar todos os estudantes do professor
        const { data: allStudents } = await supabase
          .from('students')
          .select('user_id')
          .eq('teacher_id', user.id);
          
        if (allStudents && allStudents.length > 0) {
          targetUserIds = allStudents.map((s: any) => s.user_id);
          console.log('Found students via fallback:', targetUserIds.length);
        }
      }
    }
    
    playerIds = await getPlayerIDs(supabase, targetSegment, user.id, targetUsers);
    console.log('Player IDs found:', playerIds.length);
    
  } catch (error) {
    console.error('Error getting target users/player IDs:', error);
    // Continue mesmo sem player IDs para demonstração
    console.log('Continuing without player IDs for demo purposes');
  }

  // Salvar notificação no banco (sempre salva, independente de player IDs)
  const { data: notification, error: notificationError } = await supabase
    .from('notifications')
    .insert({
      created_by: user.id,
      title,
      message,
      data: {
        target_segment: targetSegment,
        target_users: targetUserIds,
        deep_link: deepLink,
        action_text: actionText,
        action_url: actionUrl,
        status: playerIds.length > 0 ? 'sending' : 'no_recipients'
      }
    })
    .select()
    .single();

  if (notificationError) {
    console.error('Error saving notification:', notificationError);
    throw new Error(`Failed to save notification: ${notificationError.message}`);
  }

  console.log('✓ Notification saved to database:', notification.id);

  // Se não há player IDs, ainda retorna sucesso para demonstração
  if (playerIds.length === 0) {
    console.warn('No player IDs available - notification saved but not sent to OneSignal');
    
    await supabase
      .from('notifications')
      .update({ 
        data: {
          ...notification.data,
          status: 'no_recipients',
          onesignal_response: { message: 'No OneSignal player IDs available' }
        }
      })
      .eq('id', notification.id);
    
    return new Response(
      JSON.stringify({
        success: true,
        notification_id: notification.id,
        recipients: 0,
        target_users: targetUserIds.length,
        message: 'Notification saved but no OneSignal subscribers found'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Enviar via OneSignal
  const oneSignalPayload: any = {
    app_id: Deno.env.get('ONESIGNAL_APP_ID'),
    include_player_ids: playerIds,
    headings: { en: title },
    contents: { en: message },
    data: {
      notification_id: notification.id,
      deep_link: deepLink,
      action_url: actionUrl
    }
  };

  if (actionText && actionUrl) {
    oneSignalPayload.web_buttons = [{
      id: 'action-button',
      text: actionText,
      url: actionUrl
    }];
  }

  console.log('Sending to OneSignal API...');
  console.log('Payload:', JSON.stringify(oneSignalPayload, null, 2));
  
  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Deno.env.get('ONESIGNAL_API_KEY')}`
      },
      body: JSON.stringify(oneSignalPayload)
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('OneSignal API error:', result);
      
      await supabase
        .from('notifications')
        .update({ 
          data: {
            ...notification.data,
            status: 'failed',
            onesignal_response: result
          }
        })
        .eq('id', notification.id);
        
      throw new Error(`OneSignal API error: ${result.errors?.[0] || result.message || 'Unknown error'}`);
    }

    console.log('✓ OneSignal response:', result);
    
    // Atualizar status para enviado
    await supabase
      .from('notifications')
      .update({ 
        data: {
          ...notification.data,
          status: 'sent',
          onesignal_id: result.id,
          onesignal_response: result
        }
      })
      .eq('id', notification.id);

    // Criar logs de notificação para cada usuário
    for (const userId of targetUserIds) {
      await supabase
        .from('notification_logs')
        .insert({
          notification_id: notification.id,
          user_id: userId,
          status: 'sent',
          onesignal_id: result.id
        })
        .then(() => console.log(`Log created for user: ${userId}`))
        .catch((err: any) => console.error(`Failed to create log for user ${userId}:`, err));
    }

    return new Response(
      JSON.stringify({
        success: true,
        notification_id: notification.id,
        onesignal_id: result.id,
        recipients: playerIds.length,
        target_users: targetUserIds.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('OneSignal request failed:', error);
    
    await supabase
      .from('notifications')
      .update({ 
        data: {
          ...notification.data,
          status: 'failed',
          onesignal_response: { error: error instanceof Error ? error.message : 'Unknown error' }
        }
      })
      .eq('id', notification.id);
      
    throw error;
  }
}

async function getPlayerIDs(supabase: any, segment: string, teacherId: string, targetUsers?: string[]): Promise<string[]> {
  console.log(`=== GET PLAYER IDS ===`);
  console.log(`Segment: ${segment}, Teacher: ${teacherId}, Target Users: ${targetUsers?.length || 0}`);
  
  let userIds: string[] = [];
  
  try {
    if (targetUsers && targetUsers.length > 0) {
      // Usuários específicos fornecidos
      userIds = targetUsers;
      console.log('Using specific target users:', userIds.length);
    } else {
      // Segmentação automática baseada no tipo
      console.log('Using automatic segmentation...');
      
      switch (segment) {
        case 'todos':
          const { data: allStudents, error: allError } = await supabase
            .from('students')
            .select('user_id')
            .eq('teacher_id', teacherId);
            
          if (allError) {
            console.error('Error fetching all students:', allError);
            return [];
          }
          userIds = allStudents?.map((s: any) => s.user_id) || [];
          break;
          
        case 'ativos':
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
          const { data: activeStudents, error: activeError } = await supabase
            .from('students')
            .select('user_id')
            .eq('teacher_id', teacherId)
            .gte('last_activity', sevenDaysAgo);
            
          if (activeError) {
            console.error('Error fetching active students:', activeError);
            return [];
          }
          userIds = activeStudents?.map((s: any) => s.user_id) || [];
          break;
          
        case 'inativos':
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
          const { data: inactiveStudents, error: inactiveError } = await supabase
            .from('students')
            .select('user_id')
            .eq('teacher_id', teacherId)
            .or(`last_activity.is.null,last_activity.lt.${weekAgo}`);
            
          if (inactiveError) {
            console.error('Error fetching inactive students:', inactiveError);
            return [];
          }
          userIds = inactiveStudents?.map((s: any) => s.user_id) || [];
          break;
          
        case 'novos':
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
          const { data: newStudents, error: newError } = await supabase
            .from('students')
            .select('user_id')
            .eq('teacher_id', teacherId)
            .gte('created_at', thirtyDaysAgo);
            
          if (newError) {
            console.error('Error fetching new students:', newError);
            return [];
          }
          userIds = newStudents?.map((s: any) => s.user_id) || [];
          break;
          
        default:
          console.log('Unknown segment, using empty list');
          userIds = [];
      }
    }
    
    console.log(`Found ${userIds.length} user IDs for segment '${segment}'`);
    
    if (userIds.length === 0) {
      console.log('No users found, returning empty player ID list');
      return [];
    }
    
    // Buscar player IDs válidos dos usuários
    console.log('Fetching OneSignal player IDs from profiles...');
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, onesignal_player_id')
      .in('id', userIds);
      
    if (profileError) {
      console.error('Error fetching profiles:', profileError);
      return [];
    }
    
    console.log(`Fetched ${profiles?.length || 0} profiles`);
    
    // Filtrar apenas player IDs válidos (não null e não vazio)
    const validPlayerIds = profiles
      ?.map((p: any) => p.onesignal_player_id)
      .filter((id: string) => id && id.trim() !== '') || [];
    
    console.log(`Found ${validPlayerIds.length} valid OneSignal player IDs`);
    
    if (validPlayerIds.length === 0) {
      console.warn('⚠️  No valid OneSignal player IDs found - users may not have subscribed to notifications yet');
    }
    
    return validPlayerIds;
    
  } catch (error) {
    console.error('Error in getPlayerIDs:', error);
    return [];
  }
}

async function getTargetUsers(supabase: any, segment: string, teacherId: string, targetUsers?: string[]): Promise<string[]> {
  console.log(`=== GET TARGET USERS ===`);
  console.log(`Segment: ${segment}, Teacher: ${teacherId}, Target Users: ${targetUsers?.length || 0}`);
  
  if (targetUsers && targetUsers.length > 0) {
    return targetUsers;
  }
  
  try {
    let query = supabase
      .from('students')
      .select('user_id')
      .eq('teacher_id', teacherId);

    switch (segment) {
      case 'ativos':
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('last_activity', sevenDaysAgo);
        break;
      case 'inativos':
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        query = query.or(`last_activity.is.null,last_activity.lt.${weekAgo}`);
        break;
      case 'novos':
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', thirtyDaysAgo);
        break;
      default:
        // 'todos' - sem filtro adicional
        break;
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching target users:', error);
      return [];
    }

    const targetUserIds = data?.map((student: any) => student.user_id) || [];
    console.log(`Found ${targetUserIds.length} target users for segment '${segment}'`);
    return targetUserIds;

  } catch (error) {
    console.error('Error in getTargetUsers:', error);
    return [];
  }
}

async function syncPlayerID(supabase: any, body: any, user: any) {
  console.log('=== SYNC PLAYER ID ===');
  console.log('User ID:', user.id);
  console.log('Player ID to sync:', body.playerId);
  
  const { playerId } = body;
  
  if (!playerId) {
    throw new Error('Player ID is required');
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ onesignal_player_id: playerId })
      .eq('id', user.id);

    if (error) {
      console.error('Error syncing player ID:', error);
      throw new Error(`Failed to sync player ID: ${error.message}`);
    }

    console.log('✓ Player ID synced successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Player ID synced successfully',
        playerId: playerId 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Sync player ID failed:', error);
    throw error;
  }
}

async function getCampaigns(supabase: any, userId: string) {
  console.log('=== GET CAMPAIGNS ===');
  console.log('User ID:', userId);

  try {
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select(`
        *,
        notification_logs(
          status,
          created_at,
          onesignal_id
        )
      `)
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching campaigns:', error);
      throw new Error(`Failed to fetch campaigns: ${error.message}`);
    }

    const campaigns = notifications.map((notification: any) => {
      const logs = notification.notification_logs || [];
      const sent_count = logs.filter((log: any) => log.status === 'sent').length;
      const delivered_count = logs.filter((log: any) => log.status === 'delivered').length;
      const opened_count = logs.filter((log: any) => log.status === 'opened').length;
      const failed_count = logs.filter((log: any) => log.status === 'failed').length;

      return {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        segment: notification.target_segment || 'todos',
        status: notification.status || 'sent',
        sent_count,
        delivered_count,
        opened_count,
        failed_count,
        created_at: notification.created_at
      };
    });

    return new Response(
      JSON.stringify({ campaigns }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Get campaigns failed:', error);
    throw error;
  }
}

async function handleWebhook(supabase: any, body: any) {
  console.log('=== HANDLE WEBHOOK ===');
  console.log('Webhook data:', JSON.stringify(body, null, 2));

  try {
    // Processar evento do webhook OneSignal
    const { event, data } = body;
    
    if (event === 'notification.sent' || event === 'notification.opened') {
      // Atualizar logs baseado no evento
      if (data.notification_id) {
        await supabase
          .from('notification_logs')
          .update({ 
            status: event === 'notification.sent' ? 'delivered' : 'opened',
            updated_at: new Date().toISOString()
          })
          .eq('onesignal_id', data.notification_id);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Handle webhook failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
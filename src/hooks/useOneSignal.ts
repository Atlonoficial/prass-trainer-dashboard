import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedApp } from '@/contexts/UnifiedAppProvider';
import { toast } from 'sonner';
import { PushNotifications } from '@capacitor/push-notifications';
import { isNativePlatform, platformInfo } from '@/utils/platformDetection';

interface OneSignalConfig {
  appId: string;
  serviceWorkerPath?: string;
  serviceWorkerUpdaterPath?: string;
  notificationClickHandlerMatch?: string;
  notificationClickHandlerAction?: string;
  allowLocalhostAsSecureOrigin?: boolean;
}

declare global {
  interface Window {
    OneSignal?: any;
    OneSignalDeferred?: any[];
  }
}

// Singleton state para evitar múltiplas inicializações
let isGloballyInitialized = false;
let globalInitPromise: Promise<boolean> | null = null;

export function useOneSignal() {
  const { user } = useUnifiedApp();
  
  // Early return se não há usuário autenticado
  const [isInitialized, setIsInitialized] = useState(isGloballyInitialized);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(!isGloballyInitialized);
  const [initError, setInitError] = useState<string | null>(null);
  const [pushToken, setPushToken] = useState<string | null>(null);
  
  // Early return para evitar re-renders desnecessários
  if (!user) {
    return {
      isInitialized: false,
      playerId: null,
      loading: false,
      initError: null,
      pushToken: null,
      platform: platformInfo.platform,
      isNative: isNativePlatform(),
      initializeOneSignal: async () => false,
      requestPermission: async () => false,
      checkSubscriptionStatus: async () => false,
      getPlayerId: async () => null,
      syncPlayerIdWithServer: async () => ({ success: false, message: 'User not logged in' }),
      isSubscribed: async () => false,
      setExternalUserId: async () => false,
      sendTag: async () => false
    };
  }

  // Timeout para evitar loading infinito
  const [initTimeout, setInitTimeout] = useState<NodeJS.Timeout | null>(null);

  // FASE 1: Register device with OneSignal API to get real Player ID
  const registerDeviceWithOneSignal = useCallback(async (fcmToken: string): Promise<string | null> => {
    const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID;
    const ONESIGNAL_API_KEY = import.meta.env.VITE_ONESIGNAL_API_KEY;

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
      console.error('❌ OneSignal: App ID or API Key not configured');
      return null;
    }

    try {
      console.log('📡 Registering device with OneSignal API...');
      console.log('  - Device Type:', platformInfo.isAndroid ? 'Android (1)' : 'iOS (0)');
      console.log('  - FCM Token (truncated):', fcmToken.substring(0, 20) + '...');

      const response = await fetch('https://api.onesignal.com/players', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${ONESIGNAL_API_KEY}`
        },
        body: JSON.stringify({
          app_id: ONESIGNAL_APP_ID,
          device_type: platformInfo.isAndroid ? 1 : 0, // 1 = Android, 0 = iOS
          identifier: fcmToken,
          language: 'pt',
          timezone: -10800, // GMT-3 (Brasil)
          notification_types: 1 // Subscribed
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ OneSignal registration failed:', data);
        return null;
      }

      console.log('✅ Device registered with OneSignal!');
      console.log('  - Player ID:', data.id);

      return data.id; // This is the real Player ID!

    } catch (error) {
      console.error('❌ Failed to register device with OneSignal:', error);
      return null;
    }
  }, []);

  // Initialize native push notifications for mobile
  const initializeNativePush = useCallback(async () => {
    if (!isNativePlatform()) {
      console.log('OneSignal: Not on native platform, skipping native init');
      return false;
    }

    try {
      console.log('🔔 OneSignal: Initializing NATIVE push notifications...');

      // Check permissions
      let permStatus = await PushNotifications.checkPermissions();
      console.log('🔔 Native Push: Current permissions:', permStatus);

      if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
        console.log('🔔 Native Push: Requesting permissions...');
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn('🔔 Native Push: Permissions not granted');
        return false;
      }

      console.log('🔔 Native Push: Permissions granted, registering...');
      await PushNotifications.register();

      // FASE 1 FIX: Listen for registration success and register with OneSignal
      await PushNotifications.addListener('registration', async (token) => {
        console.log('🔔 Native Push: FCM/APNs Token received:', token.value.substring(0, 20) + '...');
        setPushToken(token.value);

        // ✅ REGISTER with OneSignal API to get real Player ID
        const oneSignalPlayerId = await registerDeviceWithOneSignal(token.value);

        if (oneSignalPlayerId) {
          console.log('✅ OneSignal Player ID obtained:', oneSignalPlayerId);
          setPlayerId(oneSignalPlayerId);
          setIsInitialized(true);

          // Sync with server
          if (user?.id) {
            await syncPlayerIdWithServer(oneSignalPlayerId);
          }
        } else {
          console.error('❌ Failed to obtain OneSignal Player ID');
          setIsInitialized(false);
        }
      });

      // Listen for registration errors
      await PushNotifications.addListener('registrationError', (error) => {
        console.error('🔔 Native Push: Registration error:', error);
        setInitError(error.error);
      });

      // Listen for push notifications
      await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('🔔 Native Push: Notification received:', notification);
        toast(notification.title || 'Nova notificação', {
          description: notification.body
        });
      });

      // Listen for notification actions
      await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        console.log('🔔 Native Push: Notification action:', action);
      });

      return true;

    } catch (error) {
      console.error('🔔 Native Push: Initialization failed:', error);
      setInitError(error instanceof Error ? error.message : 'Native push init failed');
      return false;
    }
  }, [registerDeviceWithOneSignal, user]);

  const initializeOneSignal = useCallback(async (config: OneSignalConfig) => {
    if (typeof window === 'undefined') {
      console.warn('OneSignal: Running on server side');
      setLoading(false);
      return false;
    }

    // Use native push for mobile platforms
    if (isNativePlatform()) {
      console.log('🔔 OneSignal: Detected MOBILE platform, using native push');
      setLoading(true);
      const success = await initializeNativePush();
      setLoading(false);
      return success;
    }

    console.log('🔔 OneSignal: Detected WEB platform, using OneSignal Web SDK');

    // Se já está globalmente inicializado, usar estado global
    if (isGloballyInitialized) {
      console.log('OneSignal: Already globally initialized');
      setIsInitialized(true);
      setLoading(false);
      setTimeout(() => capturePlayerId(), 500);
      return true;
    }

    // Se já existe uma inicialização em andamento, aguardar
    if (globalInitPromise) {
      console.log('OneSignal: Waiting for ongoing initialization...');
      const result = await globalInitPromise;
      setIsInitialized(result);
      setLoading(false);
      if (result) {
        setTimeout(() => capturePlayerId(), 500);
      }
      return result;
    }

    // Configurar timeout para evitar loading infinito
    const timeout = setTimeout(() => {
      console.warn('OneSignal: Initialization timeout reached');
      setLoading(false);
      setInitError('Initialization timeout');
      globalInitPromise = null;
    }, 15000); // 15 segundos timeout

    setInitTimeout(timeout);

    // Criar promise de inicialização global
    globalInitPromise = (async () => {
      try {
        console.log('OneSignal: Starting initialization...');
        
        // Aguardar OneSignal estar disponível
        let retries = 0;
        while (!window.OneSignal && retries < 50) {
          await new Promise(resolve => setTimeout(resolve, 100));
          retries++;
        }

        if (!window.OneSignal) {
          throw new Error('OneSignal SDK not loaded after 5 seconds');
        }

        // Verificar se já foi inicializado
        try {
          const alreadyInit = await window.OneSignal.initialized;
          if (alreadyInit) {
            console.log('OneSignal: SDK already initialized, reusing instance');
            isGloballyInitialized = true;
            globalInitPromise = null;
            clearTimeout(timeout);
            setIsInitialized(true);
            setLoading(false);
            setTimeout(() => capturePlayerId(), 500);
            return true;
          }
        } catch (e) {
          console.log('OneSignal: First initialization');
        }

      console.log('OneSignal: Initializing with config:', { 
        appId: config.appId?.substring(0, 8) + '...' 
      });

      // Configurar event listeners antes da inicialização
      window.OneSignal.User.PushSubscription.addEventListener('change', (event: any) => {
        console.log('OneSignal: Push subscription changed:', event);
        if (event.current?.id) {
          console.log('OneSignal: New Player ID captured via event:', event.current.id);
          setPlayerId(event.current.id);
        }
      });

      window.OneSignal.Notifications.addEventListener('permissionChange', (granted: boolean) => {
        console.log('OneSignal: Permission changed:', granted);
        if (granted) {
          setTimeout(() => capturePlayerId(), 1000);
        }
      });

      await window.OneSignal.init(config);
        
        console.log('OneSignal: Initialization completed successfully');
        isGloballyInitialized = true;
        globalInitPromise = null;
        clearTimeout(timeout);
        return true;

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        
        // Tratar "SDK already initialized" como sucesso
        if (errorMsg.includes('already') || errorMsg.includes('initialized')) {
          console.log('OneSignal: SDK was already initialized, treating as success');
          isGloballyInitialized = true;
          globalInitPromise = null;
          clearTimeout(timeout);
          return true;
        }
        
        console.error('OneSignal: Initialization failed:', error);
        clearTimeout(timeout);
        globalInitPromise = null;
        throw error;
      }
    })();

    try {
      const result = await globalInitPromise;
      setIsInitialized(result);
      setInitError(null);
      
      // Aguardar um pouco e então tentar capturar Player ID
      if (result) {
        setTimeout(() => capturePlayerId(), 1500);
      }
      
      return result;

    } catch (error) {
      console.error('OneSignal: Global initialization failed:', error);
      setIsInitialized(false);
      setInitError(error instanceof Error ? error.message : 'Initialization failed');
      globalInitPromise = null;
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!window.OneSignal || !isInitialized) {
      console.warn('OneSignal: SDK not ready for permission request');
      return false;
    }

    try {
      console.log('OneSignal: Requesting notification permission...');
      const result = await window.OneSignal.Notifications.requestPermission();
      console.log('OneSignal: Permission result:', result);
      return result;
    } catch (error) {
      console.error('OneSignal: Permission request failed:', error);
      return false;
    }
  }, [isInitialized]);

  const checkSubscriptionStatus = useCallback(async () => {
    if (!window.OneSignal || !isInitialized) {
      return false;
    }

    try {
      const permission = await window.OneSignal.Notifications.permission;
      return permission === 'granted';
    } catch (error) {
      console.error('OneSignal: Subscription check failed:', error);
      return false;
    }
  }, [isInitialized]);

  // Nova função para capturar Player ID usando a API correta do v16
  const capturePlayerId = useCallback(async () => {
    if (!window.OneSignal || !isInitialized) {
      console.log('OneSignal: SDK not ready for Player ID capture');
      return null;
    }

    try {
      console.log('OneSignal: Attempting to capture Player ID...');
      
      // Método correto para OneSignal v16
      const pushSubscription = window.OneSignal.User.PushSubscription;
      
      // Verificar se já temos o ID disponível
      let id = pushSubscription.id;
      console.log('OneSignal: Current Push Subscription ID:', id);
      
      if (id) {
        console.log('OneSignal: Player ID captured immediately:', id);
        setPlayerId(id);
        return id;
      }

      // Se não temos ID, verificar permissão
      const permission = await window.OneSignal.Notifications.permission;
      console.log('OneSignal: Current permission:', permission);
      
      if (permission !== 'granted') {
        console.log('OneSignal: Permission not granted, Player ID not available');
        return null;
      }

      // Se temos permissão mas não ID, aguardar um pouco
      console.log('OneSignal: Permission granted, waiting for subscription...');
      
      let attempts = 0;
      const maxAttempts = 10;
      
      while (!id && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500));
        id = pushSubscription.id;
        console.log(`OneSignal: Attempt ${attempts + 1}: Player ID =`, id || 'null');
        attempts++;
      }
      
      if (id) {
        console.log('OneSignal: Player ID captured after waiting:', id);
        setPlayerId(id);
        return id;
      } else {
        console.log('OneSignal: Failed to capture Player ID after', maxAttempts, 'attempts');
        return null;
      }
      
    } catch (error) {
      console.error('OneSignal: Error capturing Player ID:', error);
      return null;
    }
  }, [isInitialized]);

  const getPlayerId = useCallback(async () => {
    return await capturePlayerId();
  }, [capturePlayerId]);

  const syncPlayerIdWithServer = useCallback(async (playerIdToSync?: string | null) => {
    const idToSync = playerIdToSync || playerId || pushToken;
    
    if (!user?.id) {
      console.warn('OneSignal: No user logged in');
      return { success: false, message: 'User not logged in' };
    }

    if (!idToSync) {
      console.warn('OneSignal: No player ID/token to sync');
      
      // Force retry to capture Player ID if missing (web only)
      if (!isNativePlatform()) {
        console.log('OneSignal: Forcing Player ID capture retry...');
        const capturedId = await capturePlayerId();
        
        if (!capturedId) {
          return { success: false, message: 'No player ID available after retry' };
        }
        
        return await syncPlayerIdWithServer(capturedId);
      }
      
      return { success: false, message: 'No token available' };
    }

    try {
      console.log('🔔 Syncing', isNativePlatform() ? 'push token' : 'player ID', 'with Supabase...', idToSync);
      
      // Update profiles table
      const { error } = await supabase
        .from('profiles')
        .update({ 
          onesignal_player_id: idToSync,
          push_token: pushToken,
          platform: platformInfo.platform 
        })
        .eq('id', user.id);

      if (error) {
        console.error('OneSignal: Sync failed:', error);
        return { success: false, message: error.message };
      }

      console.log('✅ Token synced successfully to profiles table');
      toast.success(`Notificações ativadas (${platformInfo.platform})`);
      return { success: true, playerId: idToSync };
    } catch (error) {
      console.error('OneSignal: Sync error:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown sync error' 
      };
    }
  }, [user, playerId, pushToken, capturePlayerId]);

  const isSubscribed = useCallback(() => checkSubscriptionStatus(), [checkSubscriptionStatus]);

  const setExternalUserId = useCallback(async (externalId: string) => {
    if (!window.OneSignal || !isInitialized) {
      return false;
    }

    try {
      console.log('OneSignal: Setting external user ID');
      await window.OneSignal.login(externalId);
      return true;
    } catch (error) {
      console.error('OneSignal: Failed to set external user ID:', error);
      return false;
    }
  }, [isInitialized]);

  const sendTag = useCallback(async (key: string, value: string) => {
    if (!window.OneSignal || !isInitialized) {
      return false;
    }

    try {
      console.log('OneSignal: Adding tag:', { key, value });
      await window.OneSignal.User.addTag(key, value);
      return true;
    } catch (error) {
      console.error('OneSignal: Failed to add tag:', error);
      return false;
    }
  }, [isInitialized]);

  // Limpeza do timeout
  useEffect(() => {
    return () => {
      if (initTimeout) {
        clearTimeout(initTimeout);
      }
    };
  }, [initTimeout]);

  // Verificar se SDK já está pronto (carregado por script externo)
  useEffect(() => {
    const checkSDKReady = async () => {
      if (isGloballyInitialized) {
        setIsInitialized(true);
        setLoading(false);
        return;
      }

      // Aguardar SDK estar disponível
      let attempts = 0;
      while (!window.OneSignal && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (window.OneSignal) {
        try {
          // Verificar se já foi inicializado pelo script externo
          const alreadyInit = await window.OneSignal.initialized;
          if (alreadyInit) {
            console.log('✅ OneSignal: SDK detected and already initialized by external script');
            isGloballyInitialized = true;
            setIsInitialized(true);
            setLoading(false);
            setTimeout(() => capturePlayerId(), 1000);
          } else {
            console.log('⏳ OneSignal: SDK loaded but not initialized yet');
            setLoading(false);
          }
        } catch (e) {
          console.log('⏳ OneSignal: SDK available, waiting for initialization');
          setLoading(false);
        }
      } else {
        console.warn('❌ OneSignal: SDK not loaded after 3 seconds');
        setLoading(false);
      }
    };

    checkSDKReady();
  }, [capturePlayerId]);

  // Sincronizar com o servidor quando temos usuário e player ID
  useEffect(() => {
    if (user && playerId && isInitialized) {
      console.log('OneSignal: Auto-syncing player ID with server...');
      // Delay sync to ensure database is ready
      const syncTimer = setTimeout(() => {
        syncPlayerIdWithServer(playerId);
      }, 1000);
      
      return () => clearTimeout(syncTimer);
    }
  }, [user, playerId, isInitialized, syncPlayerIdWithServer]);

  // Force sync periodically if Player ID is missing
  useEffect(() => {
    if (user && isInitialized && !playerId) {
      console.log('OneSignal: Setting up periodic Player ID capture...');
      
      const interval = setInterval(async () => {
        console.log('OneSignal: Attempting periodic Player ID capture...');
        const capturedId = await capturePlayerId();
        
        if (capturedId) {
          console.log('OneSignal: Periodic capture successful, clearing interval');
          clearInterval(interval);
        }
      }, 5000); // Every 5 seconds
      
      // Clear after 2 minutes to avoid infinite attempts
      const timeout = setTimeout(() => {
        console.log('OneSignal: Clearing periodic capture after timeout');
        clearInterval(interval);
      }, 120000);
      
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [user, isInitialized, playerId, capturePlayerId]);

  // Configurar external user ID quando o usuário faz login
  useEffect(() => {
    if (user && isInitialized) {
      console.log('OneSignal: Setting external user ID...');
      setExternalUserId(user.id);
    }
  }, [user, isInitialized, setExternalUserId]);

  return {
    isInitialized,
    playerId: playerId || pushToken,
    loading,
    initError,
    platform: platformInfo.platform,
    isNative: platformInfo.isNative,
    initializeOneSignal,
    requestPermission,
    checkSubscriptionStatus,
    syncPlayerIdWithServer,
    getPlayerId,
    capturePlayerId,
    isSubscribed,
    setExternalUserId,
    sendTag,
  };
}
import { useEffect, useState, memo } from 'react';
import { useOneSignal } from '@/hooks/useOneSignal';
import { useAuthState } from '@/hooks/useAuthState';
import { useToast } from '@/hooks/use-toast';

/**
 * OneSignalInitializer - Componente que inicializa automaticamente o OneSignal
 * 
 * Funcionalidades:
 * - Inicializa o OneSignal SDK automaticamente ao carregar
 * - Gerencia permissões de notificação
 * - Captura e sincroniza Player ID com o servidor
 * - Fornece feedback visual do status
 */
export const OneSignalInitializer = memo(function OneSignalInitializer() {
  const { isAuthenticated, user } = useAuthState();
  const { toast } = useToast();
  const {
    isInitialized,
    playerId,
    loading,
    initError,
    initializeOneSignal,
    requestPermission,
    syncPlayerIdWithServer
  } = useOneSignal();

  const [hasAttemptedInit, setHasAttemptedInit] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');

  // Etapa 1: Inicializar OneSignal quando o usuário estiver autenticado
  useEffect(() => {
    if (!isAuthenticated || hasAttemptedInit || isInitialized) {
      return;
    }

    // ✅ Verificar se está em domínio de produção
    const isProductionDomain = () => {
      const hostname = window.location.hostname;
      return hostname === 'seu-dominio.com' ||
        hostname === 'prass-trainer.lovable.app' ||
        hostname === 'www.seu-dominio.com';
    };

    if (!isProductionDomain()) {
      console.warn('[OneSignalInitializer] ⏭️ OneSignal desabilitado em ambiente de preview');
      return;
    }

    const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;

    if (!appId || appId === 'YOUR_ONESIGNAL_APP_ID_HERE') {
      console.warn('[OneSignalInitializer] VITE_ONESIGNAL_APP_ID não configurado');
      return;
    }

    console.log('[OneSignalInitializer] Inicializando OneSignal...');
    setHasAttemptedInit(true);

    initializeOneSignal({
      appId,
      allowLocalhostAsSecureOrigin: true
    }).catch((error) => {
      console.error('[OneSignalInitializer] Erro ao inicializar:', error);
    });
  }, [isAuthenticated, hasAttemptedInit, isInitialized, initializeOneSignal]);

  // Etapa 2: Solicitar permissão após inicialização
  useEffect(() => {
    if (!isInitialized || permissionStatus !== 'unknown') {
      return;
    }

    console.log('[OneSignalInitializer] OneSignal inicializado, verificando permissões...');

    // Verificar permissão atual
    if ('Notification' in window) {
      const permission = Notification.permission;
      console.log('[OneSignalInitializer] Permissão atual:', permission);

      if (permission === 'granted') {
        setPermissionStatus('granted');
      } else if (permission === 'denied') {
        setPermissionStatus('denied');
      } else {
        // Solicitar permissão automaticamente apenas se ainda não foi negada
        console.log('[OneSignalInitializer] Solicitando permissão...');
        requestPermission()
          .then((granted) => {
            setPermissionStatus(granted ? 'granted' : 'denied');
            if (granted) {
              toast({
                title: "Notificações ativadas",
                description: "Você receberá notificações push",
              });
            }
          })
          .catch((error) => {
            console.error('[OneSignalInitializer] Erro ao solicitar permissão:', error);
            setPermissionStatus('denied');
          });
      }
    }
  }, [isInitialized, permissionStatus, requestPermission, toast]);

  // Etapa 3: Sincronizar Player ID quando disponível
  useEffect(() => {
    if (!playerId || !user?.id) {
      return;
    }

    console.log('[OneSignalInitializer] Player ID capturado, sincronizando com servidor...');

    // Aguardar 1s para garantir que o banco está pronto
    const syncTimeout = setTimeout(() => {
      syncPlayerIdWithServer()
        .then(() => {
          console.log('[OneSignalInitializer] Player ID sincronizado com sucesso');
        })
        .catch((error) => {
          console.error('[OneSignalInitializer] Erro ao sincronizar Player ID:', error);
        });
    }, 1000);

    return () => clearTimeout(syncTimeout);
  }, [playerId, user?.id, syncPlayerIdWithServer]);

  // Log de status para debugging
  useEffect(() => {
    if (loading) {
      console.log('[OneSignalInitializer] Status: Carregando...');
    } else if (initError) {
      console.error('[OneSignalInitializer] Status: Erro -', initError);
    } else if (isInitialized && playerId) {
      console.log('[OneSignalInitializer] Status: Ativo - Player ID:', playerId);
    } else if (isInitialized) {
      console.log('[OneSignalInitializer] Status: Inicializado, aguardando permissão...');
    }
  }, [loading, initError, isInitialized, playerId]);

  // Este componente não renderiza nada visualmente
  return null;
});

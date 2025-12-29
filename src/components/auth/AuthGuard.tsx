import React, { useEffect, useState } from 'react'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { useUnifiedApp } from '@/contexts/UnifiedAppProvider'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useOneSignal } from '@/hooks/useOneSignal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, RefreshCw, LogOut } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    user,
    userId,
    loading,
    isAnyLoading,
    userProfile,
    authError,
    performCompleteAuthReset
  } = useUnifiedApp()
  const { isInitialized, setExternalUserId, playerId } = useOneSignal()
  const [authTimeout, setAuthTimeout] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('Conectando...')

  // Progressive loading messages
  useEffect(() => {
    const messages = [
      'Conectando ao servidor...',
      'Verificando autenticação...',
      'Carregando seus dados...',
      'Preparando ambiente...',
      'Quase pronto...'
    ]

    let index = 0
    const interval = setInterval(() => {
      index = (index + 1) % messages.length
      setLoadingMessage(messages[index])
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  // Handler para forçar logout e limpar sessão corrompida
  const handleForceLogout = () => {
    console.log('[AuthGuard] Forçando logout e limpeza de sessão')
    if (performCompleteAuthReset) {
      performCompleteAuthReset()
    }
    navigate('/auth', { replace: true })
  }

  // Handler para recarregar página
  const handleRetry = () => {
    window.location.reload()
  }

  // ✅ Lazy load OneSignal em background (não bloqueia dashboard)
  useEffect(() => {
    if (userId && userProfile) {
      const timer = setTimeout(() => {
        // Carregar OneSignal apenas DEPOIS do dashboard estar pronto
        import('@/components/OneSignalInitializer').then(() => {
          console.log('[AuthGuard] ✅ OneSignal carregado em background');
        });
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [userId, userProfile]);

  // Configurar External User ID quando OneSignal estiver pronto
  useEffect(() => {
    if (userId && isInitialized) {
      console.log('AuthGuard: Configurando External User ID:', userId)
      setExternalUserId(userId)
    }
  }, [userId, isInitialized, setExternalUserId])

  // Timeout otimizado - 10 segundos com fallback para logout
  useEffect(() => {
    if (loading.auth || isAnyLoading) {
      const timeout = setTimeout(() => {
        console.warn('[AuthGuard] ⏱️ Timeout de loading detectado após 10s')
        setAuthTimeout(true)
      }, 10000)

      return () => clearTimeout(timeout)
    } else {
      setAuthTimeout(false)
    }
  }, [loading.auth, isAnyLoading])

  // Mostrar erro de rede/sessão se detectado
  if (authError === 'network' || authError === 'token_expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl">
              {authError === 'network' ? 'Problema de Conexão' : 'Sessão Expirada'}
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {authError === 'network'
                ? 'Não foi possível conectar ao servidor de autenticação. Verifique sua conexão com a internet.'
                : 'Sua sessão expirou. Por favor, faça login novamente para continuar.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={handleRetry}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar Novamente
            </Button>
            <Button
              onClick={handleForceLogout}
              variant="default"
              className="w-full"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Fazer Novo Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Loading com timeout e mensagem progressiva
  if (loading.auth && !authTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <LoadingSpinner />
          <p className="text-muted-foreground animate-pulse">{loadingMessage}</p>
        </div>
      </div>
    )
  }

  // Timeout de loading - com opção de logout
  if (authTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="text-6xl mb-4">⏱️</div>
            <CardTitle className="text-2xl">Tempo Limite Excedido</CardTitle>
            <CardDescription className="text-base mt-2">
              A verificação de autenticação está demorando mais que o esperado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={handleRetry}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar Novamente
            </Button>
            <Button
              onClick={handleForceLogout}
              variant="destructive"
              className="w-full"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Fazer Novo Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Verificar autenticação - permitir acesso se há userId (fallback ou sessão)
  if (!user && !userId) {
    const returnTo = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/auth?returnTo=${returnTo}`} replace />
  }

  // ✅ Dashboard exclusivo do professor - não precisa de verificação de profile_complete
  // Professores vão direto para o dashboard sem passar pelo setup

  // ✅ OneSignal carrega em background, não bloqueia render
  return <>{children}</>;
}
